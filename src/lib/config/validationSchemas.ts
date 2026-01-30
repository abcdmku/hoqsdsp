import { z } from 'zod';

// Device configuration schemas
const sampleFormatSchema = z.enum([
  'S16LE',
  'S24LE',
  'S24LE3',
  'S32LE',
  'FLOAT32LE',
  'FLOAT64LE',
]);

const resamplerTypeSchema = z.enum(['Synchronous', 'AsyncSinc', 'AsyncPoly']);

const captureDeviceSchema = z.object({
  type: z.string(),
  channels: z.number().int().min(1).max(128),
  device: z.string().optional(),
  format: sampleFormatSchema.optional(),
});

const playbackDeviceSchema = z.object({
  type: z.string(),
  channels: z.number().int().min(1).max(128),
  device: z.string().optional(),
  format: sampleFormatSchema.optional(),
});

const devicesConfigSchema = z.object({
  samplerate: z.number().int().min(8000).max(768000),
  chunksize: z.number().int().min(1).max(65536),
  capture: captureDeviceSchema,
  playback: playbackDeviceSchema,
  enable_rate_adjust: z.boolean().optional(),
  target_level: z.number().optional(),
  adjust_period: z.number().optional(),
  resampler_type: resamplerTypeSchema.optional(),
});

// Mixer configuration schemas
const mixerSourceSchema = z.object({
  channel: z.number().int().min(0),
  gain: z.number(),
  inverted: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.boolean().optional(),
  ),
  mute: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.boolean().optional(),
  ),
});

const mixerMappingSchema = z.object({
  dest: z.number().int().min(0),
  sources: z.array(mixerSourceSchema),
});

const mixerConfigSchema = z.object({
  channels: z.object({
    in: z.number().int().min(1),
    out: z.number().int().min(1),
  }),
  mapping: z.array(mixerMappingSchema),
});

// Filter configuration schemas - simplified for validation
// More detailed validation is done by individual filter handlers
const filterConfigSchema = z.object({
  type: z.enum([
    'Biquad',
    'Conv',
    'Delay',
    'Gain',
    'Volume',
    'Dither',
    'DiffEq',
    'Compressor',
    'Loudness',
    'NoiseGate',
  ]),
  // Parameters can be any value - detailed validation is done by filter handlers
  parameters: z.any(),
});

// Pipeline step schemas - Mixer and Filter have different formats
const mixerPipelineStepSchema = z.object({
  type: z.literal('Mixer'),
  name: z.string(),
  description: z.string().optional(),
  bypassed: z.boolean().optional(),
});

const filterPipelineStepSchema = z.object({
  type: z.literal('Filter'),
  names: z.array(z.string()),
  channels: z.array(z.number().int().min(0)).optional(),
  description: z.string().optional(),
  bypassed: z.boolean().optional(),
});

const pipelineStepSchema = z.discriminatedUnion('type', [
  mixerPipelineStepSchema,
  filterPipelineStepSchema,
]);

// UI metadata schemas (preserved by CamillaDSP but ignored by DSP engine)
const firPhaseCorrectionWindowTypeSchema = z.enum([
  'Rectangular',
  'Hann',
  'Hamming',
  'Blackman',
  'Kaiser',
]);

const firPhaseCorrectionUiSettingsSchema = z
  .object({
    version: z.number().int().optional(),
    previewEnabled: z.boolean().optional(),
    tapMode: z.enum(['latency', 'taps']).optional(),
    maxLatencyMs: z.number().min(0).optional(),
    taps: z.number().int().min(1).optional(),
    bandLowHz: z.number().min(0).optional(),
    bandHighHz: z.number().min(0).optional(),
    transitionOctaves: z.number().min(0).optional(),
    magnitudeThresholdDb: z.number().optional(),
    magnitudeTransitionDb: z.number().min(0).optional(),
    phaseHideBelowDb: z.number().optional(),
    window: firPhaseCorrectionWindowTypeSchema.optional(),
    kaiserBeta: z.number().min(0).optional(),
    normalize: z.boolean().optional(),
    selectedFilterNames: z.array(z.string()).optional(),
  })
  .passthrough();

const signalFlowUiMetadataSchema = z
  .object({
    channelColors: z.record(z.string(), z.string()).optional(),
    channelNames: z.record(z.string(), z.string()).optional(),
    mirrorGroups: z
      .object({
        input: z.array(
          z.array(
            z.object({
              deviceId: z.string(),
              channelIndex: z.number(),
            }),
          ),
        ),
        output: z.array(
          z.array(
            z.object({
              deviceId: z.string(),
              channelIndex: z.number(),
            }),
          ),
        ),
      })
      .optional(),
    channelGains: z
      .record(
        z.string(),
        z.object({
          gain: z.number(),
          inverted: z.boolean(),
        }),
      )
      .optional(),
    firPhaseCorrection: z.record(z.string(), firPhaseCorrectionUiSettingsSchema).optional(),
  })
  .passthrough()
  .optional();

const uiConfigSchema = z.object({
  signalFlow: signalFlowUiMetadataSchema,
}).optional();

// Complete CamillaDSP configuration schema
export const camillaConfigSchema = z.object({
  devices: devicesConfigSchema,
  mixers: z.record(z.string(), mixerConfigSchema).optional(),
  filters: z.record(z.string(), filterConfigSchema).optional(),
  pipeline: z.array(pipelineStepSchema),
  title: z.string().optional(),
  description: z.string().optional(),
  ui: uiConfigSchema,
});
