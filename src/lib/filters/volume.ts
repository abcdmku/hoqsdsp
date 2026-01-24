import { z } from 'zod';
import type { VolumeFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Volume parameters schema
export const volumeParametersSchema = z.object({
  ramp_time: z.number().min(0).optional(),
});

// Complete volume filter schema
export const volumeFilterSchema = z.object({
  type: z.literal('Volume'),
  parameters: volumeParametersSchema,
});

// Handler implementation
class VolumeFilterHandler extends BaseFilterHandler<VolumeFilter> {
  readonly type = 'Volume' as const;
  readonly schema = volumeFilterSchema;

  serialize(config: VolumeFilter): Record<string, unknown> {
    return {
      type: 'Volume',
      parameters: config.parameters,
    };
  }

  getDefault(): VolumeFilter {
    return {
      type: 'Volume',
      parameters: {
        ramp_time: 200,
      },
    };
  }

  getDisplayName(config: VolumeFilter): string {
    return config.parameters.ramp_time !== undefined ? 'Volume (ramp)' : 'Volume';
  }

  getSummary(config: VolumeFilter): string {
    const { ramp_time } = config.parameters;
    return ramp_time !== undefined ? `Ramp: ${String(ramp_time)}ms` : 'Fader control';
  }
}

export const volumeHandler = new VolumeFilterHandler();
