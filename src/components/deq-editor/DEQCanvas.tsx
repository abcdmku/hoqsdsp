import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { calculateCompositeResponse, formatFrequency, formatGain } from '../../lib/dsp';
import type { BiquadParameters } from '../../types';
import {
  type CanvasDimensions,
  FREQUENCY_MARKERS,
  GAIN_MARKERS,
  MIN_GAIN,
  MAX_GAIN,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandColor,
  hasGain,
} from '../eq-editor/types';
import { EQNode } from '../eq-editor/EQNode';
import type { DeqBand } from './types';

export interface DeqCanvasProps {
  bands: DeqBand[];
  sampleRate: number;
  selectedBandIndex: number | null;
  onSelectBand: (index: number | null) => void;
  onBandChange: (index: number, updates: Partial<BiquadParameters>) => void;
  onBackgroundClick?: (freq: number, gain: number) => void;
  onBackgroundPointerDown?: (freq: number, gain: number) => void;
  onBackgroundPointerMove?: (freq: number, gain: number) => void;
  onBackgroundPointerUp?: () => void;
  dimensions: CanvasDimensions;
  readOnly?: boolean;
  className?: string;
}

interface CurvePoints {
  x: number;
  y: number;
  frequency: number;
  gain: number;
}

interface GuideCurve {
  levelDbfs: number;
  opacity: number;
  strokeWidth: number;
  path: string;
}

const MIN_THRESHOLD_DB = -80;
const MAX_THRESHOLD_DB = 0;
const MIN_RATIO = 1;
const MAX_RATIO = 20;

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildLinePath(points: CurvePoints[]): string {
  if (points.length === 0) return '';
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
}

function getRatioStrength(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 1.001) return 0;
  return 1 - 1 / ratio;
}

function getMaxDeltaAtDbfs(dynamics: DeqBand['dynamics'], levelDbfs: number): number {
  const thresholdDb = clampNumber(
    Number.isFinite(dynamics.thresholdDb) ? dynamics.thresholdDb : -24,
    MIN_THRESHOLD_DB,
    MAX_THRESHOLD_DB,
  );
  const ratio = clampNumber(
    Number.isFinite(dynamics.ratio) ? dynamics.ratio : MIN_RATIO,
    MIN_RATIO,
    MAX_RATIO,
  );
  const rangeDb = Math.abs(Number.isFinite(dynamics.rangeDb) ? dynamics.rangeDb : 0);

  const strength = getRatioStrength(ratio);
  if (strength <= 0.0001) return 0;
  if (rangeDb <= 0.0001) return 0;

  // Simple visualization model:
  // delta(dB) grows linearly with "over-threshold" level scaled by ratio strength,
  // then clamps to the configured range.
  const delta = (levelDbfs - thresholdDb) * strength;
  return clampNumber(delta, 0, rangeDb);
}

function applyDynamicsDelta(
  params: BiquadParameters,
  dynamics: DeqBand['dynamics'],
  deltaDb: number,
): BiquadParameters {
  if (!dynamics.enabled) return params;
  if (!hasGain(params.type)) return params;
  if (!('gain' in params)) return params;
  if (!Number.isFinite(deltaDb) || Math.abs(deltaDb) <= 0.0001) return params;

  const signedDelta = dynamics.mode === 'upward' ? deltaDb : -deltaDb;
  return { ...params, gain: params.gain + signedDelta };
}

function buildAreaToBaseline(points: CurvePoints[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `M ${first.x},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${last.x},${baselineY} Z`;
}

function buildAreaBetween(a: CurvePoints[], b: CurvePoints[]): string {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return '';
  const forward = a.map((p) => `${p.x},${p.y}`).join(' L ');
  const back = [...b].reverse().map((p) => `${p.x},${p.y}`).join(' L ');
  return `M ${a[0]!.x},${a[0]!.y} L ${forward} L ${back} Z`;
}

export function DEQCanvas({
  bands,
  sampleRate,
  selectedBandIndex,
  onSelectBand,
  onBandChange,
  onBackgroundClick,
  onBackgroundPointerDown,
  onBackgroundPointerMove,
  onBackgroundPointerUp,
  dimensions,
  readOnly = false,
  className,
}: DeqCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isPlacingRef = useRef(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const onBackgroundPointerMoveRef = useRef<DeqCanvasProps['onBackgroundPointerMove']>(onBackgroundPointerMove);
  const onBackgroundPointerUpRef = useRef<DeqCanvasProps['onBackgroundPointerUp']>(onBackgroundPointerUp);
  useEffect(() => {
    onBackgroundPointerMoveRef.current = onBackgroundPointerMove;
  }, [onBackgroundPointerMove]);
  useEffect(() => {
    onBackgroundPointerUpRef.current = onBackgroundPointerUp;
  }, [onBackgroundPointerUp]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; frequency: number; gain: number } | null>(
    null,
  );

  const { width, height, marginLeft, marginRight, marginTop, marginBottom } = dimensions;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const baselineY = gainToY(0, dimensions);
  const showBandDetails = selectedBandIndex !== null;
  const selectedBand = selectedBandIndex !== null ? bands[selectedBandIndex] ?? null : null;

  const enabledBands = useMemo(() => bands.filter((b) => b.enabled), [bands]);

  const overallCurves = useMemo(() => {
    const staticFilters = enabledBands.map((b) => b.parameters);
    const toPoints = (response: { frequency: number; magnitude: number }[]): CurvePoints[] =>
      response.map(({ frequency, magnitude }) => ({
        x: freqToX(frequency, dimensions),
        y: gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions),
        frequency,
        gain: magnitude,
      }));

    const staticResponse = staticFilters.length === 0
      ? null
      : calculateCompositeResponse(staticFilters, sampleRate);

    const staticPoints = staticResponse ? toPoints(staticResponse) : [];

    return {
      staticPoints,
      staticPath: buildLinePath(staticPoints),
    };
  }, [dimensions, enabledBands, sampleRate]);

  const overallEnvelope = useMemo(() => {
    const { staticPoints } = overallCurves;
    if (staticPoints.length === 0) {
      return {
        rangePath: '',
        rangeArea: '',
        capPath: '',
        capArea: '',
        guideCurves: [] as GuideCurve[],
      };
    }

    const toPoints = (response: { frequency: number; magnitude: number }[]): CurvePoints[] =>
      response.map(({ frequency, magnitude }) => ({
        x: freqToX(frequency, dimensions),
        y: gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions),
        frequency,
        gain: magnitude,
      }));

    const dynMeta = enabledBands.map((band) => {
      const canDyn = hasGain(band.parameters.type) && 'gain' in band.parameters;
      const rangeAbs = Math.abs(Number.isFinite(band.dynamics.rangeDb) ? band.dynamics.rangeDb : 0);
      const ratio = clampNumber(
        Number.isFinite(band.dynamics.ratio) ? band.dynamics.ratio : MIN_RATIO,
        MIN_RATIO,
        MAX_RATIO,
      );
      const strength = getRatioStrength(ratio);
      return { canDyn, rangeAbs, strength };
    });

    const hasAnyDynamics = dynMeta.some((m) => m.canDyn && m.rangeAbs > 0.001 && m.strength > 0.0001);
    if (!hasAnyDynamics) {
      return {
        rangePath: '',
        rangeArea: '',
        capPath: '',
        capArea: '',
        guideCurves: [] as GuideCurve[],
      };
    }

    const rangeFilters = enabledBands.map((band, idx) => {
      const meta = dynMeta[idx]!;
      if (!meta.canDyn || meta.rangeAbs <= 0.001 || meta.strength <= 0.0001) return band.parameters;
      return applyDynamicsDelta(band.parameters, band.dynamics, meta.rangeAbs);
    });
    const rangeResponse = calculateCompositeResponse(rangeFilters, sampleRate);
    const rangePoints = rangeResponse ? toPoints(rangeResponse) : [];
    const rangePath = buildLinePath(rangePoints);
    const rangeArea = buildAreaBetween(staticPoints, rangePoints);

    const capFilters = enabledBands.map((band, idx) => {
      const meta = dynMeta[idx]!;
      if (!meta.canDyn || meta.rangeAbs <= 0.001 || meta.strength <= 0.0001) return band.parameters;
      const deltaAt0 = getMaxDeltaAtDbfs(band.dynamics, 0);
      return applyDynamicsDelta(band.parameters, band.dynamics, deltaAt0);
    });
    const capResponse = calculateCompositeResponse(capFilters, sampleRate);
    const capPoints = capResponse ? toPoints(capResponse) : [];
    const capPath = buildLinePath(capPoints);
    const capArea = buildAreaBetween(staticPoints, capPoints);

    // Fixed input levels (dBFS). Threshold shifts the spacing because "over-threshold" changes.
    const guideSpecs: Array<{ levelDbfs: number; opacity: number; strokeWidth: number }> = [
      { levelDbfs: -3, opacity: 0.20, strokeWidth: 1.3 },
      { levelDbfs: -6, opacity: 0.26, strokeWidth: 1.35 },
      { levelDbfs: -12, opacity: 0.34, strokeWidth: 1.45 },
      { levelDbfs: -24, opacity: 0.46, strokeWidth: 1.7 },
      { levelDbfs: -48, opacity: 0.56, strokeWidth: 1.9 },
    ];

    const guideCurves = guideSpecs.map(({ levelDbfs, opacity, strokeWidth }) => {
      const guideFilters = enabledBands.map((band, idx) => {
        const meta = dynMeta[idx]!;
        if (!meta.canDyn || meta.rangeAbs <= 0.001 || meta.strength <= 0.0001) return band.parameters;
        const delta = getMaxDeltaAtDbfs(band.dynamics, levelDbfs);
        return applyDynamicsDelta(band.parameters, band.dynamics, delta);
      });
      const response = calculateCompositeResponse(guideFilters, sampleRate);
      const points = response ? toPoints(response) : [];
      const path = buildLinePath(points);
      if (!path) return null;
      return { levelDbfs, opacity, strokeWidth, path };
    }).filter((curve): curve is GuideCurve => curve !== null);

    return {
      rangePath,
      rangeArea,
      capPath,
      capArea,
      guideCurves,
    };
  }, [dimensions, enabledBands, overallCurves, sampleRate]);

  const bandCurves = useMemo(() => {
    return bands.map((band, index) => {
      if (!band.enabled) return null;

      const staticResponse = calculateCompositeResponse([band.parameters], sampleRate);

      const toPoints = (response: { frequency: number; magnitude: number }[]): CurvePoints[] =>
        response.map(({ frequency, magnitude }) => ({
          x: freqToX(frequency, dimensions),
          y: gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions),
          frequency,
          gain: magnitude,
        }));

      const staticPoints = toPoints(staticResponse);

      const canDyn = hasGain(band.parameters.type) && 'gain' in band.parameters;
      const rangeAbs = Math.abs(Number.isFinite(band.dynamics.rangeDb) ? band.dynamics.rangeDb : 0);
      const ratio = clampNumber(
        Number.isFinite(band.dynamics.ratio) ? band.dynamics.ratio : MIN_RATIO,
        MIN_RATIO,
        MAX_RATIO,
      );
      const strength = getRatioStrength(ratio);
      const dynPossible = canDyn && rangeAbs > 0.001 && strength > 0.0001;

      const extremeParams = dynPossible
        ? applyDynamicsDelta(band.parameters, band.dynamics, rangeAbs)
        : band.parameters;
      const extremeResponse = dynPossible
        ? calculateCompositeResponse([extremeParams], sampleRate)
        : null;
      const extremePoints = extremeResponse ? toPoints(extremeResponse) : [];
      const dynArea = extremePoints.length === staticPoints.length && dynPossible
        ? buildAreaBetween(staticPoints, extremePoints)
        : '';

      return {
        index,
        color: getBandColor(index),
        staticPath: buildLinePath(staticPoints),
        bandFill: buildAreaToBaseline(staticPoints, baselineY),
        extremeArea: dynArea,
        hasDynamic: Boolean(dynArea),
      };
    }).filter(Boolean);
  }, [bands, baselineY, dimensions, sampleRate]);

  const findClosestPoint = useCallback(
    (svgX: number, svgY: number) => {
      let closest: { x: number; y: number; frequency: number; gain: number } | null = null;
      let minDist = Number.POSITIVE_INFINITY;
      for (const point of overallCurves.staticPoints) {
        const dx = point.x - svgX;
        const dy = point.y - svgY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closest = point;
        }
      }
      return { closest, minDist };
    },
    [overallCurves.staticPoints],
  );

  const getPointerFreqGain = useCallback(
    (svgX: number, svgY: number) => {
      const clampedX = Math.max(marginLeft, Math.min(width - marginRight, svgX));
      const clampedY = Math.max(marginTop, Math.min(height - marginBottom, svgY));
      const freq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, xToFreq(clampedX, dimensions)));
      const gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, yToGain(clampedY, dimensions)));
      return { freq, gain };
    },
    [dimensions, height, marginBottom, marginLeft, marginRight, marginTop, width],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      const isNode = target?.closest?.('.eq-node');
      if (isNode) return;
      e.preventDefault();
      if (!readOnly && (onBackgroundPointerDown || onBackgroundClick)) {
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const svgX = e.clientX - rect.left;
          const svgY = e.clientY - rect.top;
          const inPlot = svgX >= marginLeft
            && svgX <= width - marginRight
            && svgY >= marginTop
            && svgY <= height - marginBottom;
          if (inPlot) {
            const threshold = 14;
            const { closest, minDist } = findClosestPoint(svgX, svgY);
            const candidate = hoverPoint ?? closest;
            const distance = hoverPoint ? 0 : minDist;
            if (candidate && distance <= threshold * threshold) {
              const { freq, gain } = getPointerFreqGain(svgX, svgY);
                if (onBackgroundPointerDown) {
                  onBackgroundPointerDown(freq, gain);
                } else {
                  onBackgroundClick?.(candidate.frequency, candidate.gain);
                }
                isPlacingRef.current = true;
                setIsPlacing(true);

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  if (!isPlacingRef.current) return;
                  const svgEl = svgRef.current;
                if (!svgEl) return;
                const moveRect = svgEl.getBoundingClientRect();
                const moveX = moveEvent.clientX - moveRect.left;
                const moveY = moveEvent.clientY - moveRect.top;
                const { freq: moveFreq, gain: moveGain } = getPointerFreqGain(moveX, moveY);
                onBackgroundPointerMoveRef.current?.(moveFreq, moveGain);
              };

                const handleMouseUp = () => {
                  if (!isPlacingRef.current) return;
                  isPlacingRef.current = false;
                  setIsPlacing(false);
                  onBackgroundPointerUpRef.current?.();
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };

              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp, { once: true });
              return;
            }
          }
        }
      }
      onSelectBand(null);
    },
    [
      getPointerFreqGain,
      findClosestPoint,
      height,
      hoverPoint,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      onBackgroundClick,
      onBackgroundPointerDown,
      onBackgroundPointerMove,
      onBackgroundPointerUp,
      onSelectBand,
      readOnly,
      width,
    ],
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPlacingRef.current) {
        setHoverPoint(null);
        return;
      }
      if (readOnly || !onBackgroundClick) {
        setHoverPoint(null);
        return;
      }
      const target = e.target as Element | null;
      const isNode = target?.closest?.('.eq-node');
      if (isNode) {
        setHoverPoint(null);
        return;
      }
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;
      const inPlot = svgX >= marginLeft
        && svgX <= width - marginRight
        && svgY >= marginTop
        && svgY <= height - marginBottom;
      if (!inPlot) {
        setHoverPoint(null);
        return;
      }

      const { closest, minDist } = findClosestPoint(svgX, svgY);
      const threshold = 14;
      if (closest && minDist <= threshold * threshold) {
        setHoverPoint(closest);
      } else {
        setHoverPoint(null);
      }
    },
    [
      height,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      onBackgroundClick,
      findClosestPoint,
      readOnly,
      width,
    ],
  );


  const handleBandDrag = useCallback(
    (index: number, freq: number, gain: number) => {
      const band = bands[index];
      if (!band) return;

      const updates: Record<string, unknown> = {};

      if ('freq' in band.parameters) {
        updates.freq = Math.round(freq);
      } else if ('freq_act' in band.parameters) {
        updates.freq_act = Math.round(freq);
      }

      if (hasGain(band.parameters.type) && 'gain' in band.parameters) {
        updates.gain = Math.round(gain * 10) / 10;
      }

      onBandChange(index, updates as Partial<BiquadParameters>);
    },
    [bands, onBandChange],
  );

  const handleQChange = useCallback(
    (index: number, deltaQ: number) => {
      const band = bands[index];
      if (!band) return;

      if ('q' in band.parameters) {
        const currentQ = band.parameters.q;
        const newQ = Math.max(0.1, Math.min(20, currentQ + deltaQ));
        onBandChange(index, { q: Math.round(newQ * 100) / 100 });
      } else if ('slope' in band.parameters) {
        const currentSlope = band.parameters.slope;
        const newSlope = Math.max(0.1, Math.min(2, currentSlope - deltaQ * 0.1));
        onBandChange(index, { slope: Math.round(newSlope * 100) / 100 });
      }
    },
    [bands, onBandChange],
  );

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={cn('bg-dsp-surface rounded-lg', className)}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMove}
      onMouseLeave={() => { setHoverPoint(null); }}
      role="img"
      aria-label="Dynamic EQ frequency response"
    >
      {/* Plot area background */}
      <rect
        x={marginLeft}
        y={marginTop}
        width={plotWidth}
        height={plotHeight}
        className="fill-dsp-bg/50"
      />

      {/* Grid lines - Frequency (vertical) */}
      {FREQUENCY_MARKERS.map((freq) => {
        const x = freqToX(freq, dimensions);
        return (
          <g key={`freq-${freq}`}>
            <line
              x1={x}
              y1={marginTop}
              x2={x}
              y2={height - marginBottom}
              className="stroke-dsp-primary/50"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - marginBottom + 16}
              className="fill-dsp-text-muted text-xs"
              textAnchor="middle"
              style={{ fontSize: '10px' }}
            >
              {formatFrequency(freq)}
            </text>
          </g>
        );
      })}

      {/* Grid lines - Gain (horizontal) */}
      {GAIN_MARKERS.map((gain) => {
        const y = gainToY(gain, dimensions);
        const isZero = gain === 0;
        return (
          <g key={`gain-${gain}`}>
            <line
              x1={marginLeft}
              y1={y}
              x2={width - marginRight}
              y2={y}
              className={isZero ? 'stroke-dsp-text-muted/70' : 'stroke-dsp-primary/50'}
              strokeWidth={isZero ? 2 : 1}
            />
            <text
              x={marginLeft - 8}
              y={y + 4}
              className="fill-dsp-text-muted text-xs"
              textAnchor="end"
              style={{ fontSize: '10px' }}
            >
              {formatGain(gain)}
            </text>
          </g>
        );
      })}

      {/* Band fills */}
      {showBandDetails && bandCurves.map((curve) => {
        if (!curve) return null;
        return (
          <path
            key={`band-fill-${curve.index}`}
            d={curve.bandFill}
            fill={curve.color}
            opacity="0.14"
          />
        );
      })}

      {/* Individual band response curves (faint) */}
      {!showBandDetails && bandCurves.map((curve) => {
        if (!curve) return null;
        return (
          <path
            key={`band-curve-idle-${curve.index}`}
            d={curve.staticPath}
            fill="none"
            stroke={curve.color}
            strokeWidth="1"
            opacity="0.12"
          />
        );
      })}

      {/* Band dynamics overlays */}
      {showBandDetails && bandCurves.map((curve) => {
        if (!curve?.hasDynamic) return null;
        return (
          <g key={`band-dyn-${curve.index}`}>
            {curve.extremeArea && (
              <path
                d={curve.extremeArea}
                fill={curve.color}
                opacity={0.18}
              />
            )}
          </g>
        );
      })}

      {/* Overall dynamics envelope */}
      {overallEnvelope.rangeArea && overallEnvelope.rangeArea !== overallEnvelope.capArea && (
        <path
          d={overallEnvelope.rangeArea}
          fill="#facc15"
          opacity="0.06"
        />
      )}

      {/* 0 dBFS envelope (moves with Threshold/Ratio) */}
      {overallEnvelope.capArea && (
        <path
          d={overallEnvelope.capArea}
          fill="#facc15"
          opacity="0.12"
        />
      )}

      {/* Gain envelope guide curves (-3/-6/-12/-24/-48 dBFS) */}
      {overallEnvelope.guideCurves.map(({ levelDbfs, opacity, strokeWidth, path }) => (
        <path
          key={`env-dbfs-${String(levelDbfs)}`}
          d={path}
          fill="none"
          stroke="#facc15"
          strokeWidth={strokeWidth}
          strokeDasharray="6 4"
          opacity={opacity}
        />
      ))}

      {/* 0 dBFS curve */}
      {overallEnvelope.capPath
        && overallEnvelope.capPath !== overallCurves.staticPath
        && (
          <path
            d={overallEnvelope.capPath}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeDasharray="2 3"
            opacity={0.7}
          />
        )}

      {/* Composite response curve (static) */}
      {overallCurves.staticPath && (
        <path
          d={overallCurves.staticPath}
          fill="none"
          stroke="#facc15"
          strokeWidth="2.5"
          className="drop-shadow-sm"
        />
      )}

      {/* 0 dBFS curve (when it overlaps Static) */}
      {overallEnvelope.capPath
        && overallCurves.staticPath
        && overallEnvelope.capPath === overallCurves.staticPath
        && (
          <path
            d={overallEnvelope.capPath}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeDasharray="2 3"
            opacity={0.85}
          />
        )}

      {/* Legend for composite curves */}
      {overallCurves.staticPath && (
        <g style={{ pointerEvents: 'none' }}>
          {(() => {
            const selected = selectedBand;
            const selectedThresholdDb = selected
              ? clampNumber(
                  Number.isFinite(selected.dynamics.thresholdDb) ? selected.dynamics.thresholdDb : -24,
                  MIN_THRESHOLD_DB,
                  MAX_THRESHOLD_DB,
                )
              : null;

            const minThresholdDb = (() => {
              let min: number | null = null;
              for (const band of enabledBands) {
                if (!hasGain(band.parameters.type) || !('gain' in band.parameters)) continue;
                const rangeAbs = Math.abs(Number.isFinite(band.dynamics.rangeDb) ? band.dynamics.rangeDb : 0);
                if (rangeAbs <= 0.001) continue;
                const ratioStrength = getRatioStrength(
                  clampNumber(
                    Number.isFinite(band.dynamics.ratio) ? band.dynamics.ratio : MIN_RATIO,
                    MIN_RATIO,
                    MAX_RATIO,
                  ),
                );
                if (ratioStrength <= 0.0001) continue;
                const th = clampNumber(
                  Number.isFinite(band.dynamics.thresholdDb) ? band.dynamics.thresholdDb : -24,
                  MIN_THRESHOLD_DB,
                  MAX_THRESHOLD_DB,
                );
                min = min === null ? th : Math.min(min, th);
              }
              return min;
            })();

            const staticLabel = selectedThresholdDb !== null
              ? `≤ Th (${selectedThresholdDb.toFixed(1)} dBFS)`
              : minThresholdDb !== null
                ? `≤ min Th (${minThresholdDb.toFixed(1)} dBFS)`
                : 'No dynamics';

            const legendGuides = overallEnvelope.guideCurves
              .slice()
              .sort((a, b) => b.levelDbfs - a.levelDbfs);
            const show0DbfsRow = Boolean(overallEnvelope.capPath);

            const rows = 1 + legendGuides.length + (show0DbfsRow ? 1 : 0);
            const rowHeight = 14;
            const padding = 8;
            const boxW = selected || minThresholdDb !== null ? 260 : 150;
            const boxH = padding * 2 + rows * rowHeight;
            const x = width - marginRight - boxW;
            const y = marginTop + 6;

            let row = 0;
            const nextY = () => y + padding + row++ * rowHeight + 4;

            return (
              <>
                <rect
                  x={x}
                  y={y}
                  width={boxW}
                  height={boxH}
                  rx={8}
                  fill="rgba(0,0,0,0.35)"
                  stroke="rgba(255,255,255,0.10)"
                />

                {/* Static */}
                {(() => {
                  const cy = nextY();
                  return (
                    <>
                      <line x1={x + 10} y1={cy} x2={x + 42} y2={cy} stroke="#facc15" strokeWidth={2.5} />
                      <text x={x + 50} y={cy + 4} className="fill-dsp-text-muted" style={{ fontSize: '10px' }}>
                        {staticLabel}
                      </text>
                    </>
                  );
                })()}

                {show0DbfsRow && (() => {
                  const cy = nextY();
                  return (
                    <>
                      <line
                        x1={x + 10}
                        y1={cy}
                        x2={x + 42}
                        y2={cy}
                        stroke="#facc15"
                        strokeWidth={2}
                        strokeDasharray="2 3"
                        opacity={0.7}
                      />
                      <text x={x + 50} y={cy + 4} className="fill-dsp-text-muted" style={{ fontSize: '10px' }}>
                        0 dBFS
                      </text>
                    </>
                  );
                })()}

                {legendGuides.map(({ levelDbfs, opacity, strokeWidth }) => {
                  const cy = nextY();
                  return (
                    <g key={`legend-dbfs-${String(levelDbfs)}`}>
                      <line
                        x1={x + 10}
                        y1={cy}
                        x2={x + 42}
                        y2={cy}
                        stroke="#facc15"
                        strokeWidth={strokeWidth}
                        strokeDasharray="6 4"
                        opacity={opacity}
                      />
                      <text x={x + 50} y={cy + 4} className="fill-dsp-text-muted" style={{ fontSize: '10px' }}>
                        {levelDbfs.toFixed(0)} dBFS
                      </text>
                    </g>
                  );
                })}
              </>
            );
          })()}
        </g>
      )}

      {/* Dynamics range arrows per band */}
      {showBandDetails && bands.map((band, index) => {
        if (!band.enabled) return null;
        if (!hasGain(band.parameters.type) || !('gain' in band.parameters)) return null;
        const rangeAbs = Math.abs(Number.isFinite(band.dynamics.rangeDb) ? band.dynamics.rangeDb : 0);
        if (!Number.isFinite(rangeAbs) || rangeAbs <= 0.01) return null;

        const freq = 'freq' in band.parameters ? band.parameters.freq : 1000;
        const x = freqToX(freq, dimensions);
        const startY = gainToY(band.parameters.gain, dimensions);
        const delta = band.dynamics.mode === 'upward' ? rangeAbs : -rangeAbs;
        const endY = gainToY(band.parameters.gain + delta, dimensions);
        const color = getBandColor(index);

        const ratio = clampNumber(
          Number.isFinite(band.dynamics.ratio) ? band.dynamics.ratio : MIN_RATIO,
          MIN_RATIO,
          MAX_RATIO,
        );
        const thresholdDb = clampNumber(
          Number.isFinite(band.dynamics.thresholdDb) ? band.dynamics.thresholdDb : -24,
          MIN_THRESHOLD_DB,
          MAX_THRESHOLD_DB,
        );
        const ratioStrength = getRatioStrength(ratio);
        if (ratioStrength <= 0.0001) return null;
        const thresholdStrength = clampNumber((-thresholdDb) / Math.abs(MIN_THRESHOLD_DB), 0, 1);
        const strokeWidth = 1.5 + ratioStrength * 1.6;
        const arrowOpacity = 0.6 + thresholdStrength * 0.3;

        const headSize = 7;
        const dir = endY < startY ? -1 : 1;
        const tipY = endY;
        const baseY = endY + dir * headSize;
        const triangle = `M ${x} ${tipY} L ${x - headSize / 2} ${baseY} L ${x + headSize / 2} ${baseY} Z`;

        const showLabel = selectedBandIndex === index;
        const preferLeft = x - 110 >= marginLeft + 8;
        const labelAnchor = preferLeft ? 'end' : 'start';
        const labelX = labelAnchor === 'end' ? x - 12 : x + 12;

        const isDownward = delta < 0;
        const referenceY = isDownward ? Math.max(startY, endY) : Math.min(startY, endY);
        const labelBaseY = isDownward ? referenceY + 22 : referenceY - 14;
        const labelY = clampNumber(labelBaseY, marginTop + 18, height - marginBottom - 10);

        return (
          <g key={`dyn-arrow-${band.id}`}>
            <line
              x1={x}
              y1={startY}
              x2={x}
              y2={endY}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={arrowOpacity}
            />
            <path d={triangle} fill={color} opacity={arrowOpacity} />

            {showLabel && (
              <>
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={labelAnchor}
                  className="fill-dsp-text-muted"
                  style={{ fontSize: '10px' }}
                >
                  Th {thresholdDb.toFixed(1)} dB
                </text>
                <text
                  x={labelX}
                  y={labelY + 12}
                  textAnchor={labelAnchor}
                  className="fill-dsp-text-muted"
                  style={{ fontSize: '10px' }}
                >
                  R {ratio.toFixed(1)}:1
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* EQ Nodes */}
      {bands.map((band, index) => (
        <EQNode
          key={band.id}
          band={band}
          index={index}
          isSelected={selectedBandIndex === index}
          isExternalDragging={isPlacing && selectedBandIndex === index}
          dimensions={dimensions}
          onSelect={() => { onSelectBand(index); }}
          onDrag={(freq, gain) => { handleBandDrag(index, freq, gain); }}
          onDragEnd={() => { /* no-op */ }}
          onQChange={(delta) => { handleQChange(index, delta); }}
          disabled={readOnly}
        />
      ))}

      {hoverPoint && (
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={6}
            fill="#eab308"
            opacity={0.65}
          />
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={9}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            opacity={0.6}
          />
        </g>
      )}

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height - 4}
        className="fill-dsp-text-muted text-xs"
        textAnchor="middle"
        style={{ fontSize: '11px' }}
      >
        Frequency (Hz)
      </text>
      <text
        x={12}
        y={height / 2}
        className="fill-dsp-text-muted text-xs"
        textAnchor="middle"
        transform={`rotate(-90, 12, ${height / 2})`}
        style={{ fontSize: '11px' }}
      >
        Gain (dB)
      </text>
    </svg>
  );
}
