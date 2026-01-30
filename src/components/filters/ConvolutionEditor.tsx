import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, RotateCcw, Undo2 } from 'lucide-react';
import type { ConvolutionFilter, FirPhaseCorrectionUiSettingsV1 } from '../../types';
import type { ChannelProcessingFilter } from '../../lib/signalflow';
import { convolutionHandler } from '../../lib/filters/convolution';
import { filterRegistry } from '../../lib/filters/registry';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { COMPLEX_ONE, calculateFirComplexResponse, calculateFilterChainComplexResponse, complexAbs, complexMul, designFirPhaseCorrection, formatFrequency, generateFrequencies, groupDelaySeconds, phaseRad, unwrapPhase, type FirWindowType } from '../../lib/dsp';
import { clampOddInt, estimateFirLinearPhaseLatencyMs, findFirPeak } from '../../lib/dsp/firOperations';
import { Button, FrequencyInput, NumericInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Tooltip, TooltipContent, TooltipTrigger } from '../ui';
import { cn } from '../../lib/utils';

interface ConvolutionEditorProps {
  open: boolean;
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
  sampleRate?: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
}

interface ConvolutionEditorPanelProps {
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
  sampleRate?: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
}

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-sm',
            'text-dsp-text-muted hover:text-dsp-text transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
          )}
          aria-label={`${label} help`}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

type FrequencyValuePoint = { frequency: number; value: number };

function wrapRadToPi(rad: number): number {
  const twoPi = 2 * Math.PI;
  let wrapped = rad % twoPi;
  if (wrapped >= Math.PI) wrapped -= twoPi;
  if (wrapped < -Math.PI) wrapped += twoPi;
  return wrapped;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

interface FrequencySeries {
  id: string;
  label: string;
  colorClass: string;
  strokeDasharray?: string;
  points: FrequencyValuePoint[];
}

function FrequencyGraph({
  series,
  minFreq,
  maxFreq,
  yMin,
  yMax,
  yGridLines,
  yFormatter,
  ariaLabel,
  onHoverChange,
  className,
}: {
  series: FrequencySeries[];
  minFreq: number;
  maxFreq: number;
  yMin: number;
  yMax: number;
  yGridLines: number[];
  yFormatter: (value: number) => string;
  ariaLabel: string;
  onHoverChange?: (info: { frequency: number; values: Record<string, number> } | null) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 800, height: 480 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width || 800));
      const nextHeight = Math.max(360, Math.min(640, Math.floor(nextWidth * 0.62)));
      setSize((prev) => (prev.width === nextWidth && prev.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }));
    };

    update();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => update());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const width = size.width;
  const height = size.height;
  const padding = { left: 55, right: 10, top: 10, bottom: 25 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const freqToX = useCallback(
    (freq: number): number => {
      const safeMin = Math.max(1, minFreq);
      const safeMax = Math.max(safeMin * 1.001, maxFreq);
      const logMin = Math.log10(safeMin);
      const logMax = Math.log10(safeMax);
      const logFreq = Math.log10(Math.max(safeMin, Math.min(safeMax, freq)));
      return padding.left + ((logFreq - logMin) / (logMax - logMin)) * graphWidth;
    },
    [graphWidth, maxFreq, minFreq, padding.left],
  );

  const valueToY = useCallback(
    (value: number): number => {
      const clamped = Math.max(yMin, Math.min(yMax, value));
      return padding.top + ((yMax - clamped) / (yMax - yMin)) * graphHeight;
    },
    [graphHeight, padding.top, yMax, yMin],
  );

  const xToIndex = useCallback(
    (x: number): number => {
      const first = series[0];
      const length = first?.points.length ?? 0;
      if (length <= 1) return 0;
      const clampedX = Math.max(padding.left, Math.min(width - padding.right, x));
      const t = graphWidth > 0 ? (clampedX - padding.left) / graphWidth : 0;
      const index = Math.round(t * (length - 1));
      return Math.max(0, Math.min(length - 1, index));
    },
    [graphWidth, padding.left, padding.right, series, width],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const first = series[0];
      if (!first || first.points.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const index = xToIndex(x);
      setHoverIndex(index);

      const frequency = first.points[index]?.frequency ?? 0;
      const values: Record<string, number> = {};
      for (const s of series) {
        values[s.id] = s.points[index]?.value ?? 0;
      }
      onHoverChange?.({ frequency, values });
    },
    [onHoverChange, series, xToIndex],
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
    onHoverChange?.(null);
  }, [onHoverChange]);

  const makePath = useCallback(
    (points: FrequencyValuePoint[]): string => {
      const parts: string[] = [];
      let started = false;
      for (const point of points) {
        if (!Number.isFinite(point.value)) {
          started = false;
          continue;
        }
        const x = freqToX(point.frequency);
        const y = valueToY(point.value);
        parts.push(`${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
        started = true;
      }
      return parts.join(' ');
    },
    [freqToX, valueToY],
  );

  const freqGridLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(
    (f) => f >= minFreq && f <= maxFreq,
  );

  const hoverPoint = hoverIndex !== null ? series[0]?.points[hoverIndex] : null;
  const hoverX = hoverPoint ? freqToX(hoverPoint.frequency) : null;

  return (
    <div ref={containerRef} className={cn('w-full', className)} style={{ height: size.height }}>
      <svg
        width={width}
        height={height}
        className="block w-full h-full bg-dsp-bg rounded"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {freqGridLines.map((freq) => (
          <line
            key={`freq-${freq}`}
            x1={freqToX(freq)}
            y1={padding.top}
            x2={freqToX(freq)}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/30"
            strokeWidth={freq === 1000 ? 1 : 0.5}
          />
        ))}

        {yGridLines.map((y) => (
          <line
            key={`y-${y}`}
            x1={padding.left}
            y1={valueToY(y)}
            x2={width - padding.right}
            y2={valueToY(y)}
            stroke="currentColor"
            className={cn(y === 0 ? 'text-dsp-text/50' : 'text-dsp-primary/30')}
            strokeWidth={y === 0 ? 1 : 0.5}
          />
        ))}

        {[100, 1000, 10000].filter((f) => f >= minFreq && f <= maxFreq).map((freq) => (
          <text
            key={`label-${freq}`}
            x={freqToX(freq)}
            y={height - 5}
            textAnchor="middle"
            className="fill-dsp-text-muted text-[11px]"
          >
            {formatFrequency(freq)}
          </text>
        ))}

        {yGridLines.map((y) => (
          <text
            key={`y-label-${y}`}
            x={padding.left - 6}
            y={valueToY(y) + 3}
            textAnchor="end"
            className="fill-dsp-text-muted text-[11px]"
          >
            {yFormatter(y)}
          </text>
        ))}

        {series.map((s) => (
          <path
            key={s.id}
            d={makePath(s.points)}
            fill="none"
            stroke="currentColor"
            className={s.colorClass}
            strokeWidth={s.id === 'pipeline' ? 1.25 : 1.75}
            strokeDasharray={s.strokeDasharray}
            opacity={s.colorClass === 'text-dsp-text-muted' ? 0.7 : 1}
          />
        ))}

        {hoverX !== null && (
          <line
            x1={hoverX}
            y1={padding.top}
            x2={hoverX}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/40"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}
      </svg>
    </div>
  );
}

function FirImpulseGraph({
  taps,
  previewTaps,
  sampleRate,
  className,
}: {
  taps: number[];
  previewTaps?: number[] | null;
  sampleRate: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 800, height: 320 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width || 800));
      const nextHeight = Math.max(240, Math.min(520, Math.floor(nextWidth * 0.45)));
      setSize((prev) => (prev.width === nextWidth && prev.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }));
    };

    update();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => update());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const width = size.width;
  const height = size.height;
  const padding = { left: 55, right: 10, top: 10, bottom: 25 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const tapCount = taps.length;
  const center = Math.floor((tapCount - 1) / 2);
  const latencyMs = estimateFirLinearPhaseLatencyMs(tapCount, sampleRate);
  const peak = tapCount > 0 ? findFirPeak(taps).peak : 0;
  const scale = peak > 0 ? 1 / peak : 1;

  const indexToX = useCallback(
    (i: number): number => {
      if (tapCount <= 1) return padding.left;
      const timeMs = ((i - center) / sampleRate) * 1000;
      const t = latencyMs > 0 ? (timeMs + latencyMs) / (2 * latencyMs) : i / (tapCount - 1);
      return padding.left + t * graphWidth;
    },
    [center, graphWidth, latencyMs, padding.left, sampleRate, tapCount],
  );

  const ampToY = useCallback(
    (amp: number): number => {
      const clamped = Math.max(-1, Math.min(1, amp));
      return padding.top + ((1 - clamped) / 2) * graphHeight;
    },
    [graphHeight, padding.top],
  );

  const makePath = useCallback((values: number[]): string => {
    if (values.length === 0) return '';
    const step = Math.max(1, Math.ceil(values.length / Math.max(1, Math.floor(graphWidth))));
    let d = '';
    for (let i = 0; i < values.length; i += step) {
      const x = indexToX(i);
      const y = ampToY((values[i] ?? 0) * scale);
      d += `${d ? ' L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }, [ampToY, graphWidth, indexToX, scale]);

  const pathD = useMemo(() => {
    if (taps.length === 0) return '';
    return makePath(taps);
  }, [makePath, taps]);

  const previewPathD = useMemo(() => {
    if (!previewTaps || previewTaps.length === 0) return null;
    return makePath(previewTaps);
  }, [makePath, previewTaps]);

  const zeroY = ampToY(0);
  const centerX = tapCount > 0 ? indexToX(center) : null;

  return (
    <div ref={containerRef} className={cn('w-full', className)} style={{ height: size.height }}>
      <svg
        width={width}
        height={height}
        className="block w-full h-full bg-dsp-bg rounded"
        role="img"
        aria-label="FIR impulse response"
      >
        {centerX !== null && (
          <line
            x1={centerX}
            y1={padding.top}
            x2={centerX}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/40"
            strokeWidth={1}
          />
        )}

        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="currentColor"
          className="text-dsp-text/50"
          strokeWidth={1}
        />

        {tapCount > 0 && (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            className="text-filter-fir"
            strokeWidth={1.25}
          />
        )}

        {previewPathD && (
          <path
            d={previewPathD}
            fill="none"
            stroke="currentColor"
            className="text-dsp-accent"
            strokeWidth={1.25}
            strokeDasharray="4 2"
          />
        )}

        {tapCount > 0 && latencyMs > 0 && (
          <>
            <text x={padding.left} y={height - 5} textAnchor="start" className="fill-dsp-text-muted text-[11px]">
              -{latencyMs.toFixed(1)} ms
            </text>
            <text x={width - padding.right} y={height - 5} textAnchor="end" className="fill-dsp-text-muted text-[11px]">
              +{latencyMs.toFixed(1)} ms
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function FirStatsBar({
  tapCount,
  sampleRate,
}: {
  tapCount: number;
  sampleRate: number;
}) {
  const latencyMs = estimateFirLinearPhaseLatencyMs(tapCount, sampleRate);
  const showHighLatencyWarning = latencyMs > 50;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-2 text-sm">
      <span className="text-dsp-text-muted">
        <span className="font-mono text-dsp-text">{tapCount.toLocaleString()}</span> taps
      </span>
      <span className={cn('text-dsp-text-muted', showHighLatencyWarning && 'text-meter-yellow')}>
        Latency:{' '}
        <span className={cn('font-mono', showHighLatencyWarning ? 'text-meter-yellow' : 'text-dsp-text')}>
          {latencyMs.toFixed(2)}
        </span>{' '}
        ms
      </span>
    </div>
  );
}

function ConvolutionEditorContent({
  sampleRate,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
  onDebouncedApply,
}: {
  sampleRate: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  onDebouncedApply?: (config: ConvolutionFilter) => void;
}) {
  const { filter, updateFilter } = useFilterEditor<ConvolutionFilter>();
  const [view, setView] = useState<'magnitude' | 'phase' | 'groupDelay' | 'impulse'>('magnitude');
  const [hoverInfo, setHoverInfo] = useState<{ frequency: number; values: Record<string, number> } | null>(null);

  useEffect(() => {
    setHoverInfo(null);
  }, [view]);

  const params = filter.parameters;
  const currentTaps = params.type === 'Values' ? params.values : [1];
  const undoStackRef = useRef<number[][]>([]);
  const baselineValuesRef = useRef<number[] | null>(null);
  const lastAppliedParamsRef = useRef<ConvolutionFilter['parameters'] | null>(null);
  const pendingPersistSettingsRef = useRef<FirPhaseCorrectionUiSettingsV1 | null>(null);

  const isIdentityFir = useMemo(() => {
    return params.type === 'Values' && params.values.length === 1 && Math.abs((params.values[0] ?? 0) - 1) < 1e-12;
  }, [params]);
  const canPreviewAppliedFirResponse = params.type === 'Values';

  const isIdentityValues = useCallback((values: number[] | null | undefined) => {
    if (!values) return true;
    return values.length === 1 && Math.abs((values[0] ?? 0) - 1) < 1e-12;
  }, []);

  useEffect(() => {
    if (params.type !== 'Values') return;
    if (baselineValuesRef.current) return;
    baselineValuesRef.current = params.values.slice();
  }, [params]);

  useEffect(() => {
    if (isIdentityFir) return;
    if (params.type === 'Values') {
      lastAppliedParamsRef.current = { type: 'Values', values: params.values.slice() };
    } else if (params.type === 'Raw') {
      lastAppliedParamsRef.current = { ...params };
    } else {
      // params.type === 'Wav'
      lastAppliedParamsRef.current = { ...params };
    }
  }, [isIdentityFir, params]);

  useEffect(() => {
    if (!filterName) return;
    if (!onPersistFirPhaseCorrectionSettings) return;
    const pending = pendingPersistSettingsRef.current;
    if (!pending) return;
    onPersistFirPhaseCorrectionSettings(filterName, pending);
    pendingPersistSettingsRef.current = null;
  }, [filterName, onPersistFirPhaseCorrectionSettings]);

  const handleUndo = useCallback(() => {
    if (params.type !== 'Values') return;
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    updateFilter((prev) => ({ ...prev, parameters: { type: 'Values', values: previous } }));
  }, [params.type, updateFilter]);

  const handleResetToBaseline = useCallback(() => {
    const baseline = baselineValuesRef.current;
    if (!baseline) return;
    updateFilter((prev) => ({ ...prev, parameters: { type: 'Values', values: baseline.slice() } }));
    undoStackRef.current = [];
  }, [updateFilter]);

  const maxFreq = Math.min(20000, sampleRate / 2);
  const responseFrequencies = useMemo(() => generateFrequencies(256, 20, Math.max(20, maxFreq)), [maxFreq]);

  const candidateFilters = useMemo(() => {
    if (!channelFilters || channelFilters.length === 0) return [] as ChannelProcessingFilter[];
    if (!filterName) return channelFilters;
    const idx = channelFilters.findIndex((f) => f.name === filterName);
    return idx >= 0 ? channelFilters.slice(0, idx) : channelFilters;
  }, [channelFilters, filterName]);

  const correctableUi = useMemo(() => {
    return candidateFilters
      .filter((f) => f.config.type === 'Biquad' || f.config.type === 'DiffEq')
      .map((f) => {
        const handler = filterRegistry.get(f.config.type);
        return {
          ...f,
          displayName: handler?.getDisplayName(f.config as never) ?? f.config.type,
          summary: handler?.getSummary(f.config as never) ?? '',
        };
      });
  }, [candidateFilters]);

  const correctableKey = useMemo(() => correctableUi.map((f) => f.name).join('\u0000'), [correctableUi]);
  const availableFilterNamesRef = useRef<Set<string>>(new Set(correctableUi.map((f) => f.name)));
  const [selectedFilterNames, setSelectedFilterNames] = useState<Set<string>>(() => {
    const available = new Set(correctableUi.map((f) => f.name));
    const saved = firPhaseCorrectionSettings?.selectedFilterNames;
    if (saved !== undefined) {
      const next = new Set<string>();
      for (const name of saved) {
        if (available.has(name)) next.add(name);
      }
      return next;
    }
    return available;
  });

  useEffect(() => {
    const available = new Set(correctableUi.map((f) => f.name));
    const previouslyAvailable = availableFilterNamesRef.current;
    setSelectedFilterNames((prev) => {
      const next = new Set<string>();
      for (const name of prev) {
        if (available.has(name)) next.add(name);
      }
      for (const name of available) {
        if (!previouslyAvailable.has(name)) next.add(name);
      }
      return next;
    });
    availableFilterNamesRef.current = available;
  }, [correctableKey, correctableUi]);

  const selectedFilterConfigs = useMemo(() => {
    return correctableUi.filter((f) => selectedFilterNames.has(f.name)).map((f) => f.config);
  }, [correctableUi, selectedFilterNames]);

  const pipelineFilterConfigs = useMemo(() => {
    return candidateFilters.map((f) => f.config);
  }, [candidateFilters]);

  const [previewEnabled, setPreviewEnabled] = useState(() => firPhaseCorrectionSettings?.previewEnabled ?? true);
  const [tapMode, setTapMode] = useState<'latency' | 'taps'>(() => firPhaseCorrectionSettings?.tapMode ?? 'latency');

  const [settings, setSettings] = useState(() => ({
    maxLatencyMs: firPhaseCorrectionSettings?.maxLatencyMs ?? 50,
    taps: firPhaseCorrectionSettings?.taps ?? 2049,
    bandLowHz: firPhaseCorrectionSettings?.bandLowHz ?? 20,
    bandHighHz: firPhaseCorrectionSettings?.bandHighHz ?? 20000,
    transitionOctaves: firPhaseCorrectionSettings?.transitionOctaves ?? 0.25,
    magnitudeThresholdDb: firPhaseCorrectionSettings?.magnitudeThresholdDb ?? -30,
    magnitudeTransitionDb: firPhaseCorrectionSettings?.magnitudeTransitionDb ?? 12,
    phaseHideBelowDb: firPhaseCorrectionSettings?.phaseHideBelowDb ?? -80,
    window: (firPhaseCorrectionSettings?.window ?? 'Hann') as FirWindowType,
    kaiserBeta: firPhaseCorrectionSettings?.kaiserBeta ?? 8.6,
    normalize: firPhaseCorrectionSettings?.normalize ?? true,
  }));

  const effectiveTaps = useMemo(() => {
    if (tapMode === 'taps') return clampOddInt(settings.taps, { min: 1, max: 262143 });
    const maxDelaySamples = Math.floor((Math.max(0, settings.maxLatencyMs) / 1000) * sampleRate);
    return clampOddInt(maxDelaySamples * 2 + 1, { min: 1, max: 262143 });
  }, [sampleRate, settings.maxLatencyMs, settings.taps, tapMode]);

  const targetDelaySamples = Math.floor((effectiveTaps - 1) / 2);
  const targetLatencyMs = (targetDelaySamples / sampleRate) * 1000;

  const previewDesign = useMemo((): { taps: number[] | null; error: string | null; warnings: string[] } => {
    if (!previewEnabled) return { taps: null, error: null, warnings: [] };
    try {
      const result = designFirPhaseCorrection({
        sampleRate,
        taps: effectiveTaps,
        window: settings.window,
        kaiserBeta: settings.window === 'Kaiser' ? settings.kaiserBeta : undefined,
        normalize: settings.normalize,
        band: { lowHz: settings.bandLowHz, highHz: settings.bandHighHz, transitionOctaves: settings.transitionOctaves },
        magnitudeGate: { thresholdDb: settings.magnitudeThresholdDb, transitionDb: settings.magnitudeTransitionDb },
        filters: selectedFilterConfigs,
      });
      return { taps: result.taps, error: null, warnings: result.warnings };
    } catch (error) {
      return { taps: null, error: error instanceof Error ? error.message : 'Failed to design FIR', warnings: [] };
    }
  }, [effectiveTaps, previewEnabled, sampleRate, selectedFilterConfigs, settings]);

  const canEnableFromIdentity = useMemo(() => {
    const last = lastAppliedParamsRef.current;
    if (last) {
      if (last.type === 'Values') return !isIdentityValues(last.values);
      return true;
    }
    return !isIdentityValues(previewDesign.taps);
  }, [isIdentityValues, previewDesign.taps]);

  const pipelineComplex = useMemo(() => {
    return responseFrequencies.map((f) => calculateFilterChainComplexResponse(pipelineFilterConfigs, f, sampleRate));
  }, [pipelineFilterConfigs, responseFrequencies, sampleRate]);

  const currentFirComplex = useMemo(() => {
    const pts = calculateFirComplexResponse(currentTaps, sampleRate, responseFrequencies);
    return pts.map((p) => ({ re: p.re, im: p.im }));
  }, [currentTaps, responseFrequencies, sampleRate]);

  const combinedCurrent = useMemo(() => {
    return pipelineComplex.map((pipe, i) => complexMul(pipe, currentFirComplex[i] ?? COMPLEX_ONE));
  }, [currentFirComplex, pipelineComplex]);

  const previewFirComplex = useMemo(() => {
    if (!previewEnabled || !previewDesign.taps) return null;
    const pts = calculateFirComplexResponse(previewDesign.taps, sampleRate, responseFrequencies);
    return pts.map((p) => ({ re: p.re, im: p.im }));
  }, [previewDesign.taps, previewEnabled, responseFrequencies, sampleRate]);

  const firMagnitudeStats = useMemo(() => {
    const toDb = (c: { re: number; im: number }) => 20 * Math.log10(Math.max(1e-12, complexAbs(c)));

    const calc = (points: Array<{ re: number; im: number }> | null) => {
      if (!points || points.length === 0) return null;
      let min = Infinity;
      let max = -Infinity;
      for (const c of points) {
        const v = toDb(c);
        if (!Number.isFinite(v)) continue;
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      return { minDb: min, maxDb: max, peakAbsDb: Math.max(Math.abs(min), Math.abs(max)) };
    };

    return {
      current: calc(currentFirComplex),
      preview: calc(previewFirComplex),
    };
  }, [currentFirComplex, previewFirComplex]);

  const combinedPreview = useMemo(() => {
    if (!previewFirComplex) return null;
    return pipelineComplex.map((pipe, i) => complexMul(pipe, previewFirComplex[i] ?? COMPLEX_ONE));
  }, [pipelineComplex, previewFirComplex]);

  const magnitudeSeries = useMemo((): FrequencySeries[] => {
    const toDb = (c: { re: number; im: number }) => 20 * Math.log10(Math.max(1e-12, complexAbs(c)));

    const series: FrequencySeries[] = [
      {
        id: 'upstream',
        label: 'Upstream (before FIR)',
        colorClass: 'text-dsp-text-muted',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(pipelineComplex[i] ?? COMPLEX_ONE) })),
      },
      {
        id: 'applied',
        label: 'Predicted result (applied)',
        colorClass: 'text-filter-fir',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(combinedCurrent[i] ?? COMPLEX_ONE) })),
      },
    ];

    if (canPreviewAppliedFirResponse) {
      series.push({
        id: 'corrApplied',
        label: 'Correction (applied)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '6 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(currentFirComplex[i] ?? COMPLEX_ONE) })),
      });
    }

    if (combinedPreview) {
      series.push({
        id: 'preview',
        label: 'Predicted result (preview)',
        colorClass: 'text-dsp-accent',
        strokeDasharray: '4 2',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(combinedPreview[i] ?? COMPLEX_ONE) })),
      });
    }

    if (previewFirComplex) {
      series.push({
        id: 'corrPreview',
        label: 'Correction (preview)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(previewFirComplex[i] ?? COMPLEX_ONE) })),
      });
    }

    return series;
  }, [canPreviewAppliedFirResponse, combinedCurrent, combinedPreview, currentFirComplex, pipelineComplex, previewFirComplex, responseFrequencies]);

  const magnitudePlot = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of magnitudeSeries) {
      for (const p of s.points) {
        if (!Number.isFinite(p.value)) continue;
        min = Math.min(min, p.value);
        max = Math.max(max, p.value);
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { yMin: -24, yMax: 24, yGridLines: [-24, -12, 0, 12, 24] };
    }

    const maxAbs = Math.max(Math.abs(min), Math.abs(max));
    const rounded = Math.max(24, Math.min(60, Math.ceil(maxAbs / 6) * 6));
    const step = rounded / 4;
    return { yMin: -rounded, yMax: rounded, yGridLines: [-rounded, -step * 2, 0, step * 2, rounded] };
  }, [magnitudeSeries]);

  const pipelineDelaySamples = useMemo(() => {
    let total = 0;
    for (const filterConfig of pipelineFilterConfigs) {
      if (filterConfig.type !== 'Delay') continue;
      const { delay, unit, subsample } = filterConfig.parameters;
      let delaySamples: number;
      if (unit === 'samples') delaySamples = delay;
      else if (unit === 'ms') delaySamples = (delay / 1000) * sampleRate;
      else delaySamples = (delay / 343000) * sampleRate;
      total += subsample ? delaySamples : Math.round(delaySamples);
    }
    return total;
  }, [pipelineFilterConfigs, sampleRate]);

  const currentFirDelaySamples = Math.floor((currentTaps.length - 1) / 2);

  const phaseSeries = useMemo((): FrequencySeries[] => {
    const toDb = (c: { re: number; im: number }) => 20 * Math.log10(Math.max(1e-12, complexAbs(c)));
    const hideBelowDb = settings.phaseHideBelowDb;

    const wAt = (freqHz: number) => (2 * Math.PI * freqHz) / sampleRate;

    const build = (complex: Array<{ re: number; im: number }>, refDelaySamples: number, label: string, id: string, colorClass: string, strokeDasharray?: string) => {
      const phases = unwrapPhase(complex.map((c) => phaseRad(c)));
      return {
        id,
        label,
        colorClass,
        strokeDasharray,
        points: responseFrequencies.map((f, i) => {
          const c = complex[i] ?? COMPLEX_ONE;
          if (toDb(c) < hideBelowDb) return { frequency: f, value: NaN };
          return { frequency: f, value: radToDeg(wrapRadToPi((phases[i] ?? 0) + wAt(f) * refDelaySamples)) };
        }),
      } satisfies FrequencySeries;
    };

    const series: FrequencySeries[] = [
      build(pipelineComplex, pipelineDelaySamples, 'Upstream (before FIR)', 'upstream', 'text-dsp-text-muted', '2 3'),
      build(combinedCurrent, pipelineDelaySamples + currentFirDelaySamples, 'Predicted result (applied)', 'applied', 'text-filter-fir'),
    ];

    if (canPreviewAppliedFirResponse) {
      series.push(build(currentFirComplex, currentFirDelaySamples, 'Correction (applied)', 'corrApplied', 'text-dsp-primary/70', '6 3'));
    }

    if (combinedPreview) {
      series.push(build(combinedPreview, pipelineDelaySamples + targetDelaySamples, 'Predicted result (preview)', 'preview', 'text-dsp-accent', '4 2'));
    }

    if (previewFirComplex) {
      series.push(build(previewFirComplex, targetDelaySamples, 'Correction (preview)', 'corrPreview', 'text-dsp-primary/70', '2 3'));
    }

    return series;
  }, [
    canPreviewAppliedFirResponse,
    combinedCurrent,
    combinedPreview,
    currentFirComplex,
    currentFirDelaySamples,
    pipelineComplex,
    pipelineDelaySamples,
    previewFirComplex,
    responseFrequencies,
    sampleRate,
    settings.phaseHideBelowDb,
    targetDelaySamples,
  ]);

  const groupDelayPlot = useMemo(() => {
    const buildDelayMs = (complex: Array<{ re: number; im: number }>) => {
      const ph = unwrapPhase(complex.map((c) => phaseRad(c)));
      return groupDelaySeconds(ph, responseFrequencies).map((t) => t * 1000);
    };

    const hasPreview = Boolean(combinedPreview) || Boolean(previewFirComplex);
    const targetDelaySamplesForLine = pipelineDelaySamples + (hasPreview ? targetDelaySamples : currentFirDelaySamples);

    const targetDelayMs = (targetDelaySamplesForLine / sampleRate) * 1000;
    const yMax = Math.max(5, Math.min(1000, targetDelayMs * 2 + 10));
    const step = yMax / 4;
    const yGridLines = [0, step, step * 2, step * 3, step * 4];

    const upstreamDelayMs = buildDelayMs(pipelineComplex);
    const appliedDelayMs = buildDelayMs(combinedCurrent);
    const previewDelayMs = combinedPreview ? buildDelayMs(combinedPreview) : null;
    const corrAppliedDelayMs = buildDelayMs(currentFirComplex);
    const corrPreviewDelayMs = previewFirComplex ? buildDelayMs(previewFirComplex) : null;

    const series: FrequencySeries[] = [
      {
        id: 'target',
        label: 'Target',
        colorClass: 'text-dsp-primary/60',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f) => ({ frequency: f, value: targetDelayMs })),
      },
      {
        id: 'upstream',
        label: 'Upstream (before FIR)',
        colorClass: 'text-dsp-text-muted',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: upstreamDelayMs[i] ?? 0 })),
      },
      {
        id: 'applied',
        label: 'Predicted result (applied)',
        colorClass: 'text-filter-fir',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: appliedDelayMs[i] ?? 0 })),
      },
    ];

    if (canPreviewAppliedFirResponse) {
      series.push({
        id: 'corrApplied',
        label: 'Correction (applied)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '6 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: corrAppliedDelayMs[i] ?? 0 })),
      });
    }

    if (previewDelayMs) {
      series.push({
        id: 'preview',
        label: 'Predicted result (preview)',
        colorClass: 'text-dsp-accent',
        strokeDasharray: '4 2',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: previewDelayMs[i] ?? 0 })),
      });
    }

    if (corrPreviewDelayMs) {
      series.push({
        id: 'corrPreview',
        label: 'Correction (preview)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: corrPreviewDelayMs[i] ?? 0 })),
      });
    }

    return { series, yMin: 0, yMax, yGridLines, targetDelayMs };
  }, [
    canPreviewAppliedFirResponse,
    combinedCurrent,
    combinedPreview,
    currentFirComplex,
    currentFirDelaySamples,
    pipelineComplex,
    pipelineDelaySamples,
    previewFirComplex,
    responseFrequencies,
    sampleRate,
    targetDelaySamples,
  ]);

  const activeSeries = useMemo(() => {
    switch (view) {
      case 'magnitude':
        return magnitudeSeries;
      case 'phase':
        return phaseSeries;
      case 'groupDelay':
        return groupDelayPlot.series;
      default:
        return [] as FrequencySeries[];
    }
  }, [groupDelayPlot.series, magnitudeSeries, phaseSeries, view]);

  const formatHoverValue = useCallback(
    (value: number): string => {
      if (!Number.isFinite(value)) return '—';
      if (view === 'magnitude') return `${value.toFixed(2)} dB`;
      if (view === 'phase') return `${value.toFixed(1)}°`;
      if (view === 'groupDelay') return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
      return String(value);
    },
    [view],
  );

  const settingsToPersist = useMemo<FirPhaseCorrectionUiSettingsV1>(
    () => ({
      version: 1,
      previewEnabled,
      tapMode,
      maxLatencyMs: settings.maxLatencyMs,
      taps: settings.taps,
      bandLowHz: settings.bandLowHz,
      bandHighHz: settings.bandHighHz,
      transitionOctaves: settings.transitionOctaves,
      magnitudeThresholdDb: settings.magnitudeThresholdDb,
      magnitudeTransitionDb: settings.magnitudeTransitionDb,
      phaseHideBelowDb: settings.phaseHideBelowDb,
      window: settings.window,
      kaiserBeta: settings.kaiserBeta,
      normalize: settings.normalize,
      selectedFilterNames: correctableUi.filter((f) => selectedFilterNames.has(f.name)).map((f) => f.name),
    }),
    [
      correctableUi,
      previewEnabled,
      selectedFilterNames,
      settings.bandHighHz,
      settings.bandLowHz,
      settings.kaiserBeta,
      settings.magnitudeThresholdDb,
      settings.magnitudeTransitionDb,
      settings.maxLatencyMs,
      settings.normalize,
      settings.phaseHideBelowDb,
      settings.taps,
      settings.transitionOctaves,
      settings.window,
      tapMode,
    ],
  );

  const handleApplyFir = useCallback(() => {
    if (!previewDesign.taps) return;
    const previousValues = params.type === 'Values' ? params.values.slice() : null;
    const nextConfig: ConvolutionFilter = { ...filter, parameters: { type: 'Values', values: previewDesign.taps! } };
    updateFilter(() => nextConfig);
    onDebouncedApply?.(nextConfig);
    if (previousValues) undoStackRef.current.push(previousValues);

    if (onPersistFirPhaseCorrectionSettings) {
      if (filterName) {
        onPersistFirPhaseCorrectionSettings(filterName, settingsToPersist);
      } else {
        pendingPersistSettingsRef.current = settingsToPersist;
      }
    }
  }, [
    filter,
    filterName,
    onDebouncedApply,
    onPersistFirPhaseCorrectionSettings,
    params,
    previewDesign.taps,
    settingsToPersist,
    updateFilter,
  ]);

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        if (!isIdentityFir) {
          lastAppliedParamsRef.current =
            params.type === 'Values' ? ({ type: 'Values', values: params.values.slice() } as const) : { ...params };
        }
        const nextConfig: ConvolutionFilter = { ...filter, parameters: { type: 'Values', values: [1] } };
        updateFilter(() => nextConfig);
        onDebouncedApply?.(nextConfig);
        if (params.type === 'Values') undoStackRef.current.push(params.values.slice());
        return;
      }

      const restoredFromPreview = !lastAppliedParamsRef.current && Boolean(previewDesign.taps);
      const restore = lastAppliedParamsRef.current ?? (previewDesign.taps ? ({ type: 'Values', values: previewDesign.taps.slice() } as const) : null);
      if (!restore) return;
      if (restore.type === 'Values' && isIdentityValues(restore.values)) return;
      const nextConfig: ConvolutionFilter = {
        ...filter,
        parameters: restore.type === 'Values' ? { type: 'Values', values: restore.values.slice() } : { ...restore },
      };
      updateFilter(() => nextConfig);
      onDebouncedApply?.(nextConfig);
      if (params.type === 'Values') undoStackRef.current.push(params.values.slice());

      // If we brought the FIR back using the preview taps, persist the current design settings too.
      if (restoredFromPreview && onPersistFirPhaseCorrectionSettings) {
        if (filterName) onPersistFirPhaseCorrectionSettings(filterName, settingsToPersist);
        else pendingPersistSettingsRef.current = settingsToPersist;
      }
    },
    [
      filter,
      filterName,
      isIdentityFir,
      isIdentityValues,
      onDebouncedApply,
      onPersistFirPhaseCorrectionSettings,
      params,
      previewDesign.taps,
      settingsToPersist,
      updateFilter,
    ],
  );

  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_24rem] gap-4 p-4">
      <div className="min-w-0 min-h-0 space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2 text-sm text-dsp-text">
          <span className="font-medium">FIR Phase Correction</span>
          <FieldHelp label="FIR Phase Correction">
            <div className="space-y-2 text-xs">
              <p>
                Auto-generates a linear-phase FIR that removes the <span className="font-semibold">excess phase</span> of the selected upstream filters without changing their magnitude response.
              </p>
              <div className="space-y-1">
                <p className="font-semibold">How it works</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Compute the complex response of the selected filters: H(f).</li>
                  <li>
                    Build a unit-magnitude phase inverse and add a pure delay: C(f) ≈ e^(-j·2πfD/Fs) · conj(H(f)) / |H(f)|.
                  </li>
                  <li>Band-limit and magnitude-gate the correction, then IFFT → taps, window, and normalize.</li>
                </ul>
              </div>
              <p>
                FIR latency (D): <span className="font-mono">{targetLatencyMs.toFixed(2)} ms</span>{' '}
                <span className="text-dsp-text-muted">(plus any upstream Delay filters)</span>
              </p>
            </div>
          </FieldHelp>
          <div className="ml-auto flex gap-1 rounded-md bg-dsp-surface/50 p-1" role="tablist" aria-label="FIR graph view">
            {[
              { id: 'magnitude' as const, label: 'Mag' },
              { id: 'phase' as const, label: 'Phase' },
              { id: 'groupDelay' as const, label: 'Delay' },
              { id: 'impulse' as const, label: 'Impulse' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                className={cn(
                  'px-2.5 py-1 rounded-sm text-xs font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                  view === tab.id
                    ? 'bg-dsp-bg text-dsp-text'
                    : 'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/20',
                )}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span
            className={cn(
              'ml-2 inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium',
              isIdentityFir ? 'border-dsp-primary/30 text-dsp-text-muted' : 'border-filter-fir/40 bg-filter-fir/10 text-filter-fir',
            )}
            title={
              isIdentityFir
                ? 'FIR is currently identity (not applied).'
                : params.type === 'Values'
                  ? `FIR is applied (${currentTaps.length.toLocaleString()} taps).`
                  : 'FIR is applied (file-based impulse).'
            }
          >
            {isIdentityFir ? 'Not applied' : params.type === 'Values' ? `Applied (${currentTaps.length.toLocaleString()})` : 'Applied (file)'}
          </span>
          {params.type === 'Values' && (
            <div className="ml-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={undoStackRef.current.length === 0}
                aria-label="Undo last FIR edit"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToBaseline}
                disabled={!baselineValuesRef.current}
                aria-label="Reset FIR to baseline"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        {view === 'magnitude' && (
          <FrequencyGraph
            series={magnitudeSeries}
            minFreq={20}
            maxFreq={maxFreq}
            yMin={magnitudePlot.yMin}
            yMax={magnitudePlot.yMax}
            yGridLines={magnitudePlot.yGridLines}
            yFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
            ariaLabel="Magnitude response"
            onHoverChange={setHoverInfo}
          />
        )}

        {view === 'phase' && (
          <FrequencyGraph
            series={phaseSeries}
            minFreq={20}
            maxFreq={maxFreq}
            yMin={-180}
            yMax={180}
            yGridLines={[-180, -90, 0, 90, 180]}
            yFormatter={(v) => `${v.toFixed(0)}°`}
            ariaLabel="Phase response (excess phase)"
            onHoverChange={setHoverInfo}
          />
        )}

        {view === 'groupDelay' && (
          <FrequencyGraph
            series={groupDelayPlot.series}
            minFreq={20}
            maxFreq={maxFreq}
            yMin={groupDelayPlot.yMin}
            yMax={groupDelayPlot.yMax}
            yGridLines={groupDelayPlot.yGridLines}
            yFormatter={(v) => `${v.toFixed(v < 10 ? 2 : 1)} ms`}
            ariaLabel="Group delay response"
            onHoverChange={setHoverInfo}
          />
        )}

        {view === 'impulse' && (
          <FirImpulseGraph taps={currentTaps} previewTaps={previewEnabled ? previewDesign.taps : null} sampleRate={sampleRate} />
        )}

        {view !== 'impulse' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2">
            <div className="text-xs text-dsp-text-muted">
              {hoverInfo ? `@ ${formatFrequency(hoverInfo.frequency)}` : 'Hover for values'}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {activeSeries.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 text-xs text-dsp-text-muted">
                  <svg width={18} height={6} className={s.colorClass} aria-hidden="true">
                    <line
                      x1={0}
                      y1={3}
                      x2={18}
                      y2={3}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeDasharray={s.strokeDasharray}
                      opacity={s.colorClass === 'text-dsp-text-muted' ? 0.7 : 1}
                    />
                  </svg>
                  <span className="text-dsp-text">{s.label}</span>
                  {hoverInfo && <span className="font-mono text-dsp-text">{formatHoverValue(hoverInfo.values[s.id] ?? NaN)}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-dsp-primary/20">
          <FirStatsBar tapCount={currentTaps.length} sampleRate={sampleRate} />
        </div>
      </div>

      <div className="min-w-0 min-h-0 h-full overflow-y-auto">
        <div className="rounded-lg border border-dsp-primary/20 bg-dsp-bg/30 p-4 space-y-4">
          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-dsp-text">Design Settings</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-dsp-text-muted">Preview</span>
                <Switch checked={previewEnabled} onCheckedChange={(checked) => setPreviewEnabled(Boolean(checked))} aria-label="Show preview" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-dsp-text">FIR Enabled</p>
                <p className="text-[11px] text-dsp-text-muted">Toggle between applied taps and identity.</p>
              </div>
              <div
                title={
                  !isIdentityFir || canEnableFromIdentity
                    ? undefined
                    : 'No FIR to enable (select filters to linearize and ensure Preview is producing a non-identity FIR).'
                }
              >
                <Switch
                  checked={!isIdentityFir}
                  onCheckedChange={(checked) => handleToggleEnabled(Boolean(checked))}
                  aria-label="Enable FIR"
                  disabled={isIdentityFir && !canEnableFromIdentity}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Mode</label>
                <Select value={tapMode} onValueChange={(v) => setTapMode(v as 'latency' | 'taps')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latency">Max Latency</SelectItem>
                    <SelectItem value="taps">Tap Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tapMode === 'latency' ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-dsp-text-muted">Max Latency (ms)</label>
                  <NumericInput
                    value={settings.maxLatencyMs}
                    onChange={(v) => setSettings((s) => ({ ...s, maxLatencyMs: v }))}
                    min={0}
                    max={500}
                    step={1}
                    precision={0}
                  />
                  <p className="text-[11px] text-dsp-text-muted">
                    Taps: <span className="font-mono">{effectiveTaps.toLocaleString()}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs text-dsp-text-muted">Taps</label>
                  <NumericInput
                    value={clampOddInt(settings.taps)}
                    onChange={(v) => setSettings((s) => ({ ...s, taps: clampOddInt(v) }))}
                    min={1}
                    max={262143}
                    step={2}
                    precision={0}
                  />
                  <p className="text-[11px] text-dsp-text-muted">
                    Target delay: <span className="font-mono">{targetLatencyMs.toFixed(2)} ms</span>
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Band Low (Hz)</label>
                <FrequencyInput value={settings.bandLowHz} onChange={(v) => setSettings((s) => ({ ...s, bandLowHz: v }))} min={1} max={sampleRate / 2} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Band High (Hz)</label>
                <FrequencyInput value={settings.bandHighHz} onChange={(v) => setSettings((s) => ({ ...s, bandHighHz: v }))} min={1} max={sampleRate / 2} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Band Transition (oct)</label>
                <NumericInput
                  value={settings.transitionOctaves}
                  onChange={(v) => setSettings((s) => ({ ...s, transitionOctaves: v }))}
                  min={0}
                  max={4}
                  step={0.05}
                  precision={2}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Magnitude Gate (dB)</label>
                <NumericInput
                  value={settings.magnitudeThresholdDb}
                  onChange={(v) => setSettings((s) => ({ ...s, magnitudeThresholdDb: v }))}
                  min={-200}
                  max={0}
                  step={1}
                  precision={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Gate Transition (dB)</label>
                <NumericInput
                  value={settings.magnitudeTransitionDb}
                  onChange={(v) => setSettings((s) => ({ ...s, magnitudeTransitionDb: v }))}
                  min={0}
                  max={60}
                  step={1}
                  precision={0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Hide Phase Below (dB)</label>
                <NumericInput
                  value={settings.phaseHideBelowDb}
                  onChange={(v) => setSettings((s) => ({ ...s, phaseHideBelowDb: v }))}
                  min={-300}
                  max={0}
                  step={1}
                  precision={0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Window</label>
                <Select
                  value={settings.window}
                  onValueChange={(v) => setSettings((s) => ({ ...s, window: v as FirWindowType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rectangular">Rectangular</SelectItem>
                    <SelectItem value="Hann">Hann</SelectItem>
                    <SelectItem value="Hamming">Hamming</SelectItem>
                    <SelectItem value="Blackman">Blackman</SelectItem>
                    <SelectItem value="Kaiser">Kaiser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {settings.window === 'Kaiser' ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-dsp-text-muted">Kaiser β</label>
                  <NumericInput
                    value={settings.kaiserBeta}
                    onChange={(v) => setSettings((s) => ({ ...s, kaiserBeta: v }))}
                    min={0}
                    max={20}
                    step={0.1}
                    precision={1}
                  />
                </div>
              ) : (
                <div />
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-dsp-text-muted">Normalize</label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={settings.normalize} onCheckedChange={(checked) => setSettings((s) => ({ ...s, normalize: Boolean(checked) }))} />
                  <span className="text-xs text-dsp-text-muted">DC gain to 0 dB</span>
                </div>
              </div>
            </div>

            {previewDesign.error && (
              <div className="flex items-center gap-2 rounded-md border border-meter-red/30 bg-meter-red/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-meter-red" aria-hidden="true" />
                <p className="text-xs text-meter-red">{previewDesign.error}</p>
              </div>
            )}

            {previewDesign.warnings.length > 0 && (
              <div className="rounded-md border border-meter-yellow/30 bg-meter-yellow/10 px-3 py-2 text-xs text-meter-yellow">
                {previewDesign.warnings.join(' ')}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleApplyFir} disabled={!previewDesign.taps}>
                Apply FIR
              </Button>
              {previewDesign.taps && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-status-online">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Ready ({previewDesign.taps.length.toLocaleString()} taps)
                  </div>
                  {firMagnitudeStats.preview && (
                    <span
                      className={cn(
                        'text-[11px]',
                        firMagnitudeStats.preview.peakAbsDb > 12
                          ? 'text-meter-red'
                          : firMagnitudeStats.preview.peakAbsDb > 6
                            ? 'text-meter-yellow'
                            : 'text-dsp-text-muted',
                      )}
                      title="Peak FIR magnitude deviation from 0 dB across the preview frequencies. Large values indicate the phase-only approximation is struggling; try more taps/latency, narrower band, higher magnitude gate, or a different window."
                    >
                      FIR mag: +/-{firMagnitudeStats.preview.peakAbsDb.toFixed(1)} dB
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-dsp-text">Filters to Linearize</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFilterNames(new Set(correctableUi.map((f) => f.name)))}>
                  All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFilterNames(new Set())}>
                  None
                </Button>
              </div>
            </div>

            {correctableUi.length === 0 ? (
              <p className="text-xs text-dsp-text-muted">No upstream Biquad/DiffEq filters found.</p>
            ) : (
              <div className="space-y-1.5">
                {correctableUi.map((f) => (
                  <label key={f.name} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedFilterNames.has(f.name)}
                      onChange={(e) => {
                        setSelectedFilterNames((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(f.name);
                          else next.delete(f.name);
                          return next;
                        });
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-dsp-text">{f.displayName}</span>
                      {f.summary && <span className="block truncate text-xs text-dsp-text-muted">{f.summary}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2 text-xs text-dsp-text-muted">
            Microphone-based (measurement) correction is planned and will appear here as an additional source option.
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConvolutionEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
}: ConvolutionEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="FIR Phase Correction"
      description="Auto-generate an FIR to linearize filter phase"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
      contentClassName="max-w-5xl"
      bodyScrollable={false}
      bodyClassName="py-0"
    >
      <ConvolutionEditorContent
        sampleRate={sampleRate}
        channelFilters={channelFilters}
        filterName={filterName}
        firPhaseCorrectionSettings={firPhaseCorrectionSettings}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        onDebouncedApply={onApply}
      />
    </FilterEditorModal>
  );
}

export function ConvolutionEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
}: ConvolutionEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Auto-generate an FIR to linearize filter phase"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
      bodyScrollable={false}
      bodyClassName="py-0"
    >
      <ConvolutionEditorContent
        sampleRate={sampleRate}
        channelFilters={channelFilters}
        filterName={filterName}
        firPhaseCorrectionSettings={firPhaseCorrectionSettings}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        onDebouncedApply={onApply}
      />
    </FilterEditorPanel>
  );
}
