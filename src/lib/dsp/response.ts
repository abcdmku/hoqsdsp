import type { BiquadParameters } from '../../types';
import { calculateBiquadResponse } from './biquad';

export interface FrequencyPoint {
  frequency: number;
  magnitude: number; // in dB
}

/** Standard frequency points for display (20Hz to 20kHz, logarithmic) */
export const FREQUENCY_POINTS = 512;
export const MIN_FREQUENCY = 20;
export const MAX_FREQUENCY = 20000;

/**
 * Generate logarithmically spaced frequencies
 */
export function generateFrequencies(
  count: number = FREQUENCY_POINTS,
  minFreq: number = MIN_FREQUENCY,
  maxFreq: number = MAX_FREQUENCY
): number[] {
  const frequencies: number[] = [];
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const logStep = (logMax - logMin) / (count - 1);

  for (let i = 0; i < count; i++) {
    frequencies.push(Math.pow(10, logMin + i * logStep));
  }

  return frequencies;
}

/**
 * Calculate frequency response for a single biquad filter
 */
export function calculateFilterResponse(
  params: BiquadParameters,
  sampleRate: number,
  frequencies?: number[]
): FrequencyPoint[] {
  const freqs = frequencies ?? generateFrequencies();

  return freqs.map((frequency) => ({
    frequency,
    magnitude: calculateBiquadResponse(params, frequency, sampleRate),
  }));
}

/**
 * Calculate composite frequency response from multiple filters
 * (Sum magnitudes in dB for series connection)
 */
export function calculateCompositeResponse(
  filters: BiquadParameters[],
  sampleRate: number,
  frequencies?: number[]
): FrequencyPoint[] {
  const freqs = frequencies ?? generateFrequencies();

  return freqs.map((frequency) => {
    const totalMagnitude = filters.reduce((sum, params) => {
      return sum + calculateBiquadResponse(params, frequency, sampleRate);
    }, 0);

    return {
      frequency,
      magnitude: totalMagnitude,
    };
  });
}

/**
 * Format frequency for display (e.g., "1.0k", "100", "20k")
 */
export function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
  }
  return freq.toFixed(0);
}

/**
 * Format gain for display (e.g., "+3.0", "-6.0", "0.0")
 */
export function formatGain(gain: number): string {
  const sign = gain > 0 ? '+' : '';
  return `${sign}${gain.toFixed(1)}`;
}
