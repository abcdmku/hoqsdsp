import { z } from 'zod';
import type { DitherFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Dither type schema
const ditherTypeSchema = z.enum([
  'Simple',
  'Uniform',
  'Lipshitz441',
  'Fweighted441',
  'Shibata441',
  'Shibata48',
  'ShibataLow441',
  'ShibataLow48',
  'None',
]);

// Dither parameters schema
export const ditherParametersSchema = z.object({
  type: ditherTypeSchema,
  bits: z.number().int().min(1).max(32),
});

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
        type: 'Simple',
        bits: 16,
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
