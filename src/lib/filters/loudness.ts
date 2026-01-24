import { z } from 'zod';
import type { LoudnessFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Loudness parameters schema
export const loudnessParametersSchema = z.object({
  reference_level: z.number(),
  high_boost: z.number().min(0).max(20),
  low_boost: z.number().min(0).max(20),
});

// Complete loudness filter schema
export const loudnessFilterSchema = z.object({
  type: z.literal('Loudness'),
  parameters: loudnessParametersSchema,
});

class LoudnessFilterHandler extends BaseFilterHandler<LoudnessFilter> {
  readonly type = 'Loudness' as const;
  readonly schema = loudnessFilterSchema;

  serialize(config: LoudnessFilter): Record<string, unknown> {
    return {
      type: 'Loudness',
      parameters: config.parameters,
    };
  }

  getDefault(): LoudnessFilter {
    return {
      type: 'Loudness',
      parameters: {
        reference_level: -25,
        high_boost: 5,
        low_boost: 10,
      },
    };
  }

  getDisplayName(_config: LoudnessFilter): string {
    return 'Loudness';
  }

  getSummary(config: LoudnessFilter): string {
    const params = config.parameters;
    return `Ref: ${String(params.reference_level)}dB`;
  }
}

export const loudnessHandler = new LoudnessFilterHandler();
