import { describe, expect, it } from 'vitest';
import { calculateFirResponse, designFir, firMagnitudeAt } from './fir';

describe('dsp/fir', () => {
  it('designs a lowpass FIR with ~unity DC gain when normalized', () => {
    const taps = designFir({
      shape: 'Lowpass',
      sampleRate: 48000,
      taps: 101,
      f1: 2000,
      window: 'Hann',
      normalize: true,
    });

    expect(taps).toHaveLength(101);
    const dc = firMagnitudeAt(taps, 48000, 0);
    expect(dc).toBeCloseTo(1, 4);
  });

  it('designs a highpass FIR with ~unity gain at Nyquist when normalized', () => {
    const taps = designFir({
      shape: 'Highpass',
      sampleRate: 48000,
      taps: 101,
      f1: 2000,
      window: 'Hamming',
      normalize: true,
    });

    const nyq = firMagnitudeAt(taps, 48000, 24000);
    expect(nyq).toBeCloseTo(1, 3);
  });

  it('requires f2 for band filters', () => {
    expect(() =>
      designFir({
        shape: 'Bandpass',
        sampleRate: 48000,
        taps: 101,
        f1: 2000,
        window: 'Blackman',
        normalize: true,
      }),
    ).toThrow(/f2 is required/i);
  });

  it('calculateFirResponse matches direct evaluation within tolerance', () => {
    const taps = designFir({
      shape: 'Lowpass',
      sampleRate: 48000,
      taps: 511,
      f1: 2000,
      window: 'Hann',
      normalize: true,
    });

    const freqs = [50, 200, 1000, 2500, 4000, 8000];
    const response = calculateFirResponse(taps, 48000, freqs);

    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i]!;
      const direct = 20 * Math.log10(Math.max(1e-12, firMagnitudeAt(taps, 48000, f)));
      const approx = response[i]!.magnitude;
      expect(Math.abs(approx - direct)).toBeLessThan(1.0);
    }
  });
});
