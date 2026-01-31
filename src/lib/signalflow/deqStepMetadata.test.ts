import { describe, it, expect } from 'vitest';
import type { CamillaConfig, DeqBandUiSettingsV1 } from '../../types';
import { fromConfig } from './fromConfig';
import { toConfig } from './toConfig';
import { parseDeqSettingsFromStepDescription, upsertDeqSettingsInStepDescription } from './deqStepMetadata';

function createTestConfig(overrides: Partial<CamillaConfig> = {}): CamillaConfig {
  return {
    devices: {
      samplerate: 48000,
      chunksize: 1024,
      capture: { type: 'Alsa', channels: 1, device: 'hw:0' },
      playback: { type: 'Alsa', channels: 1, device: 'hw:0' },
    },
    mixers: {
      routing: {
        channels: { in: 1, out: 1 },
        mapping: [],
      },
    },
    pipeline: [{ type: 'Mixer', name: 'routing' }],
    ...overrides,
  };
}

describe('DEQ step metadata', () => {
  it('hydrates uiMetadata.deq from pipeline step descriptions', () => {
    const filterName = 'sf-input-ch1-deq-test';
    const deqSettings: DeqBandUiSettingsV1 = {
      version: 1,
      enabled: true,
      biquad: { type: 'Peaking', freq: 1234, gain: 3, q: 1.2 },
      dynamics: { enabled: true, mode: 'downward', thresholdDb: -24, ratio: 2 },
    };

    const description = upsertDeqSettingsInStepDescription(undefined, deqSettings);
    expect(parseDeqSettingsFromStepDescription(description)).toEqual(deqSettings);

    const config = createTestConfig({
      filters: {
        [filterName]: { type: 'DiffEq', parameters: { a: [1, -0.1, 0.2], b: [0.3, 0.4, 0.5] } },
      },
      pipeline: [
        { type: 'Filter', names: [filterName], channels: [0], description },
        { type: 'Mixer', name: 'routing' },
      ],
    });

    const flow = fromConfig(config);
    expect(flow.uiMetadata?.deq?.[filterName]).toEqual(deqSettings);
  });

  it('writes DEQ ui settings into generated filter step descriptions', () => {
    const filterName = 'sf-input-ch1-deq-test';
    const deqSettings: DeqBandUiSettingsV1 = {
      version: 1,
      enabled: true,
      biquad: { type: 'Peaking', freq: 1000, gain: 2, q: 1.0 },
    };

    const config = createTestConfig({
      filters: {
        [filterName]: { type: 'DiffEq', parameters: { a: [1], b: [1] } },
      },
      pipeline: [
        { type: 'Filter', names: [filterName], channels: [0] },
        { type: 'Mixer', name: 'routing' },
      ],
    });

    const flow = fromConfig(config);
    const result = toConfig(config, flow.model, { deq: { [filterName]: deqSettings } });

    const step = result.config.pipeline.find(
      (s) => s.type === 'Filter' && s.names.length === 1 && s.names[0] === filterName,
    );
    expect(step).toBeDefined();
    expect(step && 'description' in step ? step.description : undefined).toBeDefined();

    const parsed = parseDeqSettingsFromStepDescription(
      step && 'description' in step ? step.description : undefined,
    );
    expect(parsed).toEqual(deqSettings);
  });
});

