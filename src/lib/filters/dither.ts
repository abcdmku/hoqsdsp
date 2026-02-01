import { z } from 'zod';
import type { DitherFilter } from '../../types';
import { BaseFilterHandler } from './types';

const ditherNonFlatTypeSchema = z.enum([
  'Highpass',
  'Lipshitz441',
  'Fweighted441',
  'Shibata441',
  'Shibata48',
  'ShibataLow441',
  'ShibataLow48',
  'None',
]);

// Dither parameters schema
const ditherBitsSchema = z.number().int().min(1).max(32);
const ditherAmplitudeSchema = z.number().int().min(0).max(32);

export const ditherParametersSchema = z.union([
  z.object({
    type: z.literal('Flat'),
    bits: ditherBitsSchema,
    amplitude: ditherAmplitudeSchema,
  }),
  z.object({
    type: ditherNonFlatTypeSchema,
    bits: ditherBitsSchema,
  }),
]);

// Complete dither filter schema
export const ditherFilterSchema = z.object({
  type: z.literal('Dither'),
  parameters: ditherParametersSchema,
});

// Handler implementation
class DitherFilterHandler extends BaseFilterHandler<DitherFilter> {
  readonly type = 'Dither' as const;
  readonly schema = ditherFilterSchema;

  serialize(config: DitherFilter): Record<string, unknown> {
    return {
      type: 'Dither',
      parameters: config.parameters,
    };
  }

  getDefault(): DitherFilter {
    return {
      type: 'Dither',
      parameters: {
        type: 'Flat',
        bits: 16,
        amplitude: 2,
      },
    };
  }

  getDisplayName(config: DitherFilter): string {
    return `Dither (${config.parameters.type})`;
  }

  getSummary(config: DitherFilter): string {
    const { type, bits } = config.parameters;
    return `${type} (${String(bits)}-bit)`;
  }
}

export const ditherHandler = new DitherFilterHandler();
