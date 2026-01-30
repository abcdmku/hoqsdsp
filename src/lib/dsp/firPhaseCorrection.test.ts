import { describe, it, expect } from 'vitest';
import type { FilterConfig } from '../../types';
import { calculateFilterChainComplexResponse, complexAbs, complexExpj, complexMul, phaseRad } from './index';
import { designFirPhaseCorrection } from './firPhaseCorrection';

function firComplexAt(taps: number[], sampleRate: number, frequency: number): { re: number; im: number } {
  const w = (2 * Math.PI * frequency) / sampleRate;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  let cosN = 1;
  let sinN = 0;
  let re = 0;
  let im = 0;

  for (let n = 0; n < taps.length; n++) {
    const h = taps[n] ?? 0;
    re += h * cosN;
    im -= h * sinN;

    const nextCos = cosN * cosW - sinN * sinW;
    const nextSin = sinN * cosW + cosN * sinW;
    cosN = nextCos;
    sinN = nextSin;
  }

  return { re, im };
}

describe('designFirPhaseCorrection', () => {
  const sampleRate = 48000;

  it('returns identity when no filters are provided', () => {
    const result = designFirPhaseCorrection({
      sampleRate,
      taps: 1025,
      window: 'Hann',
      band: { lowHz: 20, highHz: 20000, transitionOctaves: 0.25 },
      magnitudeGate: { thresholdDb: -30, transitionDb: 12 },
      filters: [],
    });

    expect(result.taps).toEqual([1]);
    expect(result.delaySamples).toBe(0);
  });

  it('reduces excess phase for a simple peaking EQ', () => {
    const filters: FilterConfig[] = [
      { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 6, q: 2 } },
    ];

    const designed = designFirPhaseCorrection({
      sampleRate,
      taps: 2049,
      window: 'Hann',
      band: { lowHz: 20, highHz: 20000, transitionOctaves: 0.25 },
      magnitudeGate: { thresholdDb: -30, transitionDb: 12 },
      filters,
    });

    expect(designed.taps.length).toBe(2049);
    expect(designed.delaySamples).toBe(1024);

    const f = 1000;
    const pipe = calculateFilterChainComplexResponse(filters, f, sampleRate);
    const corr = firComplexAt(designed.taps, sampleRate, f);

    const w = (2 * Math.PI * f) / sampleRate;
    const undoDelay = complexExpj(w * designed.delaySamples);

    const baselineExcess = phaseRad(complexMul(pipe, undoDelay));
    const combinedExcess = phaseRad(complexMul(complexMul(pipe, corr), undoDelay));

    expect(Math.abs(baselineExcess)).toBeGreaterThan(0.05);
    expect(Math.abs(combinedExcess)).toBeLessThan(Math.abs(baselineExcess) * 0.6);
  });

  it('does not introduce large magnitude errors (phase-only correction)', () => {
    const filters: FilterConfig[] = [
      { type: 'Biquad', parameters: { type: 'Peaking', freq: 225, gain: 5.8, q: 0.1 } },
      { type: 'Biquad', parameters: { type: 'Highpass', freq: 100, q: 1 } },
    ];

    const designed = designFirPhaseCorrection({
      sampleRate,
      taps: 7969,
      window: 'Hann',
      band: { lowHz: 20, highHz: 20000, transitionOctaves: 0.25 },
      magnitudeGate: { thresholdDb: -30, transitionDb: 12 },
      filters,
    });

    const points = 64;
    let worstDb = 0;
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const f = 20 * Math.pow(20000 / 20, t);

      const corr = firComplexAt(designed.taps, sampleRate, f);
      const db = 20 * Math.log10(Math.max(1e-12, complexAbs(corr)));
      worstDb = Math.max(worstDb, Math.abs(db));
    }

    // A non-trivial FIR cannot be a perfect all-pass; allow some magnitude error,
    // but keep it bounded to avoid wildly misleading previews.
    expect(worstDb).toBeLessThan(20);
  });
});
