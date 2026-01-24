import { z } from 'zod';
import type { BiquadFilter } from '../../types';
import { BaseFilterHandler } from './types';

// Base parameter schemas
const freqSchema = z.number().min(1).max(24000).describe('Frequency in Hz');
const qSchema = z.number().min(0.1).max(100).describe('Q factor');
const gainSchema = z.number().min(-40).max(40).describe('Gain in dB');
const slopeSchema = z.number().min(0.1).max(12).describe('Shelf slope');
const orderSchema = z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]);

// Individual biquad type schemas
const lowpassSchema = z.object({
  type: z.literal('Lowpass'),
  freq: freqSchema,
  q: qSchema,
});

const highpassSchema = z.object({
  type: z.literal('Highpass'),
  freq: freqSchema,
  q: qSchema,
});

const lowpassFOSchema = z.object({
  type: z.literal('LowpassFO'),
  freq: freqSchema,
});

const highpassFOSchema = z.object({
  type: z.literal('HighpassFO'),
  freq: freqSchema,
});

const peakingSchema = z.object({
  type: z.literal('Peaking'),
  freq: freqSchema,
  gain: gainSchema,
  q: qSchema,
});

const lowshelfSchema = z.object({
  type: z.literal('Lowshelf'),
  freq: freqSchema,
  gain: gainSchema,
  slope: slopeSchema,
});

const highshelfSchema = z.object({
  type: z.literal('Highshelf'),
  freq: freqSchema,
  gain: gainSchema,
  slope: slopeSchema,
});

const lowshelfFOSchema = z.object({
  type: z.literal('LowshelfFO'),
  freq: freqSchema,
  gain: gainSchema,
});

const highshelfFOSchema = z.object({
  type: z.literal('HighshelfFO'),
  freq: freqSchema,
  gain: gainSchema,
});

const notchSchema = z.object({
  type: z.literal('Notch'),
  freq: freqSchema,
  q: qSchema,
});

const bandpassSchema = z.object({
  type: z.literal('Bandpass'),
  freq: freqSchema,
  q: qSchema,
});

const allpassSchema = z.object({
  type: z.literal('Allpass'),
  freq: freqSchema,
  q: qSchema,
});

const allpassFOSchema = z.object({
  type: z.literal('AllpassFO'),
  freq: freqSchema,
});

const linkwitzTransformSchema = z.object({
  type: z.literal('LinkwitzTransform'),
  freq_act: freqSchema,
  q_act: qSchema,
  freq_target: freqSchema,
  q_target: qSchema,
});

const butterworthLowpassSchema = z.object({
  type: z.literal('ButterworthLowpass'),
  freq: freqSchema,
  order: orderSchema,
});

const butterworthHighpassSchema = z.object({
  type: z.literal('ButterworthHighpass'),
  freq: freqSchema,
  order: orderSchema,
});

const linkwitzRileyLowpassSchema = z.object({
  type: z.literal('LinkwitzRileyLowpass'),
  freq: freqSchema,
  order: orderSchema,
});

const linkwitzRileyHighpassSchema = z.object({
  type: z.literal('LinkwitzRileyHighpass'),
  freq: freqSchema,
  order: orderSchema,
});

// Combined biquad parameters schema (discriminated union)
export const biquadParametersSchema = z.discriminatedUnion('type', [
  lowpassSchema,
  highpassSchema,
  lowpassFOSchema,
  highpassFOSchema,
  peakingSchema,
  lowshelfSchema,
  highshelfSchema,
  lowshelfFOSchema,
  highshelfFOSchema,
  notchSchema,
  bandpassSchema,
  allpassSchema,
  allpassFOSchema,
  linkwitzTransformSchema,
  butterworthLowpassSchema,
  butterworthHighpassSchema,
  linkwitzRileyLowpassSchema,
  linkwitzRileyHighpassSchema,
]);

// Complete biquad filter schema
export const biquadFilterSchema = z.object({
  type: z.literal('Biquad'),
  parameters: biquadParametersSchema,
});

// Type helpers
export type BiquadParameterType = z.infer<typeof biquadParametersSchema>['type'];

// Handler implementation
class BiquadFilterHandler extends BaseFilterHandler<BiquadFilter> {
  readonly type = 'Biquad' as const;
  readonly schema = biquadFilterSchema;

  serialize(config: BiquadFilter): Record<string, unknown> {
    return {
      type: 'Biquad',
      parameters: config.parameters,
    };
  }

  getDefault(): BiquadFilter {
    return {
      type: 'Biquad',
      parameters: {
        type: 'Peaking',
        freq: 1000,
        gain: 0,
        q: 1.0,
      },
    };
  }

  getDisplayName(config: BiquadFilter): string {
    const params = config.parameters;
    return `Biquad - ${params.type}`;
  }

  getSummary(config: BiquadFilter): string {
    const params = config.parameters;

    switch (params.type) {
      case 'Peaking':
        return `${String(params.freq)}Hz ${params.gain >= 0 ? '+' : ''}${String(params.gain)}dB Q${String(params.q)}`;
      case 'Lowpass':
      case 'Highpass':
        return `${String(params.freq)}Hz Q${String(params.q)}`;
      case 'LowpassFO':
      case 'HighpassFO':
      case 'AllpassFO':
        return `${String(params.freq)}Hz`;
      case 'Lowshelf':
      case 'Highshelf':
        return `${String(params.freq)}Hz ${params.gain > 0 ? '+' : ''}${String(params.gain)}dB`;
      case 'LowshelfFO':
      case 'HighshelfFO':
        return `${String(params.freq)}Hz ${params.gain > 0 ? '+' : ''}${String(params.gain)}dB`;
      case 'Notch':
      case 'Bandpass':
      case 'Allpass':
        return `${String(params.freq)}Hz Q${String(params.q)}`;
      case 'LinkwitzTransform':
        return `${String(params.freq_act)}Hz → ${String(params.freq_target)}Hz`;
      case 'ButterworthLowpass':
      case 'ButterworthHighpass':
      case 'LinkwitzRileyLowpass':
      case 'LinkwitzRileyHighpass':
        return `${String(params.freq)}Hz ${String(params.order)}th order`;
      default:
        return 'Biquad';
    }
  }
}

export const biquadHandler = new BiquadFilterHandler();
