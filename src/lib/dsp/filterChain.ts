import type { FilterConfig } from '../../types';
import { calculateBiquadComplexResponse } from './biquad';
import { COMPLEX_ONE, type Complex, complexDiv, complexExpj, complexMul } from './complex';

export function calculateFilterComplexResponse(
  filter: FilterConfig,
  freq: number,
  sampleRate: number,
): Complex {
  switch (filter.type) {
    case 'Biquad':
      return calculateBiquadComplexResponse(filter.parameters, freq, sampleRate);
    case 'Gain': {
      const scale = filter.parameters.scale ?? 'dB';
      const magnitude = scale === 'linear' ? filter.parameters.gain : Math.pow(10, filter.parameters.gain / 20);
      const sign = filter.parameters.inverted ? -1 : 1;
      return { re: magnitude * sign, im: 0 };
    }
    case 'Volume':
    case 'Dither':
    case 'Compressor':
    case 'NoiseGate':
    case 'Loudness':
      // Non-linear/dynamic in general; treat as unity for response previews.
      return COMPLEX_ONE;
    case 'Delay': {
      const { delay, unit, subsample } = filter.parameters;
      let delaySamples: number;
      if (unit === 'samples') {
        delaySamples = delay;
      } else if (unit === 'ms') {
        delaySamples = (delay / 1000) * sampleRate;
      } else {
        // unit === 'mm' (distance)
        delaySamples = (delay / 343000) * sampleRate;
      }

      const applied = subsample ? delaySamples : Math.round(delaySamples);
      const w = (2 * Math.PI * freq) / sampleRate;
      return complexExpj(-w * applied);
    }
    case 'DiffEq': {
      const a = filter.parameters.a;
      const b = filter.parameters.b;
      if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return COMPLEX_ONE;

      const w = (2 * Math.PI * freq) / sampleRate;
      const cosW = Math.cos(w);
      const sinW = Math.sin(w);

      let cosN = 1;
      let sinN = 0;

      let numRe = 0;
      let numIm = 0;
      for (let k = 0; k < b.length; k++) {
        const coeff = b[k] ?? 0;
        numRe += coeff * cosN;
        numIm -= coeff * sinN;

        const nextCos = cosN * cosW - sinN * sinW;
        const nextSin = sinN * cosW + cosN * sinW;
        cosN = nextCos;
        sinN = nextSin;
      }

      cosN = 1;
      sinN = 0;

      let denRe = 0;
      let denIm = 0;
      for (let k = 0; k < a.length; k++) {
        const coeff = a[k] ?? 0;
        denRe += coeff * cosN;
        denIm -= coeff * sinN;

        const nextCos = cosN * cosW - sinN * sinW;
        const nextSin = sinN * cosW + cosN * sinW;
        cosN = nextCos;
        sinN = nextSin;
      }

      return complexDiv({ re: numRe, im: numIm }, { re: denRe, im: denIm });
    }
    case 'Conv':
    default:
      return COMPLEX_ONE;
  }
}

export function calculateFilterChainComplexResponse(
  filters: FilterConfig[],
  freq: number,
  sampleRate: number,
): Complex {
  let acc: Complex = COMPLEX_ONE;
  for (const filter of filters) {
    acc = complexMul(acc, calculateFilterComplexResponse(filter, freq, sampleRate));
  }
  return acc;
}

