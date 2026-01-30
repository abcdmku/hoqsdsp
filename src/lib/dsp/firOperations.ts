import { generateFirWindow, type FirWindowType } from './fir';

export function estimateFirLinearPhaseLatencyMs(tapCount: number, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  if (!Number.isFinite(tapCount) || tapCount <= 0) return 0;
  return ((tapCount - 1) / 2 / sampleRate) * 1000;
}

export function findFirPeak(values: number[]): { peak: number; index: number } {
  let peak = 0;
  let index = 0;

  for (let i = 0; i < values.length; i++) {
    const abs = Math.abs(values[i] ?? 0);
    if (abs > peak) {
      peak = abs;
      index = i;
    }
  }

  return { peak, index };
}

export function scaleFir(values: number[], scale: number): number[] {
  if (!Number.isFinite(scale)) return values.slice();
  if (scale === 1) return values.slice();
  return values.map((v) => (v ?? 0) * scale);
}

export function invertFirPolarity(values: number[]): number[] {
  return values.map((v) => -(v ?? 0));
}

export function normalizeFirPeak(values: number[]): number[] {
  const { peak } = findFirPeak(values);
  if (peak <= 0) return values.slice();
  return scaleFir(values, 1 / peak);
}

export function applyFirGainDb(values: number[], gainDb: number): number[] {
  if (!Number.isFinite(gainDb) || gainDb === 0) return values.slice();
  const scale = Math.pow(10, gainDb / 20);
  return scaleFir(values, scale);
}

export function shiftFir(values: number[], shiftSamples: number): number[] {
  const n = values.length;
  if (n === 0) return [];

  const shift = Math.trunc(shiftSamples);
  if (shift === 0) return values.slice();

  const out = new Array<number>(n).fill(0);

  if (shift > 0) {
    for (let i = 0; i < n - shift; i++) {
      out[i + shift] = values[i] ?? 0;
    }
  } else {
    const s = -shift;
    for (let i = 0; i < n - s; i++) {
      out[i] = values[i + s] ?? 0;
    }
  }

  return out;
}

export function clampOddInt(value: number, { min = 1, max }: { min?: number; max?: number } = {}): number {
  if (!Number.isFinite(value)) return min;
  let n = Math.trunc(value);
  if (n < min) n = min;
  if (max !== undefined && n > max) n = max;
  // Prefer odd length (integer-sample group delay)
  if (n % 2 === 0) n += 1;
  if (max !== undefined && n > max) n = max % 2 === 0 ? max - 1 : max;
  if (n < min) n = min % 2 === 0 ? min + 1 : min;
  return n;
}

export function resizeFirCentered(
  values: number[],
  targetLength: number,
  options: { window?: FirWindowType; kaiserBeta?: number } = {},
): number[] {
  const src = values;
  const srcLen = src.length;
  const nextLen = clampOddInt(targetLength, { min: 1 });

  if (srcLen === 0) return new Array<number>(nextLen).fill(0);

  const srcCenter = Math.floor((srcLen - 1) / 2);
  const dstCenter = Math.floor((nextLen - 1) / 2);
  const srcStart = srcCenter - dstCenter;

  const out = new Array<number>(nextLen);
  for (let i = 0; i < nextLen; i++) {
    const srcIndex = srcStart + i;
    out[i] = srcIndex >= 0 && srcIndex < srcLen ? (src[srcIndex] ?? 0) : 0;
  }

  const window = options.window ?? 'Rectangular';
  if (window !== 'Rectangular') {
    const w = generateFirWindow(nextLen, window, options.kaiserBeta);
    for (let i = 0; i < out.length; i++) {
      out[i] = (out[i] ?? 0) * (w[i] ?? 1);
    }
  }

  return out;
}

