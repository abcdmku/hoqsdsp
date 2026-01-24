import { z } from 'zod';
import type { NoiseGateFilter } from '../../types';
import { BaseFilterHandler } from './types';

// NoiseGate parameters schema
export const noisegateParametersSchema = z.object({
  channels: z.number().int().min(1),
  threshold: z.number(),
  attack: z.number().min(0, 'Attack time must be non-negative'),
  release: z.number().min(0, 'Release time must be non-negative'),
  hold: z.number().min(0, 'Hold time must be non-negative'),
});

// Complete noisegate filter schema
export const noisegateFilterSchema = z.object({
  type: z.literal('NoiseGate'),
  parameters: noisegateParametersSchema,
});

class NoiseGateFilterHandler extends BaseFilterHandler<NoiseGateFilter> {
  readonly type = 'NoiseGate' as const;
  readonly schema = noisegateFilterSchema;

  serialize(config: NoiseGateFilter): Record<string, unknown> {
    return {
      type: 'NoiseGate',
      parameters: config.parameters,
    };
  }

  getDefault(): NoiseGateFilter {
    return {
      type: 'NoiseGate',
      parameters: {
        channels: 2,
        threshold: -60,
        attack: 5,
        release: 100,
        hold: 50,
      },
    };
  }

  getDisplayName(_config: NoiseGateFilter): string {
    return 'Noise Gate';
  }

  getSummary(config: NoiseGateFilter): string {
    const params = config.parameters;
    return `Threshold: ${String(params.threshold)}dB`;
  }
}

export const noisegateHandler = new NoiseGateFilterHandler();
