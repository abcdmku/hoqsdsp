import { z } from 'zod';
import type { DiffEqFilter } from '../../types';
import { BaseFilterHandler } from './types';

// DiffEq parameters schema
export const diffeqParametersSchema = z.object({
  a: z.array(z.number()).min(1, 'At least one "a" coefficient is required'),
  b: z.array(z.number()).min(1, 'At least one "b" coefficient is required'),
});

// Complete diffeq filter schema
export const diffeqFilterSchema = z.object({
  type: z.literal('DiffEq'),
  parameters: diffeqParametersSchema,
});

class DiffEqFilterHandler extends BaseFilterHandler<DiffEqFilter> {
  readonly type = 'DiffEq' as const;
  readonly schema = diffeqFilterSchema;

  serialize(config: DiffEqFilter): Record<string, unknown> {
    return {
      type: 'DiffEq',
      parameters: config.parameters,
    };
  }

  getDefault(): DiffEqFilter {
    return {
      type: 'DiffEq',
      parameters: {
        a: [1.0],
        b: [1.0],
      },
    };
  }

  getDisplayName(_config: DiffEqFilter): string {
    return 'DiffEq';
  }

  getSummary(config: DiffEqFilter): string {
    const params = config.parameters;
    return `a[${String(params.a.length)}] b[${String(params.b.length)}]`;
  }
}

export const diffeqHandler = new DiffEqFilterHandler();
