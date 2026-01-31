import type { ChannelNode, ChannelProcessingFilter } from '../../lib/signalflow';
import { ensureUniqueName, replaceDiffEqBlock } from '../../lib/signalflow/filterUtils';
import { calculateCoefficients } from '../../lib/dsp';
import type { BiquadParameters, DeqBandUiSettingsV1, DiffEqFilter } from '../../types';
import type { DeqBand } from '../deq-editor/types';
import { DEFAULT_DEQ_DYNAMICS, normalizeDeqDynamics } from '../deq-editor/types';

const DEFAULT_BAND_PARAMS: BiquadParameters = {
  type: 'Peaking',
  freq: 1000,
  gain: 0,
  q: 1.0,
};

export function buildDeqBands(
  filters: ChannelProcessingFilter[],
  deqUi: Record<string, DeqBandUiSettingsV1>,
): DeqBand[] {
  return filters.flatMap((filter) => {
    if (filter.config.type !== 'DiffEq') return [];
    const settings = deqUi[filter.name];
    return [{
      id: filter.name,
      enabled: settings?.enabled ?? true,
      parameters: settings?.biquad ?? DEFAULT_BAND_PARAMS,
      dynamics: normalizeDeqDynamics(settings?.dynamics ?? DEFAULT_DEQ_DYNAMICS),
    }];
  });
}

function makeDiffEqName(node: ChannelNode, index: number, taken: Set<string>): string {
  const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-deq-${String(Date.now())}-${String(index)}`;
  return ensureUniqueName(baseName, taken);
}

function normalizeDeqBands(
  node: ChannelNode,
  takenNames: Set<string>,
  nextBands: DeqBand[],
): DeqBand[] {
  const usedNames = new Set<string>();
  return nextBands.map((band, index) => {
    if (takenNames.has(band.id)) {
      usedNames.add(band.id);
      return band;
    }
    const nextName = makeDiffEqName(node, index, new Set([...takenNames, ...usedNames]));
    usedNames.add(nextName);
    return { ...band, id: nextName };
  });
}

function bandToDiffEqConfig(band: DeqBand, sampleRate: number): DiffEqFilter {
  if (!band.enabled) {
    return { type: 'DiffEq', parameters: { a: [1], b: [1] } };
  }

  const coeffs = calculateCoefficients(band.parameters, sampleRate);
  return {
    type: 'DiffEq',
    parameters: {
      a: [1, coeffs.a1, coeffs.a2],
      b: [coeffs.b0, coeffs.b1, coeffs.b2],
    },
  };
}

export function deqBandToUiSettings(band: DeqBand): DeqBandUiSettingsV1 {
  return {
    version: 1,
    enabled: band.enabled,
    biquad: band.parameters,
    dynamics: band.dynamics,
  };
}

export function mergeDeqBandsIntoFilters(
  node: ChannelNode,
  nextBands: DeqBand[],
  sampleRate: number,
): { filters: ChannelProcessingFilter[]; bands: DeqBand[] } {
  const processingFilters = node.processing.filters;
  const takenNames = new Set(processingFilters.map((f) => f.name));
  const normalizedBands = normalizeDeqBands(node, takenNames, nextBands);
  const nextDiffEqFilters: ChannelProcessingFilter[] = normalizedBands.map((band) => ({
    name: band.id,
    config: bandToDiffEqConfig(band, sampleRate),
  }));
  return {
    filters: replaceDiffEqBlock(processingFilters, nextDiffEqFilters),
    bands: normalizedBands,
  };
}

