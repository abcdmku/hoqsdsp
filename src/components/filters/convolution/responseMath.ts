import {
  COMPLEX_ONE,
  calculateFirComplexResponse,
  calculateFilterChainComplexResponse,
  complexAbs,
  complexMul,
  groupDelaySeconds,
  phaseRad,
  unwrapPhase,
} from '../../../lib/dsp';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import type { FirMagnitudeStats, FrequencySeries } from './types';
import { radToDeg, wrapRadToPi } from './utils';

export type ComplexPoint = { re: number; im: number };

export const toDb = (c: ComplexPoint) => 20 * Math.log10(Math.max(1e-12, complexAbs(c)));

export const toComplexPoints = (points: Array<{ re: number; im: number }>) =>
  points.map((p) => ({ re: p.re, im: p.im }));

export const buildComplexSeries = (
  frequencies: number[],
  filterConfigs: ChannelProcessingFilter['config'][],
  sampleRate: number,
) => frequencies.map((f) => calculateFilterChainComplexResponse(filterConfigs, f, sampleRate));

export const buildFirSeries = (taps: number[], sampleRate: number, frequencies: number[]) =>
  toComplexPoints(calculateFirComplexResponse(taps, sampleRate, frequencies));

export const multiplySeries = (a: ComplexPoint[], b: ComplexPoint[]) =>
  a.map((point, i) => complexMul(point, b[i] ?? COMPLEX_ONE));

export const buildMagnitudeStats = (points: ComplexPoint[] | null): FirMagnitudeStats | null => {
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

export const buildMagnitudePlot = (series: FrequencySeries[]) => {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
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
};

export const buildPhaseSeriesFor = (
  complex: ComplexPoint[],
  responseFrequencies: number[],
  refDelaySamples: number,
  sampleRate: number,
  hideBelowDb: number,
  label: string,
  id: string,
  colorClass: string,
  strokeDasharray?: string,
): FrequencySeries => {
  const phases = unwrapPhase(complex.map((c) => phaseRad(c)));
  const wAt = (freqHz: number) => (2 * Math.PI * freqHz) / sampleRate;
  return {
    id,
    label,
    colorClass,
    strokeDasharray,
    points: responseFrequencies.map((f, i) => {
      const c = complex[i] ?? COMPLEX_ONE;
      if (toDb(c) < hideBelowDb) return { frequency: f, value: Number.NaN };
      return { frequency: f, value: radToDeg(wrapRadToPi((phases[i] ?? 0) + wAt(f) * refDelaySamples)) };
    }),
  };
};

export const buildDelayMsSeries = (complex: ComplexPoint[], responseFrequencies: number[]) => {
  const ph = unwrapPhase(complex.map((c) => phaseRad(c)));
  return groupDelaySeconds(ph, responseFrequencies).map((t) => t * 1000);
};

export const calculatePipelineDelaySamples = (
  filterConfigs: ChannelProcessingFilter['config'][],
  sampleRate: number,
) => {
  let total = 0;
  for (const filterConfig of filterConfigs) {
    if (filterConfig.type !== 'Delay') continue;
    const { delay, unit, subsample } = filterConfig.parameters;
    let delaySamples: number;
    if (unit === 'samples') delaySamples = delay;
    else if (unit === 'ms') delaySamples = (delay / 1000) * sampleRate;
    else delaySamples = (delay / 343000) * sampleRate;
    total += subsample ? delaySamples : Math.round(delaySamples);
  }
  return total;
};
