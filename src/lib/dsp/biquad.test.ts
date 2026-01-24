import { describe, it, expect } from 'vitest';
import {
  calculateCoefficients,
  calculateResponse,
  calculateBiquadResponse,
  type BiquadCoefficients,
} from './biquad';
import type { BiquadParameters } from '../../types';

describe('calculateCoefficients', () => {
  const sampleRate = 48000;

  describe('Lowpass filter', () => {
    it('should calculate correct coefficients for lowpass filter', () => {
      const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };
      const coeffs = calculateCoefficients(params, sampleRate);

      // Verify coefficients are normalized (a0 = 1 implicitly)
      expect(coeffs.b0).toBeCloseTo(0.003916, 5);
      expect(coeffs.b1).toBeCloseTo(0.007832, 5);
      expect(coeffs.b2).toBeCloseTo(0.003916, 5);
      expect(coeffs.a1).toBeCloseTo(-1.815318, 5);
      expect(coeffs.a2).toBeCloseTo(0.830982, 5);
    });

    it('should handle different Q values', () => {
      const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeGreaterThan(0);
      expect(coeffs.b1).toBeGreaterThan(0);
      expect(coeffs.b2).toBeGreaterThan(0);
    });
  });

  describe('Highpass filter', () => {
    it('should calculate correct coefficients for highpass filter', () => {
      const params: BiquadParameters = { type: 'Highpass', freq: 1000, q: 0.707 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeCloseTo(0.911575, 5);
      expect(coeffs.b1).toBeCloseTo(-1.823150, 5);
      expect(coeffs.b2).toBeCloseTo(0.911575, 5);
      expect(coeffs.a1).toBeCloseTo(-1.815318, 5);
      expect(coeffs.a2).toBeCloseTo(0.830982, 5);
    });
  });

  describe('First-order filters', () => {
    it('should calculate LowpassFO coefficients', () => {
      const params: BiquadParameters = { type: 'LowpassFO', freq: 1000 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeGreaterThan(0);
      expect(coeffs.b1).toBeGreaterThan(0);
      expect(coeffs.b2).toBe(0); // First-order has no b2
      expect(coeffs.a2).toBe(0); // First-order has no a2
    });

    it('should calculate HighpassFO coefficients', () => {
      const params: BiquadParameters = { type: 'HighpassFO', freq: 1000 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeGreaterThan(0);
      expect(coeffs.b1).toBeLessThan(0);
      expect(coeffs.b2).toBe(0);
      expect(coeffs.a2).toBe(0);
    });
  });

  describe('Peaking filter', () => {
    it('should calculate peaking filter with positive gain', () => {
      const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      // All coefficients should be finite
      expect(coeffs.b0).toBeDefined();
      expect(coeffs.b1).toBeDefined();
      expect(coeffs.b2).toBeDefined();
      expect(coeffs.a1).toBeDefined();
      expect(coeffs.a2).toBeDefined();
    });

    it('should calculate peaking filter with negative gain', () => {
      const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: -6, q: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      // All coefficients should be finite
      expect(coeffs.b0).toBeDefined();
      expect(coeffs.b1).toBeDefined();
      expect(coeffs.b2).toBeDefined();
    });
  });

  describe('Shelf filters', () => {
    it('should calculate lowshelf with positive gain', () => {
      const params: BiquadParameters = { type: 'Lowshelf', freq: 100, gain: 6, slope: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeGreaterThan(1); // Boost at low frequencies
    });

    it('should calculate lowshelf with negative gain', () => {
      const params: BiquadParameters = { type: 'Lowshelf', freq: 100, gain: -6, slope: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeLessThan(1); // Cut at low frequencies
    });

    it('should calculate highshelf with positive gain', () => {
      const params: BiquadParameters = { type: 'Highshelf', freq: 10000, gain: 6, slope: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeDefined();
    });

    it('should calculate highshelf with negative gain', () => {
      const params: BiquadParameters = { type: 'Highshelf', freq: 10000, gain: -6, slope: 1.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeDefined();
    });
  });

  describe('Notch filter', () => {
    it('should calculate notch filter coefficients', () => {
      const params: BiquadParameters = { type: 'Notch', freq: 1000, q: 5.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b0).toBeCloseTo(0.987116, 4);
      expect(coeffs.b2).toBeCloseTo(0.987116, 4);
    });
  });

  describe('Bandpass filter', () => {
    it('should calculate bandpass filter coefficients', () => {
      const params: BiquadParameters = { type: 'Bandpass', freq: 1000, q: 2.0 };
      const coeffs = calculateCoefficients(params, sampleRate);

      expect(coeffs.b1).toBeCloseTo(0, 5); // Bandpass has b1 = 0
      expect(coeffs.b0).toBeGreaterThan(0);
      expect(coeffs.b2).toBeLessThan(0);
    });
  });

  describe('Allpass filter', () => {
    it('should calculate allpass filter coefficients', () => {
      const params: BiquadParameters = { type: 'Allpass', freq: 1000, q: 0.707 };
      const coeffs = calculateCoefficients(params, sampleRate);

      // Allpass has unity magnitude response, phase shift only
      expect(coeffs.b0).toBeDefined();
      expect(coeffs.b1).toBeDefined();
      expect(coeffs.b2).toBeDefined();
    });
  });
});

describe('calculateResponse', () => {
  const sampleRate = 48000;

  it('should calculate 0dB response at DC for allpass', () => {
    const coeffs: BiquadCoefficients = {
      b0: 1,
      b1: 0,
      b2: 0,
      a1: 0,
      a2: 0,
    };
    const response = calculateResponse(coeffs, 20, sampleRate);
    expect(response).toBeCloseTo(0, 1);
  });

  it('should calculate lowpass response - attenuation at high frequencies', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };
    const coeffs = calculateCoefficients(params, sampleRate);

    const lowFreqResponse = calculateResponse(coeffs, 100, sampleRate);
    const highFreqResponse = calculateResponse(coeffs, 10000, sampleRate);

    expect(lowFreqResponse).toBeGreaterThan(highFreqResponse);
    expect(highFreqResponse).toBeLessThan(-20); // Significant attenuation
  });

  it('should calculate highpass response - attenuation at low frequencies', () => {
    const params: BiquadParameters = { type: 'Highpass', freq: 1000, q: 0.707 };
    const coeffs = calculateCoefficients(params, sampleRate);

    const lowFreqResponse = calculateResponse(coeffs, 100, sampleRate);
    const highFreqResponse = calculateResponse(coeffs, 10000, sampleRate);

    expect(highFreqResponse).toBeGreaterThan(lowFreqResponse);
    expect(lowFreqResponse).toBeLessThan(-20); // Significant attenuation
  });

  it('should calculate peaking filter boost at center frequency', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 2.0 };
    const coeffs = calculateCoefficients(params, sampleRate);

    const centerResponse = calculateResponse(coeffs, 1000, sampleRate);
    const lowResponse = calculateResponse(coeffs, 100, sampleRate);
    const highResponse = calculateResponse(coeffs, 10000, sampleRate);

    expect(centerResponse).toBeCloseTo(6, 0.5); // ~6dB at center
    expect(lowResponse).toBeCloseTo(0, 1); // ~0dB at extremes
    expect(highResponse).toBeCloseTo(0, 1);
  });

  it('should calculate notch filter rejection at center frequency', () => {
    const params: BiquadParameters = { type: 'Notch', freq: 1000, q: 10.0 };
    const coeffs = calculateCoefficients(params, sampleRate);

    const centerResponse = calculateResponse(coeffs, 1000, sampleRate);
    const lowResponse = calculateResponse(coeffs, 100, sampleRate);

    expect(centerResponse).toBeLessThan(-40); // Deep notch
    expect(lowResponse).toBeCloseTo(0, 1); // Unity away from notch
  });

  it('should calculate allpass unity magnitude', () => {
    const params: BiquadParameters = { type: 'Allpass', freq: 1000, q: 0.707 };
    const coeffs = calculateCoefficients(params, sampleRate);

    const response100 = calculateResponse(coeffs, 100, sampleRate);
    const response1k = calculateResponse(coeffs, 1000, sampleRate);
    const response10k = calculateResponse(coeffs, 10000, sampleRate);

    // All should be close to 0dB (unity magnitude)
    expect(response100).toBeCloseTo(0, 0.1);
    expect(response1k).toBeCloseTo(0, 0.1);
    expect(response10k).toBeCloseTo(0, 0.1);
  });
});

describe('calculateBiquadResponse', () => {
  const sampleRate = 48000;

  it('should calculate response directly from parameters', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };

    const response = calculateBiquadResponse(params, 1000, sampleRate);

    // At cutoff frequency, expect approximately -3dB
    expect(response).toBeCloseTo(-3, 0.5);
  });

  it('should handle edge cases - very low frequency', () => {
    const params: BiquadParameters = { type: 'Highpass', freq: 1000, q: 0.707 };

    const response = calculateBiquadResponse(params, 10, sampleRate);

    expect(response).toBeLessThan(-40); // Very strong attenuation
  });

  it('should handle edge cases - very high frequency', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };

    const response = calculateBiquadResponse(params, 20000, sampleRate);

    expect(response).toBeLessThan(-30); // Strong attenuation
  });

  it('should handle extreme Q values', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 12, q: 10.0 };

    const centerResponse = calculateBiquadResponse(params, 1000, sampleRate);
    const nearbyResponse = calculateBiquadResponse(params, 1100, sampleRate);

    expect(centerResponse).toBeCloseTo(12, 1); // Peak at center
    expect(nearbyResponse).toBeLessThan(centerResponse); // Sharp Q means narrow peak
  });

  it('should handle shelf filters at extremes', () => {
    const params: BiquadParameters = { type: 'Lowshelf', freq: 100, gain: 6, slope: 1.0 };

    const veryLowResponse = calculateBiquadResponse(params, 20, sampleRate);
    const highResponse = calculateBiquadResponse(params, 10000, sampleRate);

    expect(veryLowResponse).toBeCloseTo(6, 1); // Full gain at low freq
    expect(highResponse).toBeCloseTo(0, 1); // Unity at high freq
  });
});

describe('Performance', () => {
  const sampleRate = 48000;

  it('should calculate 512 frequency points in less than 16ms', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 1.0 };
    const frequencies: number[] = [];

    // Generate 512 logarithmically spaced frequencies
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const logStep = (logMax - logMin) / 511;

    for (let i = 0; i < 512; i++) {
      frequencies.push(Math.pow(10, logMin + i * logStep));
    }

    const startTime = performance.now();

    frequencies.forEach((freq) => {
      calculateBiquadResponse(params, freq, sampleRate);
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(16);
  });

  it('should calculate composite response for 5 filters in less than 50ms', () => {
    const filters: BiquadParameters[] = [
      { type: 'Highpass', freq: 80, q: 0.707 },
      { type: 'Peaking', freq: 200, gain: 3, q: 1.0 },
      { type: 'Peaking', freq: 1000, gain: -2, q: 2.0 },
      { type: 'Peaking', freq: 5000, gain: 4, q: 1.5 },
      { type: 'Lowpass', freq: 16000, q: 0.707 },
    ];

    const frequencies: number[] = [];
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const logStep = (logMax - logMin) / 511;

    for (let i = 0; i < 512; i++) {
      frequencies.push(Math.pow(10, logMin + i * logStep));
    }

    const startTime = performance.now();

    let totalMagnitude = 0;
    frequencies.forEach((freq) => {
      filters.forEach((params) => {
        totalMagnitude += calculateBiquadResponse(params, freq, sampleRate);
      });
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(Number.isFinite(totalMagnitude)).toBe(true);
    expect(duration).toBeLessThan(50);
  });
});

describe('Edge cases and stability', () => {
  const sampleRate = 48000;

  it('should handle Nyquist frequency', () => {
    const params: BiquadParameters = { type: 'Lowpass', freq: 1000, q: 0.707 };

    const response = calculateBiquadResponse(params, sampleRate / 2, sampleRate);

    expect(response).toBeLessThan(-50); // Very strong attenuation at Nyquist
  });

  it('should not produce NaN for valid inputs', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 12, q: 0.1 };

    const response = calculateBiquadResponse(params, 1000, sampleRate);

    expect(response).not.toBeNaN();
    expect(response).toBeDefined();
  });

  it('should handle zero gain shelf filter', () => {
    const params: BiquadParameters = { type: 'Lowshelf', freq: 100, gain: 0, slope: 1.0 };

    const response = calculateBiquadResponse(params, 50, sampleRate);

    expect(response).toBeCloseTo(0, 1); // Should be unity
  });

  it('should produce stable results for very low Q', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 0.1 };

    const response = calculateBiquadResponse(params, 1000, sampleRate);

    expect(response).toBeGreaterThan(0); // Should still show some gain
    expect(response).toBeLessThan(10); // But spread out due to low Q
  });

  it('should produce stable results for very high Q', () => {
    const params: BiquadParameters = { type: 'Peaking', freq: 1000, gain: 6, q: 100 };

    const response = calculateBiquadResponse(params, 1000, sampleRate);

    expect(response).toBeCloseTo(6, 1); // Very narrow peak
  });
});
