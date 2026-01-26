import { z } from 'zod';
import type { GainFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Scale schema
const scaleSchema = z.enum(['dB', 'linear']).optional();

// Helper to handle null -> undefined conversion
const nullableBoolean = z.preprocess(
  (val) => (val === null ? undefined : val),
  z.boolean().optional(),
);

// Gain parameters schema
export const gainParametersSchema = z.object({
  gain: z.number(),
  inverted: nullableBoolean,
  scale: scaleSchema,
});

// Complete gain filter schema
export const gainFilterSchema = z.object({
  type: z.literal('Gain'),
  parameters: gainParametersSchema,
});

// Handler implementation
class GainFilterHandler extends BaseFilterHandler<GainFilter> {
  readonly type = 'Gain' as const;
  readonly schema = gainFilterSchema;

  serialize(config: GainFilter): Record<string, unknown> {
    return {
      type: 'Gain',
      parameters: config.parameters,
    };
  }

  getDefault(): GainFilter {
    return {
      type: 'Gain',
      parameters: {
        gain: 0,
        inverted: false,
        scale: 'dB',
      },
    };
  }

  getDisplayName(config: GainFilter): string {
    const scale = config.parameters.scale ?? 'dB';
    return scale === 'linear' ? 'Gain (linear)' : 'Gain (dB)';
  }

  getSummary(config: GainFilter): string {
    const { gain, inverted, scale } = config.parameters;
    const scaleUnit = scale === 'linear' ? 'x' : 'dB';
    const invertedStr = inverted ? ' (inverted)' : '';
    const gainStr = scale === 'dB' && gain > 0 ? `+${String(gain)}` : String(gain);
    return `${gainStr}${scaleUnit}${invertedStr}`;
  }
}

export const gainHandler = new GainFilterHandler();
