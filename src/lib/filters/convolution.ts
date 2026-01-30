import { z } from 'zod';
import type { ConvolutionFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Format types for Raw convolution
const rawFormatSchema = z.enum([
  'TEXT',
  'FLOAT32LE',
  'FLOAT64LE',
  'S16LE',
  'S24LE',
  'S24LE3',
  'S32LE',
]);

// Individual convolution type schemas
const rawConvSchema = z.object({
  type: z.literal('Raw'),
  filename: z.string().min(1),
  format: rawFormatSchema.optional(),
  skip_bytes_lines: z.number().int().min(0).optional(),
  read_bytes_lines: z.number().int().min(1).optional(),
});

const wavConvSchema = z.object({
  type: z.literal('Wav'),
  filename: z.string().min(1),
  channel: z.number().int().min(0).optional(),
});

const valuesConvSchema = z.object({
  type: z.literal('Values'),
  values: z.array(z.number()).min(1),
});

// Combined convolution parameters schema
export const convolutionParametersSchema = z.discriminatedUnion('type', [
  rawConvSchema,
  wavConvSchema,
  valuesConvSchema,
]);

// Complete convolution filter schema
export const convolutionFilterSchema = z.object({
  type: z.literal('Conv'),
  parameters: convolutionParametersSchema,
});

// Handler implementation
class ConvolutionFilterHandler extends BaseFilterHandler<ConvolutionFilter> {
  readonly type = 'Conv' as const;
  readonly schema = convolutionFilterSchema;

  serialize(config: ConvolutionFilter): Record<string, unknown> {
    return {
      type: 'Conv',
      parameters: config.parameters,
    };
  }

  getDefault(): ConvolutionFilter {
    return {
      type: 'Conv',
      parameters: {
        type: 'Values',
        values: [1],
      },
    };
  }

  getDisplayName(config: ConvolutionFilter): string {
    return config.parameters.type === 'Values' ? 'FIR Phase Correction' : `Convolution (${config.parameters.type})`;
  }

  getSummary(config: ConvolutionFilter): string {
    const params = config.parameters;

    switch (params.type) {
      case 'Raw':
      case 'Wav': {
        const filename = params.filename.split(/[\\/]/).pop() ?? params.filename;
        return params.type === 'Wav' && params.channel !== undefined
          ? `${filename} (ch${String(params.channel)})`
          : filename;
      }
      case 'Values':
        return `${String(params.values.length)} taps`;
      default:
        return 'FIR filter';
    }
  }
}

export const convolutionHandler = new ConvolutionFilterHandler();
