import { describe, it, expect } from 'vitest';
import {
  generateFrequencies,
  calculateFilterResponse,
  calculateCompositeResponse,
  formatFrequency,
  formatGain,
  FREQUENCY_POINTS,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
} from './response';
import type { BiquadParameters } from '../../types';

describe('Constants', () => {
  it('should have correct default values', () => {
    expect(FREQUENCY_POINTS).toBe(512);
    expect(MIN_FREQUENCY).toBe(20);
    expect(MAX_FREQUENCY).toBe(20000);
  });
});

describe('generateFrequencies', () => {
  it('should generate correct number of frequency points', () => {
    const frequencies = generateFrequencies();
    expect(frequencies).toHaveLength(512);
  });

  it('should generate custom number of points', () => {
    const frequencies = generateFrequencies(100);
    expect(frequencies).toHaveLength(100);
  });

  it('should start at minimum frequency', () => {
    const frequencies = generateFrequencies();
    expect(frequencies[0]!).toBeCloseTo(20, 0);
  });

  it('should end at maximum frequency', () => {
    const frequencies = generateFrequencies();
    expect(frequencies[frequencies.length - 1]!).toBeCloseTo(20000, 0);
  });

  it('should be logarithmically spaced', () => {
    const frequencies = generateFrequencies(3, 10, 1000);
    // For log spacing: 10, 100, 1000 (each step is 10x)
    expect(frequencies[0]!).toBeCloseTo(10, 0);
    expect(frequencies[1]!).toBeCloseTo(100, 0);
    expect(frequencies[2]!).toBeCloseTo(1000, 0);
  });

  it('should handle custom frequency range', () => {
    const frequencies = generateFrequencies(10, 100, 10000);
    expect(frequencies[0]!).toBeCloseTo(100, 0);
    expect(frequencies[frequencies.length - 1]!).toBeCloseTo(10000, 0);
  });

  it('should handle two frequency points at extremes', () => {
    const frequencies = generateFrequencies(2, 100, 10000);
    expect(frequencies).toHaveLength(2);
    expect(frequencies[0]!).toBeCloseTo(100, 0);
    expect(frequencies[1]!).toBeCloseTo(10000, 0);
  });

  it('should have monotonically increasing frequencies', () => {
    const frequencies = generateFrequencies();
    for (let i = 1; i < frequencies.length; i++) {
      expect(frequencies[i]!).toBeGreaterThan(frequencies[i - 1]!);
    }
  });
});

describe('calculateFilterResponse', () => {
  const sampleRate = 48000;

  it('should return response for each frequency point', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };
    const response = calculateFilterResponse(params, sampleRate);

    expect(response).toHaveLength(FREQUENCY_POINTS);
  });

  it('should return frequency and magnitude for each point', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 1.0 };
    const response = calculateFilterResponse(params, sampleRate);

    response.forEach((point) => {
      expect(point).toHaveProperty('frequency');
      expect(point).toHaveProperty('magnitude');
      expect(typeof point.frequency).toBe('number');
      expect(typeof point.magnitude).toBe('number');
    });
  });

  it('should use custom frequency array if provided', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };
    const customFreqs = [100, 1000, 10000];
    const response = calculateFilterResponse(params, sampleRate, customFreqs);

    expect(response).toHaveLength(3);
    expect(response[0]!.frequency).toBe(100);
    expect(response[1]!.frequency).toBe(1000);
    expect(response[2]!.frequency).toBe(10000);
  });

  it('should calculate correct lowpass response', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };
    const response = calculateFilterResponse(params, sampleRate, [100, 1000, 10000]);

    // Lowpass: high magnitude at low freq, -3dB at cutoff, low at high freq
    expect(response[0]!.magnitude).toBeGreaterThan(-3);
    expect(response[1]!.magnitude).toBeCloseTo(-3, 1);
    expect(response[2]!.magnitude).toBeLessThan(-20);
  });

  it('should calculate correct peaking response', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 2.0 };
    const response = calculateFilterResponse(params, sampleRate, [100, 1000, 10000]);

    // Peaking: boost at center frequency
    expect(response[1]!.magnitude).toBeCloseTo(6, 1);
    expect(response[0]!.magnitude).toBeCloseTo(0, 1);
    expect(response[2]!.magnitude).toBeCloseTo(0, 1);
  });
});

describe('calculateCompositeResponse', () => {
  const sampleRate = 48000;

  it('should combine multiple filter responses', () => {
    const filters: BiquadParameters[] = [
      { type: 'Peaking', freq: 1000, gain: 6, q: 1.0 },
      { type: 'Peaking', freq: 1000, gain: 3, q: 1.0 },
    ];

    const response = calculateCompositeResponse(filters, sampleRate, [1000]);

    // Combined gain at 1kHz should be ~9dB (6 + 3)
    expect(response[0]!.magnitude).toBeCloseTo(9, 1);
  });

  it('should return flat response for empty filter array', () => {
    const response = calculateCompositeResponse([], sampleRate, [100, 1000, 10000]);

    response.forEach((point) => {
      expect(point.magnitude).toBe(0);
    });
  });

  it('should return correct number of frequency points', () => {
    const filters: BiquadParameters[] = [
      { type: 'Lowpass', freq: 1000, q: 0.707 },
    ];

    const response = calculateCompositeResponse(filters, sampleRate);
    expect(response).toHaveLength(FREQUENCY_POINTS);
  });

  it('should use custom frequency array if provided', () => {
    const filters: BiquadParameters[] = [
      { type: 'Highpass', freq: 100, q: 0.707 },
    ];
    const customFreqs = [50, 100, 200];
    const response = calculateCompositeResponse(filters, sampleRate, customFreqs);

    expect(response).toHaveLength(3);
    expect(response[0]!.frequency).toBe(50);
    expect(response[1]!.frequency).toBe(100);
    expect(response[2]!.frequency).toBe(200);
  });

  it('should handle complex filter chains', () => {
    const filters: BiquadParameters[] = [
      { type: 'Highpass', freq: 80, q: 0.707 },
      { type: 'Peaking', freq: 200, gain: 3, q: 1.0 },
      { type: 'Peaking', freq: 1000, gain: -2, q: 2.0 },
      { type: 'Peaking', freq: 5000, gain: 4, q: 1.5 },
      { type: 'Lowpass', freq: 16000, q: 0.707 },
    ];

    const response = calculateCompositeResponse(filters, sampleRate);

    // Should have valid response points
    expect(response).toHaveLength(FREQUENCY_POINTS);
    response.forEach((point) => {
      expect(point.frequency).toBeGreaterThan(0);
      expect(Number.isFinite(point.magnitude)).toBe(true);
    });
  });

  it('should sum gains additively in dB domain', () => {
    // Two +6dB boosts at same frequency should give ~+12dB
    const filters: BiquadParameters[] = [
      { type: 'Peaking', freq: 1000, gain: 6, q: 10 },
      { type: 'Peaking', freq: 1000, gain: 6, q: 10 },
    ];

    const response = calculateCompositeResponse(filters, sampleRate, [1000]);
    expect(response[0]!.magnitude).toBeCloseTo(12, 1);
  });
});

describe('formatFrequency', () => {
  it('should format frequencies below 1kHz without suffix', () => {
    expect(formatFrequency(20)).toBe('20');
    expect(formatFrequency(100)).toBe('100');
    expect(formatFrequency(500)).toBe('500');
    expect(formatFrequency(999)).toBe('999');
  });

  it('should format frequencies at and above 1kHz with k suffix', () => {
    expect(formatFrequency(1000)).toBe('1.0k');
    expect(formatFrequency(2000)).toBe('2.0k');
    expect(formatFrequency(5000)).toBe('5.0k');
  });

  it('should format frequencies above 10kHz without decimal', () => {
    expect(formatFrequency(10000)).toBe('10k');
    expect(formatFrequency(15000)).toBe('15k');
    expect(formatFrequency(20000)).toBe('20k');
  });

  it('should handle edge cases around 10kHz', () => {
    expect(formatFrequency(9999)).toBe('10.0k');
    expect(formatFrequency(10001)).toBe('10k');
  });

  it('should handle fractional frequencies', () => {
    expect(formatFrequency(1234)).toBe('1.2k');
    expect(formatFrequency(5678)).toBe('5.7k');
  });
});

describe('formatGain', () => {
  it('should add + sign for positive gains', () => {
    expect(formatGain(3)).toBe('+3.0');
    expect(formatGain(6)).toBe('+6.0');
    expect(formatGain(12)).toBe('+12.0');
  });

  it('should not add + sign for zero gain', () => {
    expect(formatGain(0)).toBe('0.0');
  });

  it('should show - sign for negative gains', () => {
    expect(formatGain(-3)).toBe('-3.0');
    expect(formatGain(-6)).toBe('-6.0');
    expect(formatGain(-12)).toBe('-12.0');
  });

  it('should format with one decimal place', () => {
    expect(formatGain(3.5)).toBe('+3.5');
    expect(formatGain(-2.25)).toBe('-2.3');
    expect(formatGain(0.1)).toBe('+0.1');
  });

  it('should handle small values near zero', () => {
    expect(formatGain(0.05)).toBe('+0.1');
    expect(formatGain(-0.05)).toBe('-0.1');
  });
});

describe('Performance', () => {
  const sampleRate = 48000;

  it('should generate frequencies quickly', () => {
    const start = performance.now();
    generateFrequencies(512);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // Should be under 10ms
  });

  it('should calculate filter response in under 16ms', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 1.0 };

    const start = performance.now();
    calculateFilterResponse(params, sampleRate);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(16);
  });

  it('should calculate composite response for 5 filters in under 50ms', () => {
    const filters: BiquadParameters[] = [
      { type: 'Highpass', freq: 80, q: 0.707 },
      { type: 'Peaking', freq: 200, gain: 3, q: 1.0 },
      { type: 'Peaking', freq: 1000, gain: -2, q: 2.0 },
      { type: 'Peaking', freq: 5000, gain: 4, q: 1.5 },
      { type: 'Lowpass', freq: 16000, q: 0.707 },
    ];

    const start = performance.now();
    calculateCompositeResponse(filters, sampleRate);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});
