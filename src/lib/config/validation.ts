import { z } from 'zod';
import type { CamillaConfig } from '../../types';

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
  inverted: z.boolean().optional(),
  mute: z.boolean().optional(),
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

// Pipeline step schema
const pipelineStepSchema = z.object({
  type: z.enum(['Mixer', 'Filter']),
  name: z.string(),
  channel: z.number().int().min(0).optional(),
  channels: z.array(z.number().int().min(0)).optional(),
});

// Complete CamillaDSP configuration schema
export const camillaConfigSchema = z.object({
  devices: devicesConfigSchema,
  mixers: z.record(z.string(), mixerConfigSchema).optional(),
  filters: z.record(z.string(), filterConfigSchema).optional(),
  pipeline: z.array(pipelineStepSchema),
  title: z.string().optional(),
  description: z.string().optional(),
});

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
  config?: CamillaConfig;
}

export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * Validate a CamillaDSP configuration object
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // Schema validation
  const result = camillaConfigSchema.safeParse(config);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }
    return { valid: false, errors, warnings };
  }

  const validConfig = result.data as CamillaConfig;

  // Additional semantic validation
  const semanticResult = validateSemantics(validConfig);
  errors.push(...semanticResult.errors);
  warnings.push(...semanticResult.warnings);

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return { valid: true, errors: [], warnings, config: validConfig };
}

/**
 * Perform semantic validation beyond schema checks
 */
function validateSemantics(
  config: CamillaConfig,
): { errors: ConfigValidationError[]; warnings: ConfigValidationWarning[] } {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // Check that pipeline references valid mixers and filters
  for (let i = 0; i < config.pipeline.length; i++) {
    const step = config.pipeline[i]!;

    if (step.type === 'Mixer') {
      if (!config.mixers || !(step.name in config.mixers)) {
        errors.push({
          path: `pipeline[${i}].name`,
          message: `Mixer "${step.name}" is not defined in mixers`,
          code: 'undefined_mixer',
        });
      }
    } else if (step.type === 'Filter') {
      if (!config.filters || !(step.name in config.filters)) {
        errors.push({
          path: `pipeline[${i}].name`,
          message: `Filter "${step.name}" is not defined in filters`,
          code: 'undefined_filter',
        });
      }
    }
  }

  // Warn about unused filters
  if (config.filters) {
    const usedFilters = new Set(
      config.pipeline
        .filter((step) => step.type === 'Filter')
        .map((step) => step.name),
    );

    for (const filterName of Object.keys(config.filters)) {
      if (!usedFilters.has(filterName)) {
        warnings.push({
          path: `filters.${filterName}`,
          message: `Filter "${filterName}" is defined but not used in the pipeline`,
          code: 'unused_filter',
        });
      }
    }
  }

  // Warn about unused mixers
  if (config.mixers) {
    const usedMixers = new Set(
      config.pipeline
        .filter((step) => step.type === 'Mixer')
        .map((step) => step.name),
    );

    for (const mixerName of Object.keys(config.mixers)) {
      if (!usedMixers.has(mixerName)) {
        warnings.push({
          path: `mixers.${mixerName}`,
          message: `Mixer "${mixerName}" is defined but not used in the pipeline`,
          code: 'unused_mixer',
        });
      }
    }
  }

  // Check sample rate is reasonable
  if (config.devices.samplerate < 44100) {
    warnings.push({
      path: 'devices.samplerate',
      message: `Sample rate ${config.devices.samplerate} Hz is lower than CD quality (44100 Hz)`,
      code: 'low_samplerate',
    });
  }

  // Check chunk size is a power of 2 (common optimization)
  const chunksize = config.devices.chunksize;
  if ((chunksize & (chunksize - 1)) !== 0) {
    warnings.push({
      path: 'devices.chunksize',
      message: `Chunk size ${chunksize} is not a power of 2, which may affect performance`,
      code: 'non_power_of_two_chunksize',
    });
  }

  return { errors, warnings };
}

/**
 * Check if an object looks like a valid CamillaDSP config (quick check)
 */
export function isConfigLike(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // Must have devices and pipeline at minimum
  return (
    'devices' in record &&
    'pipeline' in record &&
    typeof record.devices === 'object' &&
    record.devices !== null &&
    Array.isArray(record.pipeline)
  );
}
