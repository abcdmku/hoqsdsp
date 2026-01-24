import { describe, it, expect } from 'vitest';
import type { CamillaConfig } from '../../types';
import { fromConfig } from './fromConfig';

function createBaseConfig(overrides?: Partial<CamillaConfig>): CamillaConfig {
  return {
    devices: {
      samplerate: 48000,
      chunksize: 1024,
      capture: { type: 'Alsa', channels: 2, device: 'hw:0' },
      playback: { type: 'Alsa', channels: 2, device: 'hw:1' },
    },
    pipeline: [],
    ...overrides,
  };
}

describe('signalflow/fromConfig', () => {
  it('derives device groups, channels, routes, and summaries', () => {
    const config = createBaseConfig({
      mixers: {
        routing: {
          channels: { in: 2, out: 2 },
          mapping: [
            { dest: 0, sources: [{ channel: 0, gain: -3 }, { channel: 1, gain: 0, inverted: true }] },
            { dest: 1, sources: [{ channel: 1, gain: -6, mute: true }] },
          ],
        },
      },
      filters: {
        inEq: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 3, q: 1 } },
        outGain: { type: 'Gain', parameters: { gain: -2 } },
        outConv: { type: 'Conv', parameters: { type: 'Values', values: [0.5] } },
      },
      pipeline: [
        { type: 'Filter', name: 'inEq', channel: 0 },
        { type: 'Mixer', name: 'routing' },
        { type: 'Filter', name: 'outGain', channel: 1 },
        { type: 'Filter', name: 'outConv', channel: 1 },
      ],
    });

    const result = fromConfig(config);

    expect(result.model.inputGroups).toHaveLength(1);
    expect(result.model.outputGroups).toHaveLength(1);
    expect(result.model.inputs).toHaveLength(2);
    expect(result.model.outputs).toHaveLength(2);

    expect(result.model.routes).toHaveLength(3);
    expect(result.model.routes[0]).toMatchObject({ gain: -3, inverted: false, mute: false });
    expect(result.model.routes[1]).toMatchObject({ gain: 0, inverted: true, mute: false });
    expect(result.model.routes[2]).toMatchObject({ gain: -6, inverted: false, mute: true });

    expect(result.model.inputs[0]?.processingSummary.biquadCount).toBe(1);
    expect(result.model.inputs[1]?.processingSummary.biquadCount).toBe(0);
    expect(result.model.outputs[1]?.processingSummary.hasGain).toBe(true);
    expect(result.model.outputs[1]?.processingSummary.hasConv).toBe(true);

    expect(result.model.inputs[0]?.processing.filters.map((f) => f.name)).toEqual(['inEq']);
    expect(result.model.outputs[1]?.processing.filters.map((f) => f.name)).toEqual(['outGain', 'outConv']);
    expect(result.representable).toBe(true);
  });

  it('treats filter steps without explicit channels as global per-stage', () => {
    const config = createBaseConfig({
      mixers: {
        routing: { channels: { in: 2, out: 2 }, mapping: [] },
      },
      filters: {
        inDelay: { type: 'Delay', parameters: { delay: 1, unit: 'ms', subsample: false } },
      },
      pipeline: [
        { type: 'Filter', name: 'inDelay' },
        { type: 'Mixer', name: 'routing' },
      ],
    });

    const result = fromConfig(config);
    expect(result.warnings.some((w) => w.code === 'global_filter_step')).toBe(true);
    expect(result.model.inputs[0]?.processingSummary.hasDelay).toBe(true);
    expect(result.model.inputs[1]?.processingSummary.hasDelay).toBe(true);
  });

  it('flags configs with additional mixers as non-representable', () => {
    const config = createBaseConfig({
      mixers: {
        routing: { channels: { in: 2, out: 2 }, mapping: [] },
        other: { channels: { in: 2, out: 2 }, mapping: [] },
      },
      pipeline: [
        { type: 'Mixer', name: 'routing' },
        { type: 'Mixer', name: 'other' },
      ],
    });

    const result = fromConfig(config);
    expect(result.representable).toBe(false);
    expect(result.warnings.some((w) => w.code === 'non_canonical_mixers')).toBe(true);
  });
});
