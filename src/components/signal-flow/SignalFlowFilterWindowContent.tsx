import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { ChannelNode, ChannelProcessingFilter } from '../../lib/signalflow';
import { upsertSingleFilterOfType } from '../../lib/signalflow/filterUtils';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1, FilterConfig, FilterType } from '../../types';
import type { EQBand } from '../eq-editor/types';
import { EQEditor } from '../eq-editor/EQEditor';
import { DEQEditor } from '../deq-editor/DEQEditor';
import { SignalFlowFilterEditorPanel } from './SignalFlowFilterEditorPanel';
import { buildEqBands, mergeEqBandsIntoFilters } from './eqUtils';
import { buildDeqBands, deqBandToUiSettings, mergeDeqBandsIntoFilters } from './deqUtils';

const DEFAULT_FILTER_CONFIGS: Record<FilterType, FilterConfig> = {
  Biquad: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } },
  Delay: { type: 'Delay', parameters: { delay: 0, unit: 'ms', subsample: true } },
  Gain: { type: 'Gain', parameters: { gain: 0, scale: 'dB' } },
  Compressor: { type: 'Compressor', parameters: { channels: 1, threshold: -20, factor: 4, attack: 5, release: 100 } },
  NoiseGate: { type: 'NoiseGate', parameters: { channels: 1, threshold: -60, attack: 1, release: 50, hold: 100 } },
  Conv: { type: 'Conv', parameters: { type: 'Values', values: [1] } },
  Dither: { type: 'Dither', parameters: { type: 'Simple', bits: 16 } },
  Volume: { type: 'Volume', parameters: {} },
  Loudness: { type: 'Loudness', parameters: { reference_level: -25, high_boost: 5, low_boost: 10 } },
  DiffEq: { type: 'DiffEq', parameters: { a: [1], b: [1] } },
};

function cloneFilterConfig<T extends FilterConfig>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
}

function createDefaultFilter(type: FilterType): FilterConfig {
  const template = DEFAULT_FILTER_CONFIGS[type] ?? DEFAULT_FILTER_CONFIGS.Biquad;
  return cloneFilterConfig(template);
}

function buildFilterNameBase(node: ChannelNode, filterType: FilterType): string {
  return `sf-${node.side}-ch${String(node.channelIndex + 1)}-${filterType.toLowerCase()}-${String(Date.now())}`;
}

export interface SignalFlowFilterWindowContentProps {
  node: ChannelNode;
  sampleRate: number;
  filterType: FilterType;
  onClose: () => void;
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
  topRightControls?: ReactNode;
  firPhaseCorrection?: Record<string, FirPhaseCorrectionUiSettingsV1>;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  deq?: Record<string, DeqBandUiSettingsV1>;
  onPersistDeqSettings?: (filterName: string, settings: DeqBandUiSettingsV1 | null) => void;
}

export function SignalFlowFilterWindowContent({
  node,
  sampleRate,
  filterType,
  onClose,
  onChange,
  topRightControls,
  firPhaseCorrection,
  onPersistFirPhaseCorrectionSettings,
  deq,
  onPersistDeqSettings,
}: SignalFlowFilterWindowContentProps) {
  const filters = node.processing.filters;
  const deqUi = deq ?? {};

  const eqBands = useMemo(() => buildEqBands(filters), [filters]);
  const eqChange = useCallback(
    (nextBands: EQBand[]) => {
      onChange(mergeEqBandsIntoFilters(node, nextBands), { debounce: true });
    },
    [node, onChange],
  );

  const deqBands = useMemo(() => buildDeqBands(filters, deqUi, sampleRate), [filters, deqUi, sampleRate]);
  const prevDeqBandsRef = useRef(deqBands);
  useEffect(() => {
    prevDeqBandsRef.current = deqBands;
  }, [deqBands]);

  const firstFilterOfType = useMemo(() => {
    const index = filters.findIndex((f) => f.config.type === filterType);
    const count = filters.reduce((total, filter) => total + (filter.config.type === filterType ? 1 : 0), 0);
    return { index, count, filter: index >= 0 ? filters[index] ?? null : null };
  }, [filters, filterType]);

  const applySingle = useCallback(
    (config: FilterConfig, options?: { debounce?: boolean }) => {
      const nameBase = buildFilterNameBase(node, filterType);
      onChange(upsertSingleFilterOfType(filters, config, nameBase), options);
    },
    [filterType, filters, node, onChange],
  );

  if (filterType === 'Biquad') {
    return (
      <EQEditor
        bands={eqBands}
        onChange={eqChange}
        sampleRate={sampleRate}
        topRightControls={topRightControls}
        className="bg-transparent p-0"
      />
    );
  }

  if (filterType === 'DiffEq') {
    return (
      <DEQEditor
        bands={deqBands}
        sampleRate={sampleRate}
        className="bg-transparent p-0"
        topRightControls={topRightControls}
        onChange={(nextBands) => {
          const { filters: nextFilters, bands: normalizedBands } = mergeDeqBandsIntoFilters(node, nextBands, sampleRate);
          onChange(nextFilters, { debounce: true });

          if (onPersistDeqSettings) {
            const prev = prevDeqBandsRef.current;
            const prevById = new Map(prev.map((b) => [b.id, b]));
            const nextIds = new Set(normalizedBands.map((b) => b.id));

            for (const band of normalizedBands) {
              const prevBand = prevById.get(band.id) ?? null;
              const changed = !prevBand || JSON.stringify(prevBand) !== JSON.stringify(band);
              if (!changed) continue;
              onPersistDeqSettings(band.id, deqBandToUiSettings(band));
            }

            for (const prevBand of prev) {
              if (!nextIds.has(prevBand.id)) {
                onPersistDeqSettings(prevBand.id, null);
              }
            }

            prevDeqBandsRef.current = normalizedBands;
          }
        }}
      />
    );
  }

  const fallback = createDefaultFilter(filterType);
  const currentConfig = firstFilterOfType.filter?.config ?? fallback;
  const currentFilterName = firstFilterOfType.filter?.name;
  const currentFirPhaseCorrectionSettings = currentFilterName ? firPhaseCorrection?.[currentFilterName] : undefined;

  const warning = firstFilterOfType.count > 1
    ? `Multiple ${filterType} filters found; editing the first one in the chain.`
    : null;

  return (
    <div className="space-y-3">
      {warning && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          {warning}
        </div>
      )}
      <SignalFlowFilterEditorPanel
        filterType={filterType}
        config={currentConfig}
        sampleRate={sampleRate}
        filters={filters}
        filterName={currentFilterName}
        firPhaseCorrectionSettings={currentFirPhaseCorrectionSettings}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        onClose={onClose}
        onApply={(updated) => { applySingle(updated, { debounce: true }); }}
        onSave={(updated) => { applySingle(updated); }}
      />
    </div>
  );
}
