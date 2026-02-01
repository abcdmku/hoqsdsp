import { z } from 'zod';
import type { CompressorFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Compressor parameters schema
export const compressorParametersSchema = z.object({
  threshold: z.number().max(0, 'Threshold must be 0 dB or below'),
  factor: z.number().min(1, 'Compression ratio must be at least 1:1'),
  attack: z.number().min(0, 'Attack time must be non-negative'),
  release: z.number().min(0, 'Release time must be non-negative'),
  makeup_gain: z.number().optional(),
  soft_clip: z.boolean().optional(),
});

// Complete compressor filter schema
export const compressorFilterSchema = z.object({
  type: z.literal('Compressor'),
  parameters: compressorParametersSchema,
});

class CompressorFilterHandler extends BaseFilterHandler<CompressorFilter> {
  readonly type = 'Compressor' as const;
  readonly schema = compressorFilterSchema;

  serialize(config: CompressorFilter): Record<string, unknown> {
    return {
      type: 'Compressor',
      parameters: config.parameters,
    };
  }

  getDefault(): CompressorFilter {
    return {
      type: 'Compressor',
      parameters: {
        threshold: -20,
        factor: 4,
        attack: 10,
        release: 100,
        makeup_gain: 0,
        soft_clip: false,
      },
    };
  }

  getDisplayName(_config: CompressorFilter): string {
    return 'Compressor';
  }

  getSummary(config: CompressorFilter): string {
    const params = config.parameters;
    const ratio = params.factor >= 100 ? '∞' : String(params.factor);
    return `${String(params.threshold)}dB ${ratio}:1`;
  }
}

export const compressorHandler = new CompressorFilterHandler();
