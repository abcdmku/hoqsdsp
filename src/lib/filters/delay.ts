import { z } from 'zod';
import type { DelayFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Delay unit schema
const delayUnitSchema = z.enum(['ms', 'samples', 'mm']);

// Delay parameters schema
export const delayParametersSchema = z.object({
  delay: z.number().min(0),
  unit: delayUnitSchema,
  subsample: z.boolean(),
});

// Complete delay filter schema
export const delayFilterSchema = z.object({
  type: z.literal('Delay'),
  parameters: delayParametersSchema,
});

// Handler implementation
class DelayFilterHandler extends BaseFilterHandler<DelayFilter> {
  readonly type = 'Delay' as const;
  readonly schema = delayFilterSchema;

  serialize(config: DelayFilter): Record<string, unknown> {
    return {
      type: 'Delay',
      parameters: config.parameters,
    };
  }

  getDefault(): DelayFilter {
    return {
      type: 'Delay',
      parameters: {
        delay: 0,
        unit: 'ms',
        subsample: false,
      },
    };
  }

  getDisplayName(config: DelayFilter): string {
    return `Delay (${config.parameters.unit})`;
  }

  getSummary(config: DelayFilter): string {
    const { delay, unit, subsample } = config.parameters;
    const subsampleStr = subsample ? ' (subsample)' : '';
    return `${String(delay)}${unit}${subsampleStr}`;
  }
}

export const delayHandler = new DelayFilterHandler();
