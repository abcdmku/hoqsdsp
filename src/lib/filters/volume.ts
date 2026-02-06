import { z } from 'zod';
import type { VolumeFilter } from '../../types';
import { BaseFilterHandler } from './types';

const volumeFaderSchema = z.enum(['Aux1', 'Aux2', 'Aux3', 'Aux4']);

// Volume parameters schema
export const volumeParametersSchema = z.object({
  fader: volumeFaderSchema,
  ramp_time: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.number().min(0).optional(),
  ),
  limit: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.number().optional(),
  ),
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
        fader: 'Aux1',
        ramp_time: 200,
      },
    };
  }

  getDisplayName(config: VolumeFilter): string {
    return config.parameters.ramp_time !== undefined ? 'Volume (ramp)' : 'Volume';
  }

  getSummary(config: VolumeFilter): string {
    const { fader, ramp_time } = config.parameters;
    return ramp_time !== undefined ? `${fader}, ramp: ${String(ramp_time)}ms` : `${fader} fader control`;
  }
}

export const volumeHandler = new VolumeFilterHandler();
