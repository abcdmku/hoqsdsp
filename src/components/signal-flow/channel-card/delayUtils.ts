export type DelayDisplayUnit = 'ms' | 'ft' | 'in' | 'cm' | 'm';

const SPEED_OF_SOUND_MM_PER_MS = 343; // ~343 m/s
const MM_PER_IN = 25.4;
const MM_PER_FT = 12 * MM_PER_IN;
const MM_PER_CM = 10;
const MM_PER_M = 1000;

export function delayDistanceMmFromValue(value: number, unit: Exclude<DelayDisplayUnit, 'ms'>): number {
  switch (unit) {
    case 'ft':
      return value * MM_PER_FT;
    case 'in':
      return value * MM_PER_IN;
    case 'cm':
      return value * MM_PER_CM;
    case 'm':
      return value * MM_PER_M;
    default:
      return value;
  }
}

export function delayDistanceValueFromMm(mm: number, unit: Exclude<DelayDisplayUnit, 'ms'>): number {
  switch (unit) {
    case 'ft':
      return mm / MM_PER_FT;
    case 'in':
      return mm / MM_PER_IN;
    case 'cm':
      return mm / MM_PER_CM;
    case 'm':
      return mm / MM_PER_M;
    default:
      return mm;
  }
}

export function delayMsFromSamples(samples: number, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  return (samples * 1000) / sampleRate;
}

export function delayDistanceMmFromMs(ms: number): number {
  return ms * SPEED_OF_SOUND_MM_PER_MS;
}

export function delayMsFromDistanceMm(mm: number): number {
  return mm / SPEED_OF_SOUND_MM_PER_MS;
}
