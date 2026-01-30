import type { FrequencyPoint } from './response';
import { generateFrequencies } from './response';
import { fftRadix2, nextPowerOfTwo } from './fft';

export type FirWindowType = 'Rectangular' | 'Hann' | 'Hamming' | 'Blackman' | 'Kaiser';
export type FirShape = 'Lowpass' | 'Highpass' | 'Bandpass' | 'Bandstop';

export interface ComplexFrequencyPoint {
  frequency: number;
  re: number;
  im: number;
}

export interface FirDesignOptions {
  shape: FirShape;
  sampleRate: number;
  taps: number;
  /**
   * Cutoff frequency in Hz for Lowpass/Highpass.
   * Low cutoff (Hz) for Bandpass/Bandstop.
   */
  f1: number;
  /** High cutoff (Hz) for Bandpass/Bandstop. */
  f2?: number;
  window: FirWindowType;
  /** Kaiser beta parameter (only used when window='Kaiser'). Typical range: 4-12. */
  kaiserBeta?: number;
  /** Scale to unity gain in the passband (recommended). */
  normalize?: boolean;
}

export function designFir(options: FirDesignOptions): number[] {
  const taps = Math.max(1, Math.floor(options.taps));
  const sampleRate = options.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('sampleRate must be > 0');
  }
  if (!Number.isFinite(options.f1) || options.f1 <= 0) {
    throw new Error('f1 must be > 0');
  }

  const nyquist = sampleRate / 2;
  const f1 = clamp(options.f1, 0, nyquist);
  const f2 = options.f2 !== undefined ? clamp(options.f2, 0, nyquist) : undefined;

  const fc1 = f1 / sampleRate;
  const fc2 = f2 !== undefined ? f2 / sampleRate : undefined;

  const m = (taps - 1) / 2;

  const window = generateFirWindow(taps, options.window, options.kaiserBeta);

  const lp = (fc: number): number[] => {
    const h = new Array<number>(taps);
    for (let n = 0; n < taps; n++) {
      const x = n - m;
      h[n] = 2 * fc * sinc(2 * fc * x);
    }
    return h;
  };

  const delta = (): number[] => {
    const h = new Array<number>(taps).fill(0);
    const center = Math.round(m);
    if (center >= 0 && center < taps) h[center] = 1;
    return h;
  };

  let ideal: number[];
  switch (options.shape) {
    case 'Lowpass': {
      ideal = lp(fc1);
      break;
    }
    case 'Highpass': {
      const d = delta();
      const l = lp(fc1);
      ideal = d.map((v, i) => v - (l[i] ?? 0));
      break;
    }
    case 'Bandpass': {
      if (fc2 === undefined) throw new Error('f2 is required for Bandpass');
      const lo = Math.min(fc1, fc2);
      const hi = Math.max(fc1, fc2);
      const lhi = lp(hi);
      const llo = lp(lo);
      ideal = lhi.map((v, i) => v - (llo[i] ?? 0));
      break;
    }
    case 'Bandstop': {
      if (fc2 === undefined) throw new Error('f2 is required for Bandstop');
      const lo = Math.min(fc1, fc2);
      const hi = Math.max(fc1, fc2);
      const d = delta();
      const lhi = lp(hi);
      const llo = lp(lo);
      const bp = lhi.map((v, i) => v - (llo[i] ?? 0));
      ideal = d.map((v, i) => v - (bp[i] ?? 0));
      break;
    }
    default:
      throw new Error(`Unsupported FIR shape: ${String(options.shape)}`);
  }

  // Apply window
  const tapsOut = ideal.map((v, i) => v * (window[i] ?? 1));

  if (options.normalize === true) {
    const refFreq =
      options.shape === 'Lowpass' || options.shape === 'Bandstop'
        ? 0
        : options.shape === 'Highpass'
          ? nyquist
          : (f1 + (f2 ?? f1)) / 2;

    const mag = firMagnitudeAt(tapsOut, sampleRate, refFreq);
    if (mag > 0) {
      const scale = 1 / mag;
      for (let i = 0; i < tapsOut.length; i++) {
        tapsOut[i] = (tapsOut[i] ?? 0) * scale;
      }
    }
  }

  return tapsOut;
}

export function calculateFirResponse(
  taps: number[],
  sampleRate: number,
  frequencies: number[] = generateFrequencies(256),
): FrequencyPoint[] {
  if (taps.length === 0) {
    return frequencies.map((frequency) => ({ frequency, magnitude: 0 }));
  }

  // Use an FFT-based response for performance with longer FIRs.
  // We sample the FFT bins and linearly interpolate magnitude for arbitrary frequencies.
  const nfft = nextPowerOfTwo(Math.max(2048, taps.length));
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);

  for (let i = 0; i < taps.length; i++) {
    re[i] = taps[i] ?? 0;
  }

  fftRadix2(re, im, false);

  const nyquistBin = nfft / 2;
  const safeSampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 48000;

  return frequencies.map((frequency) => {
    const bin = (Math.max(0, frequency) / safeSampleRate) * nfft;
    const clamped = Math.max(0, Math.min(nyquistBin, bin));
    const k0 = Math.floor(clamped);
    const k1 = Math.min(nyquistBin, k0 + 1);
    const frac = clamped - k0;

    const mag0 = Math.hypot(re[k0] ?? 0, im[k0] ?? 0);
    const mag1 = Math.hypot(re[k1] ?? 0, im[k1] ?? 0);
    const mag = mag0 + (mag1 - mag0) * frac;

    const db = 20 * Math.log10(Math.max(1e-12, mag));
    return { frequency, magnitude: db };
  });
}

export function calculateFirComplexResponse(
  taps: number[],
  sampleRate: number,
  frequencies: number[] = generateFrequencies(256),
): ComplexFrequencyPoint[] {
  if (taps.length === 0) {
    return frequencies.map((frequency) => ({ frequency, re: 0, im: 0 }));
  }

  const nfft = nextPowerOfTwo(Math.max(2048, taps.length));
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);

  for (let i = 0; i < taps.length; i++) {
    re[i] = taps[i] ?? 0;
  }

  fftRadix2(re, im, false);

  const nyquistBin = nfft / 2;
  const safeSampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 48000;

  return frequencies.map((frequency) => {
    const bin = (Math.max(0, frequency) / safeSampleRate) * nfft;
    const clamped = Math.max(0, Math.min(nyquistBin, bin));
    const k0 = Math.floor(clamped);
    const k1 = Math.min(nyquistBin, k0 + 1);
    const frac = clamped - k0;

    const re0 = re[k0] ?? 0;
    const im0 = im[k0] ?? 0;
    const re1 = re[k1] ?? 0;
    const im1 = im[k1] ?? 0;

    // Interpolate in polar form to avoid artificial "notches" when phase rotates quickly
    // between FFT bins (common for long linear-phase/all-pass FIRs).
    const mag0 = Math.hypot(re0, im0);
    const mag1 = Math.hypot(re1, im1);
    const mag = mag0 + (mag1 - mag0) * frac;

    const phase0 = Math.atan2(im0, re0);
    let phase1 = Math.atan2(im1, re1);
    const d = phase1 - phase0;
    if (d > Math.PI) phase1 -= 2 * Math.PI;
    else if (d < -Math.PI) phase1 += 2 * Math.PI;

    const phase = phase0 + (phase1 - phase0) * frac;

    return {
      frequency,
      re: mag * Math.cos(phase),
      im: mag * Math.sin(phase),
    };
  });
}

export function firMagnitudeAt(taps: number[], sampleRate: number, frequency: number): number {
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

    // Next (cos, sin) via rotation by w
    const nextCos = cosN * cosW - sinN * sinW;
    const nextSin = sinN * cosW + cosN * sinW;
    cosN = nextCos;
    sinN = nextSin;
  }

  return Math.hypot(re, im);
}

function sinc(x: number): number {
  if (x === 0) return 1;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

export function generateFirWindow(length: number, type: FirWindowType, kaiserBeta?: number): number[] {
  if (length <= 1) return [1];

  switch (type) {
    case 'Rectangular':
      return new Array<number>(length).fill(1);
    case 'Hann':
      return makeCosineWindow(length, 0.5, 0.5);
    case 'Hamming':
      return makeCosineWindow(length, 0.54, 0.46);
    case 'Blackman':
      return makeBlackmanWindow(length);
    case 'Kaiser':
      return makeKaiserWindow(length, kaiserBeta ?? 8.6);
    default:
      return new Array<number>(length).fill(1);
  }
}

function makeCosineWindow(length: number, a0: number, a1: number): number[] {
  const n1 = length - 1;
  const w = new Array<number>(length);
  for (let n = 0; n < length; n++) {
    w[n] = a0 - a1 * Math.cos((2 * Math.PI * n) / n1);
  }
  return w;
}

function makeBlackmanWindow(length: number): number[] {
  const n1 = length - 1;
  const w = new Array<number>(length);
  for (let n = 0; n < length; n++) {
    const a = (2 * Math.PI * n) / n1;
    w[n] = 0.42 - 0.5 * Math.cos(a) + 0.08 * Math.cos(2 * a);
  }
  return w;
}

function makeKaiserWindow(length: number, beta: number): number[] {
  const n1 = length - 1;
  const denom = besselI0(beta);
  const w = new Array<number>(length);

  for (let n = 0; n < length; n++) {
    const x = (2 * n) / n1 - 1; // -1..1
    const arg = beta * Math.sqrt(Math.max(0, 1 - x * x));
    w[n] = besselI0(arg) / denom;
  }

  return w;
}

// Approximation of modified Bessel function I0(x) using a truncated series.
function besselI0(x: number): number {
  const ax = Math.abs(x);
  let sum = 1;
  let y = 1;
  let k = 1;

  // Series: I0(x) = sum_{k=0..inf} ( (x^2/4)^k / (k!)^2 )
  // Term recursion: term_k = term_{k-1} * (x^2/4) / (k^2)
  const x2Over4 = (ax * ax) / 4;
  while (k < 50) {
    y *= x2Over4 / (k * k);
    sum += y;
    if (y < 1e-12 * sum) break;
    k += 1;
  }

  return sum;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
