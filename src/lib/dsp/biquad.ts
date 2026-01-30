import type { BiquadParameters } from '../../types';
import { COMPLEX_ONE, type Complex, complexAbs, complexDiv, complexMul } from './complex';

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
    case 'LowshelfFO': {
      const gain = params.gain;
      const A = Math.pow(10, gain / 20);
      const K = Math.tan(w0 / 2);
      b0 = 1 + A * K;
      b1 = -1 + A * K;
      b2 = 0;
      a0 = 1 + K;
      a1 = K - 1;
      a2 = 0;
      break;
    }
    case 'HighshelfFO': {
      const gain = params.gain;
      const A = Math.pow(10, gain / 20);
      const K = Math.tan(w0 / 2);
      b0 = A + K;
      b1 = K - A;
      b2 = 0;
      a0 = 1 + K;
      a1 = K - 1;
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
    case 'AllpassFO': {
      const K = Math.tan(w0 / 2);
      b0 = 1 - K;
      b1 = -(1 + K);
      b2 = 0;
      a0 = 1 + K;
      a1 = K - 1;
      a2 = 0;
      break;
    }
    case 'LinkwitzTransform': {
      const freqAct = params.freq_act;
      const qAct = params.q_act;
      const freqTarget = params.freq_target;
      const qTarget = params.q_target;

      // Bilinear transform with frequency pre-warping (see Linkwitz Transform derivations)
      const fs = sampleRate;
      const K = 2 * fs;
      const wAct = 2 * fs * Math.tan((Math.PI * freqAct) / fs);
      const wTarget = 2 * fs * Math.tan((Math.PI * freqTarget) / fs);

      const n0 = K * K + (wAct / qAct) * K + wAct * wAct;
      const n1 = -2 * K * K + 2 * wAct * wAct;
      const n2 = K * K - (wAct / qAct) * K + wAct * wAct;

      const d0 = K * K + (wTarget / qTarget) * K + wTarget * wTarget;
      const d1 = -2 * K * K + 2 * wTarget * wTarget;
      const d2 = K * K - (wTarget / qTarget) * K + wTarget * wTarget;

      b0 = n0;
      b1 = n1;
      b2 = n2;
      a0 = d0;
      a1 = d1;
      a2 = d2;
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

export function calculateComplexResponse(
  coeffs: BiquadCoefficients,
  freq: number,
  sampleRate: number,
): Complex {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);
  const sinW = Math.sin(w);
  const sin2W = Math.sin(2 * w);

  const numReal = coeffs.b0 + coeffs.b1 * cosW + coeffs.b2 * cos2W;
  const numImag = -coeffs.b1 * sinW - coeffs.b2 * sin2W;
  const denReal = 1 + coeffs.a1 * cosW + coeffs.a2 * cos2W;
  const denImag = -coeffs.a1 * sinW - coeffs.a2 * sin2W;

  return complexDiv({ re: numReal, im: numImag }, { re: denReal, im: denImag });
}

/**
 * Calculate frequency response magnitude in dB at a given frequency
 */
export function calculateResponse(
  coeffs: BiquadCoefficients,
  freq: number,
  sampleRate: number
): number {
  const h = calculateComplexResponse(coeffs, freq, sampleRate);
  const magnitude = complexAbs(h);
  return 20 * Math.log10(magnitude);
}

function butterworthSections(
  kind: 'Lowpass' | 'Highpass',
  order: number,
  freq: number,
): BiquadParameters[] {
  const sections: BiquadParameters[] = [];

  const safeOrder = Math.max(1, Math.floor(order));
  if (safeOrder % 2 === 1) {
    sections.push({ type: kind === 'Lowpass' ? 'LowpassFO' : 'HighpassFO', freq });
  }

  const pairs = Math.floor(safeOrder / 2);
  for (let k = 0; k < pairs; k++) {
    const q = 1 / (2 * Math.sin(((2 * k + 1) * Math.PI) / (2 * safeOrder)));
    sections.push({ type: kind, freq, q });
  }

  return sections;
}

export function calculateBiquadComplexResponse(
  params: BiquadParameters,
  freq: number,
  sampleRate: number,
): Complex {
  switch (params.type) {
    case 'ButterworthLowpass': {
      const sections = butterworthSections('Lowpass', params.order, params.freq);
      return sections.reduce((acc, section) => complexMul(acc, calculateBiquadComplexResponse(section, freq, sampleRate)), COMPLEX_ONE);
    }
    case 'ButterworthHighpass': {
      const sections = butterworthSections('Highpass', params.order, params.freq);
      return sections.reduce((acc, section) => complexMul(acc, calculateBiquadComplexResponse(section, freq, sampleRate)), COMPLEX_ONE);
    }
    case 'LinkwitzRileyLowpass': {
      const halfOrder = Math.max(1, Math.floor(params.order / 2));
      const sections = butterworthSections('Lowpass', halfOrder, params.freq);
      const doubled = [...sections, ...sections];
      return doubled.reduce((acc, section) => complexMul(acc, calculateBiquadComplexResponse(section, freq, sampleRate)), COMPLEX_ONE);
    }
    case 'LinkwitzRileyHighpass': {
      const halfOrder = Math.max(1, Math.floor(params.order / 2));
      const sections = butterworthSections('Highpass', halfOrder, params.freq);
      const doubled = [...sections, ...sections];
      return doubled.reduce((acc, section) => complexMul(acc, calculateBiquadComplexResponse(section, freq, sampleRate)), COMPLEX_ONE);
    }
    default: {
      const coeffs = calculateCoefficients(params, sampleRate);
      return calculateComplexResponse(coeffs, freq, sampleRate);
    }
  }
}

/**
 * Calculate response directly from biquad parameters
 */
export function calculateBiquadResponse(
  params: BiquadParameters,
  freq: number,
  sampleRate: number
): number {
  const h = calculateBiquadComplexResponse(params, freq, sampleRate);
  return 20 * Math.log10(Math.max(1e-12, complexAbs(h)));
}
