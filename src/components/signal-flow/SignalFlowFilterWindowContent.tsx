import { useCallback, useMemo } from 'react';
import type { ChannelNode, ChannelProcessingFilter } from '../../lib/signalflow';
import type {
  CompressorFilter,
  ConvolutionFilter,
  DelayFilter,
  DiffEqFilter,
  DitherFilter,
  FirPhaseCorrectionUiSettingsV1,
  FilterConfig,
  FilterType,
  GainFilter,
  LoudnessFilter,
  NoiseGateFilter,
  VolumeFilter,
} from '../../types';
import type { EQBand } from '../eq-editor/types';
import { EQEditor } from '../eq-editor/EQEditor';
import {
  CompressorEditorPanel,
  ConvolutionEditorPanel,
  DelayEditorPanel,
  DiffEqEditorPanel,
  DitherEditorPanel,
  GainEditorPanel,
  LoudnessEditorPanel,
  NoiseGateEditorPanel,
  VolumeEditorPanel,
} from '../filters';

function ensureUniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let attempt = 1;
  while (taken.has(`${base}-${String(attempt)}`)) {
    attempt += 1;
  }
  return `${base}-${String(attempt)}`;
}

function createDefaultFilter(type: FilterType): FilterConfig {
  switch (type) {
    case 'Biquad':
      return { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } };
    case 'Delay':
      return { type: 'Delay', parameters: { delay: 0, unit: 'ms', subsample: true } };
    case 'Gain':
      return { type: 'Gain', parameters: { gain: 0, scale: 'dB' } };
    case 'Compressor':
      return { type: 'Compressor', parameters: { channels: 1, threshold: -20, factor: 4, attack: 5, release: 100 } };
    case 'NoiseGate':
      return { type: 'NoiseGate', parameters: { channels: 1, threshold: -60, attack: 1, release: 50, hold: 100 } };
    case 'Conv':
      return { type: 'Conv', parameters: { type: 'Values', values: [1] } };
    case 'Dither':
      return { type: 'Dither', parameters: { type: 'Simple', bits: 16 } };
    case 'Volume':
      return { type: 'Volume', parameters: {} };
    case 'Loudness':
      return { type: 'Loudness', parameters: { reference_level: -25, high_boost: 5, low_boost: 10 } };
    case 'DiffEq':
      return { type: 'DiffEq', parameters: { a: [1], b: [1] } };
    default:
      return { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } };
  }
}

function upsertSingleFilterOfType(
  node: ChannelNode,
  type: FilterType,
  config: FilterConfig,
): ChannelProcessingFilter[] {
  const current = node.processing.filters;
  const index = current.findIndex((filter) => filter.config.type === type);
  if (index >= 0) {
    return current.map((filter, idx) => (idx === index ? { ...filter, config } : filter));
  }

  const takenNames = new Set(current.map((f) => f.name));
  const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-${type.toLowerCase()}-${String(Date.now())}`;
  const name = ensureUniqueName(baseName, takenNames);
  return [...current, { name, config }];
}

function getBiquadBlock(filters: ChannelProcessingFilter[]): { start: number; end: number } | null {
  const indices: number[] = [];
  for (let i = 0; i < filters.length; i++) {
    if (filters[i]?.config.type === 'Biquad') indices.push(i);
  }
  return indices.length > 0 ? { start: indices[0]!, end: indices[indices.length - 1]! } : null;
}

function buildEqBands(filters: ChannelProcessingFilter[]): EQBand[] {
  const bands: EQBand[] = [];
  for (const filter of filters) {
    if (filter.config.type !== 'Biquad') continue;
    bands.push({
      id: filter.name,
      enabled: true,
      parameters: filter.config.parameters,
    });
  }
  return bands;
}

function mergeEqBandsIntoFilters(
  node: ChannelNode,
  nextBands: EQBand[],
): ChannelProcessingFilter[] {
  const processingFilters = node.processing.filters;
  const takenNames = new Set(processingFilters.map((f) => f.name));
  const usedNames = new Set<string>();

  const normalizedBands: EQBand[] = nextBands.map((band, index) => {
    if (takenNames.has(band.id)) {
      usedNames.add(band.id);
      return band;
    }

    const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-biquad-${String(Date.now())}-${String(index)}`;
    const nextName = ensureUniqueName(baseName, new Set([...takenNames, ...usedNames]));
    usedNames.add(nextName);
    return { ...band, id: nextName };
  });

  const nextBiquadFilters: ChannelProcessingFilter[] = normalizedBands.map((band) => ({
    name: band.id,
    config: { type: 'Biquad', parameters: band.parameters },
  }));

  const current = processingFilters;
  const biquadBlock = getBiquadBlock(processingFilters);
  const nextFilters: ChannelProcessingFilter[] = [];

  if (!biquadBlock) {
    nextFilters.push(...current, ...nextBiquadFilters);
  } else {
    nextFilters.push(...current.slice(0, biquadBlock.start));
    nextFilters.push(...nextBiquadFilters);
    nextFilters.push(...current.slice(biquadBlock.end + 1));
  }

  return nextFilters;
}

export interface SignalFlowFilterWindowContentProps {
  node: ChannelNode;
  sampleRate: number;
  filterType: FilterType;
  onClose: () => void;
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
  firPhaseCorrection?: Record<string, FirPhaseCorrectionUiSettingsV1>;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
}

export function SignalFlowFilterWindowContent({
  node,
  sampleRate,
  filterType,
  onClose,
  onChange,
  firPhaseCorrection,
  onPersistFirPhaseCorrectionSettings,
}: SignalFlowFilterWindowContentProps) {
  const filters = node.processing.filters;

  const eqBands = useMemo(() => buildEqBands(filters), [filters]);
  const eqChange = useCallback(
    (nextBands: EQBand[]) => {
      onChange(mergeEqBandsIntoFilters(node, nextBands), { debounce: true });
    },
    [node, onChange],
  );

  const firstFilterOfType = useMemo(() => {
    const index = filters.findIndex((f) => f.config.type === filterType);
    const count = filters.reduce((total, filter) => total + (filter.config.type === filterType ? 1 : 0), 0);
    return { index, count, filter: index >= 0 ? filters[index] ?? null : null };
  }, [filters, filterType]);

  const applySingle = useCallback(
    (config: FilterConfig, options?: { debounce?: boolean }) => {
      onChange(upsertSingleFilterOfType(node, filterType, config), options);
    },
    [filterType, node, onChange],
  );

  if (filterType === 'Biquad') {
    return (
      <EQEditor
        bands={eqBands}
        onChange={eqChange}
        sampleRate={sampleRate}
        className="bg-transparent p-0"
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

  const commonProps = {
    onClose,
    onApply: (updated: FilterConfig) => { applySingle(updated, { debounce: true }); },
    onSave: (updated: FilterConfig) => { applySingle(updated); },
  } as const;

  return (
    <div className="space-y-3">
      {warning && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          {warning}
        </div>
      )}

      {filterType === 'Gain' && (
        <GainEditorPanel
          {...commonProps}
          filter={currentConfig as GainFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Delay' && (
        <DelayEditorPanel
          {...commonProps}
          filter={currentConfig as DelayFilter}
          sampleRate={sampleRate}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Volume' && (
        <VolumeEditorPanel
          {...commonProps}
          filter={currentConfig as VolumeFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'DiffEq' && (
        <DiffEqEditorPanel
          {...commonProps}
          filter={currentConfig as DiffEqFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Conv' && (
        <ConvolutionEditorPanel
          {...commonProps}
          filter={currentConfig as ConvolutionFilter}
          sampleRate={sampleRate}
          channelFilters={filters}
          filterName={currentFilterName}
          firPhaseCorrectionSettings={currentFirPhaseCorrectionSettings}
          onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Compressor' && (
        <CompressorEditorPanel
          {...commonProps}
          filter={currentConfig as CompressorFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'NoiseGate' && (
        <NoiseGateEditorPanel
          {...commonProps}
          filter={currentConfig as NoiseGateFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Loudness' && (
        <LoudnessEditorPanel
          {...commonProps}
          filter={currentConfig as LoudnessFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType === 'Dither' && (
        <DitherEditorPanel
          {...commonProps}
          filter={currentConfig as DitherFilter}
          onApply={(updated) => { applySingle(updated, { debounce: true }); }}
          onSave={(updated) => { applySingle(updated); }}
        />
      )}

      {filterType !== 'Gain' &&
        filterType !== 'Delay' &&
        filterType !== 'Volume' &&
        filterType !== 'DiffEq' &&
        filterType !== 'Conv' &&
        filterType !== 'Compressor' &&
        filterType !== 'NoiseGate' &&
        filterType !== 'Loudness' &&
        filterType !== 'Dither' && (
          <div className="text-sm text-dsp-text-muted">
            No editor available for {filterType}.
          </div>
      )}
    </div>
  );
}
