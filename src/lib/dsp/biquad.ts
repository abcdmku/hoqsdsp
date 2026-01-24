import type { BiquadParameters } from '../../types';

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Calculate biquad filter coefficients using bilinear transform
 */
export function calculateCoefficients(
  params: BiquadParameters,
  sampleRate: number
): BiquadCoefficients {
  const { type } = params;
  const freq = 'freq' in params ? params.freq : 1000;
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);

  let b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'Lowpass': {
      const q = params.q;
      const alpha = sinW0 / (2 * q);
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'Highpass': {
      const q = params.q;
      const alpha = sinW0 / (2 * q);
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'LowpassFO': {
      const K = Math.tan(w0 / 2);
      b0 = K / (1 + K);
      b1 = K / (1 + K);
      b2 = 0;
      a0 = 1;
      a1 = (K - 1) / (K + 1);
      a2 = 0;
      break;
    }
    case 'HighpassFO': {
      const K = Math.tan(w0 / 2);
      b0 = 1 / (1 + K);
      b1 = -1 / (1 + K);
      b2 = 0;
      a0 = 1;
      a1 = (K - 1) / (K + 1);
      a2 = 0;
      break;
    }
    case 'Peaking': {
      const q = params.q;
      const gain = params.gain;
      const A = Math.pow(10, gain / 40);
      const alpha = sinW0 / (2 * q);
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
      break;
    }
    case 'Lowshelf': {
      const gain = params.gain;
      const slope = params.slope;
      const A = Math.pow(10, gain / 40);
      const alpha = sinW0 / 2 * Math.sqrt((A + 1/A) * (1/slope - 1) + 2);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;
    }
    case 'Highshelf': {
      const gain = params.gain;
      const slope = params.slope;
      const A = Math.pow(10, gain / 40);
      const alpha = sinW0 / 2 * Math.sqrt((A + 1/A) * (1/slope - 1) + 2);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;
    }
    case 'Notch': {
      const q = params.q;
      const alpha = sinW0 / (2 * q);
      b0 = 1;
      b1 = -2 * cosW0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'Bandpass': {
      const q = params.q;
      const alpha = sinW0 / (2 * q);
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'Allpass': {
      const q = params.q;
      const alpha = sinW0 / (2 * q);
      b0 = 1 - alpha;
      b1 = -2 * cosW0;
      b2 = 1 + alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    default:
      // Default to unity (pass-through)
      b0 = 1;
      a0 = 1;
  }

  // Normalize coefficients
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/**
 * Calculate frequency response magnitude in dB at a given frequency
 */
export function calculateResponse(
  coeffs: BiquadCoefficients,
  freq: number,
  sampleRate: number
): number {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);
  const sinW = Math.sin(w);
  const sin2W = Math.sin(2 * w);

  // H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
  // At z = e^(jw): z^-1 = e^(-jw) = cos(w) - j*sin(w)

  const numReal = coeffs.b0 + coeffs.b1 * cosW + coeffs.b2 * cos2W;
  const numImag = -coeffs.b1 * sinW - coeffs.b2 * sin2W;
  const denReal = 1 + coeffs.a1 * cosW + coeffs.a2 * cos2W;
  const denImag = -coeffs.a1 * sinW - coeffs.a2 * sin2W;

  const numMag = Math.sqrt(numReal * numReal + numImag * numImag);
  const denMag = Math.sqrt(denReal * denReal + denImag * denImag);

  const magnitude = numMag / denMag;
  return 20 * Math.log10(magnitude);
}

/**
 * Calculate response directly from biquad parameters
 */
export function calculateBiquadResponse(
  params: BiquadParameters,
  freq: number,
  sampleRate: number
): number {
  const coeffs = calculateCoefficients(params, sampleRate);
  return calculateResponse(coeffs, freq, sampleRate);
}
