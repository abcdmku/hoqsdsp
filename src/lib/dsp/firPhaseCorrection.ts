import type { FilterConfig } from '../../types';
import { clampOddInt } from './firOperations';
import { fftRadix2, nextPowerOfTwo } from './fft';
import { generateFirWindow, type FirWindowType } from './fir';
import { complexAbs, complexConj, complexNormalize } from './complex';
import { calculateFilterChainComplexResponse } from './filterChain';

export interface FirPhaseCorrectionBand {
  lowHz: number;
  highHz: number;
  transitionOctaves: number;
}

export interface FirPhaseCorrectionMagnitudeGate {
  /** Below this magnitude (in dB), phase is ignored and no correction is applied. */
  thresholdDb: number;
  /** Soft transition width (dB) to avoid hard edges. */
  transitionDb: number;
}

export interface FirPhaseCorrectionDesignOptions {
  sampleRate: number;
  /** If set, taps are derived from this latency budget. */
  maxLatencyMs?: number;
  /** If set, overrides maxLatencyMs. Prefer odd tap counts. */
  taps?: number;
  window: FirWindowType;
  kaiserBeta?: number;
  normalize?: boolean;
  band: FirPhaseCorrectionBand;
  magnitudeGate: FirPhaseCorrectionMagnitudeGate;
  filters: FilterConfig[];
}

export interface FirPhaseCorrectionDesignResult {
  taps: number[];
  tapsUsed: number;
  delaySamples: number;
  fftSize: number;
  warnings: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function weightForBand(freqHz: number, band: FirPhaseCorrectionBand, nyquistHz: number): number {
  const low = Math.max(0, band.lowHz);
  const high = Math.max(low, Math.min(band.highHz, nyquistHz));
  if (high <= 0) return 0;

  const tOct = Math.max(0, band.transitionOctaves);
  if (tOct === 0) {
    return freqHz >= low && freqHz <= high ? 1 : 0;
  }

  const lowStart = low <= 0 ? 0 : low / Math.pow(2, tOct);
  const highEnd = Math.min(nyquistHz, high * Math.pow(2, tOct));

  const wLow = low <= 0 ? 1 : smoothstep(lowStart, low, freqHz);
  const wHigh = high >= nyquistHz ? 1 : 1 - smoothstep(high, highEnd, freqHz);
  return clamp(wLow * wHigh, 0, 1);
}

function weightForMagnitude(mag: number, gate: FirPhaseCorrectionMagnitudeGate): number {
  const magDb = 20 * Math.log10(Math.max(1e-12, mag));
  const tDb = Math.max(0, gate.transitionDb);
  if (tDb === 0) return magDb >= gate.thresholdDb ? 1 : 0;
  return smoothstep(gate.thresholdDb - tDb, gate.thresholdDb, magDb);
}

export function designFirPhaseCorrection(options: FirPhaseCorrectionDesignOptions): FirPhaseCorrectionDesignResult {
  const warnings: string[] = [];

  const sampleRate = options.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('sampleRate must be > 0');
  }

  const nyquist = sampleRate / 2;

  let tapsUsed: number;
  if (options.taps !== undefined) {
    tapsUsed = clampOddInt(options.taps, { min: 1, max: 262143 });
  } else {
    const maxLatencyMs = Math.max(0, options.maxLatencyMs ?? 0);
    const maxDelaySamples = Math.floor((maxLatencyMs / 1000) * sampleRate);
    tapsUsed = clampOddInt(maxDelaySamples * 2 + 1, { min: 1, max: 262143 });
  }

  const delaySamples = Math.floor((tapsUsed - 1) / 2);

  if (tapsUsed <= 1 || options.filters.length === 0) {
    return { taps: [1], tapsUsed: 1, delaySamples: 0, fftSize: 0, warnings };
  }

  const band: FirPhaseCorrectionBand = {
    lowHz: clamp(options.band.lowHz, 0, nyquist),
    highHz: clamp(options.band.highHz, 0, nyquist),
    transitionOctaves: Math.max(0, options.band.transitionOctaves),
  };
  if (band.highHz < band.lowHz) {
    warnings.push('Correction band highHz was below lowHz; swapped.');
    const tmp = band.lowHz;
    band.lowHz = band.highHz;
    band.highHz = tmp;
  }

  const magnitudeGate: FirPhaseCorrectionMagnitudeGate = {
    thresholdDb: options.magnitudeGate.thresholdDb,
    transitionDb: Math.max(0, options.magnitudeGate.transitionDb),
  };

  // Frequency-sampling design: we build a unit-magnitude spectrum on an FFT grid and IFFT to taps.
  // Using an FFT size close to `tapsUsed` can produce very large magnitude ripple when the desired
  // phase varies rapidly (especially with crossover-like filters). Oversampling the FFT grid
  // gives the time-domain truncation/windowing more room and substantially improves the result.
  const oversample =
    tapsUsed <= 8192 ? 16 :
    tapsUsed <= 32768 ? 8 :
    tapsUsed <= 131072 ? 4 :
    tapsUsed <= 262144 ? 2 : 1;

  const requestedFft = Math.max(2048, tapsUsed * oversample);
  const maxFftSize = 1_048_576; // safety bound for UI responsiveness/memory
  let fftSize = nextPowerOfTwo(requestedFft);
  if (fftSize > maxFftSize) {
    warnings.push(`FFT size capped at ${maxFftSize} for performance; ripple may increase.`);
    fftSize = maxFftSize;
  }
  const specRe = new Float64Array(fftSize);
  const specIm = new Float64Array(fftSize);

  const nyquistBin = fftSize / 2;

  // We always include the target linear-phase delay as the "baseline" correction.
  // Phase correction for the selected filters is blended in via `weight`.
  //
  // Important: blending the full delayed inverse (delay * inversePhase) against identity
  // can create extreme phase jumps (especially for large delays), which leads to very
  // "glitchy" spectra and poor time-domain truncation. Instead, we blend only the
  // *excess* phase term and then apply the delay for all frequencies.

  for (let k = 0; k <= nyquistBin; k++) {
    const freqHz = (k / fftSize) * sampleRate;
    const w = (2 * Math.PI * freqHz) / sampleRate;

    const pipe = calculateFilterChainComplexResponse(options.filters, freqHz, sampleRate);
    const mag = complexAbs(pipe);

    const bandWeight = weightForBand(freqHz, band, nyquist);
    const magWeight = weightForMagnitude(mag, magnitudeGate);
    // Force DC/Nyquist bins to be purely real to keep a real impulse response.
    // Any real FIR has H(0) and H(pi) as real values.
    const weight = (k === 0 || k === nyquistBin) ? 0 : bandWeight * magWeight;

    const invPhase = complexNormalize(complexConj(pipe));
    // Blend using the principal angle to avoid unintentionally introducing
    // extra 2π wraps (which can turn into large unintended delays when scaled
    // in the transition regions).
    const invPhaseAngle = Math.atan2(invPhase.im, invPhase.re);

    const delayAngle = -w * delaySamples;
    const blendedAngle = invPhaseAngle * weight;
    const totalAngle = delayAngle + blendedAngle;

    // Unit-magnitude correction spectrum (delay + blended inverse-phase).
    specRe[k] = Math.cos(totalAngle);
    specIm[k] = (k === 0 || k === nyquistBin) ? 0 : Math.sin(totalAngle);
  }

  // Hermitian symmetry for real impulse response
  for (let k = 1; k < nyquistBin; k++) {
    specRe[fftSize - k] = specRe[k] ?? 0;
    specIm[fftSize - k] = -(specIm[k] ?? 0);
  }

  fftRadix2(specRe, specIm, true);

  const taps = new Array<number>(tapsUsed);
  const window = generateFirWindow(tapsUsed, options.window, options.window === 'Kaiser' ? options.kaiserBeta : undefined);

  // Center the extracted tap window around the peak energy of the IFFT result.
  // This significantly reduces magnitude ripple after truncation/windowing for
  // phase-only (all-pass-like) corrections where energy is not naturally centered.
  let peakIndex = 0;
  let peakValue = 0;
  for (let i = 0; i < fftSize; i++) {
    const v = Math.abs(specRe[i] ?? 0);
    if (v > peakValue) {
      peakValue = v;
      peakIndex = i;
    }
  }
  const startIndex = ((peakIndex - delaySamples) % fftSize + fftSize) % fftSize;

  for (let i = 0; i < tapsUsed; i++) {
    const idx = (startIndex + i) % fftSize;
    taps[i] = (specRe[idx] ?? 0) * (window[i] ?? 1);
  }

  if (options.normalize !== false) {
    // Normalize DC gain to unity (sum of taps).
    let sum = 0;
    for (let i = 0; i < taps.length; i++) sum += taps[i] ?? 0;
    if (Math.abs(sum) > 1e-12) {
      const scale = 1 / sum;
      for (let i = 0; i < taps.length; i++) taps[i] = (taps[i] ?? 0) * scale;
    } else {
      warnings.push('Normalization skipped (DC gain ~ 0).');
    }
  }

  return { taps, tapsUsed, delaySamples, fftSize, warnings };
}
