import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  isConfigLike,
  camillaConfigSchema,
} from './validation';
import type { CamillaConfig } from '../../types';

// Helper to create a minimal valid config
function createValidConfig(
  overrides?: Partial<CamillaConfig>,
): CamillaConfig {
  return {
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
        device: 'hw:1',
      },
    },
    pipeline: [],
    ...overrides,
  };
}

describe('isConfigLike', () => {
  it('returns true for valid config-like objects', () => {
    expect(isConfigLike(createValidConfig())).toBe(true);
    expect(
      isConfigLike({
        devices: { samplerate: 48000 },
        pipeline: [],
      }),
    ).toBe(true);
  });

  it('returns false for non-objects', () => {
    expect(isConfigLike(null)).toBe(false);
    expect(isConfigLike(undefined)).toBe(false);
    expect(isConfigLike('string')).toBe(false);
    expect(isConfigLike(123)).toBe(false);
    expect(isConfigLike([])).toBe(false);
  });

  it('returns false for objects missing required fields', () => {
    expect(isConfigLike({})).toBe(false);
    // Missing pipeline
    expect(isConfigLike({ devices: {} })).toBe(false);
    // Missing devices
    expect(isConfigLike({ pipeline: [] })).toBe(false);
    // devices is null
    expect(isConfigLike({ devices: null, pipeline: [] })).toBe(false);
    // pipeline is not an array
    expect(isConfigLike({ devices: {}, pipeline: 'not an array' })).toBe(false);
  });

  it('returns true when both devices object and pipeline array exist', () => {
    // Minimal structure
    expect(isConfigLike({ devices: {}, pipeline: [] })).toBe(true);
  });
});

describe('camillaConfigSchema', () => {
  it('accepts valid configurations', () => {
    const config = createValidConfig();
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('accepts configuration with all optional fields', () => {
    const config = createValidConfig({
      title: 'Test Config',
      description: 'A test configuration',
      filters: {
        testFilter: {
          type: 'Gain',
          parameters: { gain: -6 },
        },
      },
      mixers: {
        testMixer: {
          channels: { in: 2, out: 2 },
          mapping: [
            {
              dest: 0,
              sources: [{ channel: 0, gain: 0 }],
            },
          ],
        },
      },
    });
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects configuration with invalid sample rate', () => {
    const config = createValidConfig();
    config.devices.samplerate = 100; // Too low
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects configuration with invalid channel count', () => {
    const config = createValidConfig();
    config.devices.capture.channels = 0; // Too low
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects configuration with invalid chunk size', () => {
    const config = createValidConfig();
    config.devices.chunksize = 100000; // Too high
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts valid filter types', () => {
    const filterTypes = [
      'Biquad',
      'Conv',
      'Delay',
      'Gain',
      'Volume',
      'Dither',
      'DiffEq',
      'Compressor',
      'Loudness',
      'NoiseGate',
    ];

    for (const filterType of filterTypes) {
      const config = createValidConfig({
        filters: {
          testFilter: {
            type: filterType as Parameters<typeof createValidConfig>[0] extends {
              filters: { testFilter: { type: infer T } };
            }
              ? T
              : never,
            parameters: {},
          },
        },
      });
      const result = camillaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid filter types', () => {
    // Use unknown to bypass TypeScript checking - we're testing runtime validation
    const config = {
      ...createValidConfig(),
      filters: {
        testFilter: {
          type: 'InvalidType',
          parameters: {},
        },
      },
    } as unknown;
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts valid pipeline steps', () => {
    // Use unknown to bypass TypeScript checking for test data
    const config = {
      ...createValidConfig(),
      filters: { eq: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1 } } },
      mixers: {
        main: {
          channels: { in: 2, out: 2 },
          mapping: [],
        },
      },
      pipeline: [
        { type: 'Filter', name: 'eq', channel: 0 },
        { type: 'Mixer', name: 'main' },
        { type: 'Filter', name: 'eq', channels: [0, 1] },
      ],
    } as unknown;
    const result = camillaConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('validateConfig', () => {
  it('returns valid for correct configurations', () => {
    const config = createValidConfig();
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.config).toBeDefined();
  });

  it('returns errors for invalid configurations', () => {
    const result = validateConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects undefined filter references in pipeline', () => {
    const config = createValidConfig({
      pipeline: [{ type: 'Filter', names: ['nonexistent'], channels: [0] }],
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'undefined_filter')).toBe(true);
  });

  it('detects undefined mixer references in pipeline', () => {
    const config = createValidConfig({
      pipeline: [{ type: 'Mixer', name: 'nonexistent' }],
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'undefined_mixer')).toBe(true);
  });

  it('warns about unused filters', () => {
    const config = createValidConfig({
      filters: {
        unusedFilter: { type: 'Gain', parameters: { gain: 0 } },
      },
      pipeline: [],
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'unused_filter')).toBe(true);
  });

  it('warns about unused mixers', () => {
    const config = createValidConfig({
      mixers: {
        unusedMixer: {
          channels: { in: 2, out: 2 },
          mapping: [],
        },
      },
      pipeline: [],
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'unused_mixer')).toBe(true);
  });

  it('warns about low sample rate', () => {
    const config = createValidConfig();
    config.devices.samplerate = 22050; // Valid but low
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'low_samplerate')).toBe(true);
  });

  it('warns about non-power-of-two chunk size', () => {
    const config = createValidConfig();
    config.devices.chunksize = 1000; // Not power of 2
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.code === 'non_power_of_two_chunksize'),
    ).toBe(true);
  });

  it('does not warn for power-of-two chunk sizes', () => {
    const config = createValidConfig();
    config.devices.chunksize = 1024; // Power of 2
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.code === 'non_power_of_two_chunksize'),
    ).toBe(false);
  });

  it('validates used filters and mixers correctly', () => {
    // Use unknown to bypass TypeScript checking for test data
    const config = {
      ...createValidConfig(),
      filters: {
        eq: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1 } },
      },
      mixers: {
        main: {
          channels: { in: 2, out: 2 },
          mapping: [],
        },
      },
      pipeline: [
        { type: 'Filter', name: 'eq', channel: 0 },
        { type: 'Mixer', name: 'main' },
      ],
    } as unknown;
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(
      result.warnings.filter(
        (w) => w.code === 'unused_filter' || w.code === 'unused_mixer',
      ),
    ).toHaveLength(0);
  });
});
