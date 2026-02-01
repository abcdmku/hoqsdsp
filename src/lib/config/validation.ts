import type { CamillaConfig } from '../../types';
import { camillaConfigSchema } from './validationSchemas';

export { camillaConfigSchema };

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
      // CamillaDSP Filter steps use 'names' (plural array)
      for (const filterName of step.names) {
        if (!config.filters || !(filterName in config.filters)) {
          errors.push({
            path: `pipeline[${i}].names`,
            message: `Filter "${filterName}" is not defined in filters`,
            code: 'undefined_filter',
          });
        }
      }
    } else if (step.type === 'Processor') {
      if (!config.processors || !(step.name in config.processors)) {
        errors.push({
          path: `pipeline[${i}].name`,
          message: `Processor "${step.name}" is not defined in processors`,
          code: 'undefined_processor',
        });
      }
    }
  }

  // Warn about unused filters
  if (config.filters) {
    const usedFilters = new Set(
      config.pipeline
        .filter((step): step is { type: 'Filter'; names: string[]; channels: number[] } => step.type === 'Filter')
        .flatMap((step) => step.names),
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

  // Warn about unused processors
  if (config.processors) {
    const usedProcessors = new Set(
      config.pipeline
        .filter((step) => step.type === 'Processor')
        .map((step) => step.name),
    );

    for (const processorName of Object.keys(config.processors)) {
      if (!usedProcessors.has(processorName)) {
        warnings.push({
          path: `processors.${processorName}`,
          message: `Processor "${processorName}" is defined but not used in the pipeline`,
          code: 'unused_processor',
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

