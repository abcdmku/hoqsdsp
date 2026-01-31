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

function extractNormalizedDiffEqCoefficients(
  filter: DiffEqFilter,
): { b0: number; b1: number; b2: number; a1: number; a2: number } | null {
  const a = filter.parameters.a;
  const b = filter.parameters.b;

  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length < 3 || b.length < 3) return null;

  const a0 = a[0] ?? 1;
  if (!Number.isFinite(a0) || a0 === 0) return null;

  const b0 = (b[0] ?? 0) / a0;
  const b1 = (b[1] ?? 0) / a0;
  const b2 = (b[2] ?? 0) / a0;
  const a1 = (a[1] ?? 0) / a0;
  const a2 = (a[2] ?? 0) / a0;

  if (![b0, b1, b2, a1, a2].every(Number.isFinite)) return null;

  return { b0, b1, b2, a1, a2 };
}

function isExplicitBypass(filter: DiffEqFilter): boolean {
  const a = filter.parameters.a;
  const b = filter.parameters.b;
  if (a.length !== 1 || b.length !== 1) return false;
  const a0 = a[0] ?? 0;
  const b0 = b[0] ?? 0;
  return Number.isFinite(a0) && Number.isFinite(b0) && a0 === 1 && b0 === 1;
}

function tryDerivePeakingParams(filter: DiffEqFilter, sampleRate: number): BiquadParameters | null {
  const coeffs = extractNormalizedDiffEqCoefficients(filter);
  if (!coeffs) return null;

  const denom = 1 + coeffs.a2;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return null;

  const x = (1 - coeffs.a2) / denom; // x = alpha / A
  if (!Number.isFinite(x) || x <= 0) return null;

  const y = coeffs.b0 * (1 + x) - 1; // y = alpha * A
  if (!Number.isFinite(y) || y <= 0) return null;

  const cosW0 = Math.max(-1, Math.min(1, (-coeffs.a1 * (1 + x)) / 2));
  const w0 = Math.acos(cosW0);
  const sinW0 = Math.sin(w0);

  const alpha = Math.sqrt(x * y);
  if (!Number.isFinite(alpha) || alpha <= 0) return null;

  const q = sinW0 / (2 * alpha);
  if (!Number.isFinite(q) || q <= 0) return null;

  const a = Math.sqrt(y / x);
  if (!Number.isFinite(a) || a <= 0) return null;

  const gain = 40 * Math.log10(a);
  const freq = (w0 * sampleRate) / (2 * Math.PI);
  if (!Number.isFinite(freq) || freq <= 0) return null;

  return {
    type: 'Peaking',
    freq,
    gain,
    q,
  };
}

export function buildDeqBands(
  filters: ChannelProcessingFilter[],
  deqUi: Record<string, DeqBandUiSettingsV1>,
  sampleRate: number,
): DeqBand[] {
  return filters.flatMap((filter) => {
    if (filter.config.type !== 'DiffEq') return [];
    const settings = deqUi[filter.name];

    const enabled = settings?.enabled ?? !isExplicitBypass(filter.config);
    const parameters = settings?.biquad ?? tryDerivePeakingParams(filter.config, sampleRate) ?? DEFAULT_BAND_PARAMS;

    return [{
      id: filter.name,
      enabled,
      parameters,
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
