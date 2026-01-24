import { describe, it, expect } from 'vitest';
import type { CamillaConfig } from '../../types';
import { toConfig } from './toConfig';
import type { SignalFlowModel } from './model';
import { emptyChannelProcessing, emptyProcessingSummary } from './model';

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

function createBaseModel(): SignalFlowModel {
  return {
    inputGroups: [{ id: 'in:hw0', label: 'hw:0' }],
    outputGroups: [{ id: 'out:hw1', label: 'hw:1' }],
    inputs: [],
    outputs: [],
    routes: [],
  };
}

function createChannelNode(
  side: 'input' | 'output',
  channelIndex: number,
): SignalFlowModel['inputs'][number] {
  return {
    side,
    deviceId: side === 'input' ? 'in:hw0' : 'out:hw1',
    channelIndex,
    label: `${side}:${String(channelIndex)}`,
    processing: emptyChannelProcessing(),
    processingSummary: emptyProcessingSummary(),
  };
}

describe('signalflow/toConfig', () => {
  it('creates/updates the canonical routing mixer mapping', () => {
    const config = createBaseConfig({
      pipeline: [{ type: 'Mixer', name: 'routing' }],
    });

    const model: SignalFlowModel = {
      ...createBaseModel(),
      routes: [
        {
          from: { deviceId: 'in:hw0', channelIndex: 0 },
          to: { deviceId: 'out:hw1', channelIndex: 1 },
          gain: -4.5,
          inverted: true,
          mute: false,
        },
      ],
    };

    const result = toConfig(config, model);
    expect(result.representable).toBe(true);
    expect(result.config.mixers?.routing?.channels).toEqual({ in: 2, out: 2 });
    expect(result.config.mixers?.routing?.mapping).toEqual([
      {
        dest: 1,
        sources: [{ channel: 0, gain: -4.5, inverted: true, mute: false }],
      },
    ]);
  });

  it('warns when routing mixer is missing from pipeline but still patches mixers', () => {
    const config = createBaseConfig();
    const model: SignalFlowModel = {
      ...createBaseModel(),
      routes: [
        {
          from: { deviceId: 'in:hw0', channelIndex: 0 },
          to: { deviceId: 'out:hw1', channelIndex: 0 },
          gain: 0,
          inverted: false,
          mute: false,
        },
      ],
    };

    const result = toConfig(config, model);
    expect(result.representable).toBe(false);
    expect(result.warnings.some((w) => w.code === 'missing_routing_mixer_step')).toBe(true);
    expect(result.config.mixers?.routing).toBeTruthy();
  });

  it('writes per-channel filter steps into pipeline and filter definitions', () => {
    const config = createBaseConfig({
      pipeline: [{ type: 'Mixer', name: 'routing' }],
    });

    const model: SignalFlowModel = {
      ...createBaseModel(),
      inputs: [
        {
          ...createChannelNode('input', 0),
          processing: {
            filters: [
              { name: 'inGain', config: { type: 'Gain', parameters: { gain: 1 } } },
            ],
          },
        },
      ],
      outputs: [
        {
          ...createChannelNode('output', 0),
          processing: {
            filters: [
              { name: 'outConv', config: { type: 'Conv', parameters: { type: 'Values', values: [0.25] } } },
            ],
          },
        },
      ],
    };

    const result = toConfig(config, model);

    expect(result.config.pipeline).toEqual([
      { type: 'Filter', name: 'inGain', channel: 0 },
      { type: 'Mixer', name: 'routing' },
      { type: 'Filter', name: 'outConv', channel: 0 },
    ]);
    expect(result.config.filters?.inGain).toBeTruthy();
    expect(result.config.filters?.outConv).toBeTruthy();
  });
});
