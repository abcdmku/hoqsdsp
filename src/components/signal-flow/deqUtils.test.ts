import { describe, it, expect } from 'vitest';
import type { ChannelProcessingFilter } from '../../lib/signalflow';
import { calculateCoefficients } from '../../lib/dsp';
import { buildDeqBands } from './deqUtils';

describe('buildDeqBands', () => {
  it('derives peaking parameters from DiffEq coefficients when no UI metadata is present', () => {
    const sampleRate = 48000;
    const filterName = 'sf-input-ch1-deq-test';

    const sourceParams = { type: 'Peaking' as const, freq: 2000, gain: 6, q: 1.5 };
    const coeffs = calculateCoefficients(sourceParams, sampleRate);

    const filter: ChannelProcessingFilter = {
      name: filterName,
      config: {
        type: 'DiffEq',
        parameters: {
          a: [1, coeffs.a1, coeffs.a2],
          b: [coeffs.b0, coeffs.b1, coeffs.b2],
        },
      },
    };

    const bands = buildDeqBands([filter], {}, sampleRate);
    expect(bands).toHaveLength(1);

    const band = bands[0]!;
    expect(band.id).toBe(filterName);
    expect(band.enabled).toBe(true);
    expect(band.parameters.type).toBe('Peaking');

    if (band.parameters.type !== 'Peaking') {
      throw new Error(`Expected Peaking parameters, got ${band.parameters.type}`);
    }

    expect(band.parameters.freq).toBeCloseTo(sourceParams.freq, 6);
    expect(band.parameters.gain).toBeCloseTo(sourceParams.gain, 6);
    expect(band.parameters.q).toBeCloseTo(sourceParams.q, 6);
  });

  it('treats explicit bypass coefficients as disabled', () => {
    const sampleRate = 48000;
    const filterName = 'sf-input-ch1-deq-bypass';

    const filter: ChannelProcessingFilter = {
      name: filterName,
      config: {
        type: 'DiffEq',
        parameters: { a: [1], b: [1] },
      },
    };

    const bands = buildDeqBands([filter], {}, sampleRate);
    expect(bands).toHaveLength(1);
    expect(bands[0]?.enabled).toBe(false);
  });
});
