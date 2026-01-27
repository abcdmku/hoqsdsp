/**
 * Integration tests for Signal Flow state sync functionality
 * Tests the full flow from config -> signalflow model -> config
 */
import { describe, it, expect } from 'vitest';
import { fromConfig } from './fromConfig';
import { toConfig } from './toConfig';
import { validateConfig } from '../config/validation';
import { cleanNullValues } from '../config/cleanConfig';
import type { CamillaConfig, SignalFlowUiMetadata } from '../../types';

// Minimal valid config for testing
const createMinimalConfig = (): CamillaConfig => ({
  devices: {
    samplerate: 48000,
    chunksize: 1024,
    capture: {
      type: 'Alsa',
      channels: 2,
      device: 'hw:0',
    },
    playback: {
      type: 'Alsa',
      channels: 2,
      device: 'hw:0',
    },
  },
  pipeline: [],
});

// Config with null values like CamillaDSP might send
const createConfigWithNulls = (): Record<string, unknown> => ({
  devices: {
    samplerate: 48000,
    chunksize: 1024,
    queuelimit: null,
    silence_threshold: null,
    capture: {
      type: 'Alsa',
      channels: 2,
      device: 'hw:0',
      stop_on_inactive: null,
    },
    playback: {
      type: 'Alsa',
      channels: 2,
      device: 'hw:0',
    },
    enable_rate_adjust: null,
    target_level: null,
  },
  mixers: {
    routing: {
      channels: { in: 2, out: 2 },
      mapping: [
        {
          dest: 0,
          sources: [
            { channel: 0, gain: 0, inverted: null, mute: null },
          ],
        },
      ],
    },
  },
  filters: null,
  pipeline: [
    { type: 'Mixer', name: 'routing' },
  ],
  title: null,
  description: null,
});

describe('Signal Flow Integration', () => {
  describe('Config Validation', () => {
    it('should validate a minimal config', () => {
      const config = createMinimalConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle config with null values via cleanNullValues', () => {
      const configWithNulls = createConfigWithNulls();
      const cleanedConfig = cleanNullValues(configWithNulls);

      const result = validateConfig(cleanedConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require cleanNullValues for configs with null fields', () => {
      const configWithNulls = createConfigWithNulls();

      // Raw config with nulls will fail validation (this is expected)
      const rawResult = validateConfig(configWithNulls);
      expect(rawResult.valid).toBe(false);

      // After cleaning, it should pass
      const cleanedConfig = cleanNullValues(configWithNulls);
      const cleanedResult = validateConfig(cleanedConfig);
      expect(cleanedResult.valid).toBe(true);
    });

    it('should validate config with UI metadata', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        ui: {
          signalFlow: {
            channelColors: {
              'input:in-default:0': '#ff0000',
              'output:out-default:0': '#00ff00',
            },
            channelNames: {
              'input:in-default:0': 'Left Input',
            },
            mirrorGroups: {
              input: [],
              output: [],
            },
          },
        },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('fromConfig / toConfig Round Trip', () => {
    it('should round-trip a basic config with routing', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [
              {
                dest: 0,
                sources: [{ channel: 0, gain: 0, inverted: false, mute: false }],
              },
              {
                dest: 1,
                sources: [{ channel: 1, gain: 0, inverted: false, mute: false }],
              },
            ],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const flow = fromConfig(config);
      expect(flow.model.routes).toHaveLength(2);
      expect(flow.model.inputs).toHaveLength(2);
      expect(flow.model.outputs).toHaveLength(2);

      const result = toConfig(config, flow.model);
      expect(result.config.mixers?.routing).toBeDefined();

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });

    it('should preserve UI metadata through round-trip', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const uiMetadata: SignalFlowUiMetadata = {
        channelColors: {
          'input:in-default:0': '#ff0000',
        },
        channelNames: {
          'input:in-default:0': 'Custom Name',
        },
        mirrorGroups: {
          input: [[{ deviceId: 'in-default', channelIndex: 0 }, { deviceId: 'in-default', channelIndex: 1 }]],
          output: [],
        },
      };

      const flow = fromConfig(config);
      const result = toConfig(config, flow.model, uiMetadata);

      expect(result.config.ui?.signalFlow?.channelColors).toEqual(uiMetadata.channelColors);
      expect(result.config.ui?.signalFlow?.channelNames).toEqual(uiMetadata.channelNames);
      expect(result.config.ui?.signalFlow?.mirrorGroups).toEqual(uiMetadata.mirrorGroups);

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });

    it('should handle route with inverted and mute flags', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [
              {
                dest: 0,
                sources: [{ channel: 0, gain: -6, inverted: true, mute: false }],
              },
            ],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const flow = fromConfig(config);
      expect(flow.model.routes[0]?.inverted).toBe(true);
      expect(flow.model.routes[0]?.mute).toBe(false);
      expect(flow.model.routes[0]?.gain).toBe(-6);

      const result = toConfig(config, flow.model);
      const routing = result.config.mixers?.routing;
      expect(routing?.mapping[0]?.sources[0]?.inverted).toBe(true);
      // mute: false is omitted since we only include truthy optional values
      expect(routing?.mapping[0]?.sources[0]?.mute).toBeUndefined();
      expect(routing?.mapping[0]?.sources[0]?.gain).toBe(-6);

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('cleanNullValues', () => {
    it('should remove null values from objects', () => {
      const input = { a: 1, b: null, c: 'test' };
      const output = cleanNullValues(input);

      expect(output).toEqual({ a: 1, c: 'test' });
      expect('b' in output).toBe(false);
    });

    it('should handle nested objects', () => {
      const input = {
        level1: {
          a: 1,
          b: null,
          level2: {
            c: null,
            d: 'value',
          },
        },
      };

      const output = cleanNullValues(input);

      expect(output).toEqual({
        level1: {
          a: 1,
          level2: {
            d: 'value',
          },
        },
      });
    });

    it('should handle arrays', () => {
      const input = {
        items: [
          { name: 'item1', value: null },
          { name: 'item2', value: 5 },
        ],
      };

      const output = cleanNullValues(input);

      expect(output).toEqual({
        items: [
          { name: 'item1' },
          { name: 'item2', value: 5 },
        ],
      });
    });
  });

  describe('Filter Operations', () => {
    it('should add a Gain filter to a channel', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const flow = fromConfig(config);

      // Add a gain filter to input channel 0
      flow.model.inputs[0]!.processing.filters.push({
        name: 'gain-ch0',
        config: {
          type: 'Gain',
          parameters: { gain: -6, scale: 'dB' },
        },
      });

      const result = toConfig(config, flow.model);

      expect(result.config.filters?.['gain-ch0']).toBeDefined();
      expect(result.config.filters?.['gain-ch0']?.type).toBe('Gain');
      expect(result.config.pipeline.some((s) => s.type === 'Filter' && s.names.includes('gain-ch0'))).toBe(true);

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });

    it('should add a Delay filter to a channel', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const flow = fromConfig(config);

      // Add a delay filter to output channel 0
      flow.model.outputs[0]!.processing.filters.push({
        name: 'delay-ch0',
        config: {
          type: 'Delay',
          parameters: { delay: 10, unit: 'ms', subsample: true },
        },
      });

      const result = toConfig(config, flow.model);

      expect(result.config.filters?.['delay-ch0']).toBeDefined();
      expect(result.config.filters?.['delay-ch0']?.type).toBe('Delay');

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });

    it('should add a Biquad EQ filter', () => {
      const config: CamillaConfig = {
        ...createMinimalConfig(),
        mixers: {
          routing: {
            channels: { in: 2, out: 2 },
            mapping: [],
          },
        },
        pipeline: [{ type: 'Mixer', name: 'routing' }],
      };

      const flow = fromConfig(config);

      // Add a biquad filter to input channel 0
      flow.model.inputs[0]!.processing.filters.push({
        name: 'eq-ch0-band1',
        config: {
          type: 'Biquad',
          parameters: { type: 'Peaking', freq: 1000, gain: 3, q: 1.0 },
        },
      });

      const result = toConfig(config, flow.model);

      expect(result.config.filters?.['eq-ch0-band1']).toBeDefined();
      expect(result.config.filters?.['eq-ch0-band1']?.type).toBe('Biquad');

      const validation = validateConfig(result.config);
      expect(validation.valid).toBe(true);
    });
  });
});
