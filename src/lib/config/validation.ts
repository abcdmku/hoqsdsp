import type { CamillaConfig } from '../../types';
import { camillaConfigSchema } from './validationSchemas';
import { filterRegistry } from '../filters/registry';

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

  // Validate filter parameter shapes using our per-filter schemas.
  // This catches many "silent" SetConfig(SetConfigJson) failures early.
  if (config.filters) {
    for (const [filterName, filterConfig] of Object.entries(config.filters)) {
      const handler = filterRegistry.get(filterConfig.type);
      if (!handler) {
        errors.push({
          path: `filters.${filterName}.type`,
          message: `Unsupported filter type "${filterConfig.type}"`,
          code: 'unsupported_filter_type',
        });
        continue;
      }

      const parsed = handler.schema.safeParse(filterConfig);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const suffix = issue.path.length > 0 ? `.${issue.path.join('.')}` : '';
          errors.push({
            path: `filters.${filterName}${suffix}`,
            message: issue.message,
            code: issue.code,
          });
        }
      }
    }
  }

  // Check that pipeline references valid mixers and filters
  let currentChannels = config.devices.capture.channels;
  for (let i = 0; i < config.pipeline.length; i++) {
    const step = config.pipeline[i]!;

    if (step.type === 'Mixer') {
      if (!config.mixers || !(step.name in config.mixers)) {
        errors.push({
          path: `pipeline[${i}].name`,
          message: `Mixer "${step.name}" is not defined in mixers`,
          code: 'undefined_mixer',
        });
      } else {
        const mixer = config.mixers[step.name]!;
        const expectedIn = mixer.channels.in;
        if (expectedIn !== currentChannels) {
          errors.push({
            path: `pipeline[${i}].name`,
            message: `Mixer "${step.name}" expects ${String(expectedIn)} input channels, but pipeline has ${String(currentChannels)} at this step`,
            code: 'mixer_channel_mismatch',
          });
        }

        // Validate mapping ranges (CamillaDSP tends to reject configs with out-of-range channels).
        for (let j = 0; j < mixer.mapping.length; j++) {
          const mapping = mixer.mapping[j]!;
          if (mapping.dest < 0 || mapping.dest >= mixer.channels.out) {
            errors.push({
              path: `mixers.${step.name}.mapping[${j}].dest`,
              message: `Destination channel ${String(mapping.dest)} is out of range (0..${String(mixer.channels.out - 1)})`,
              code: 'mixer_dest_out_of_range',
            });
          }

          for (let k = 0; k < mapping.sources.length; k++) {
            const source = mapping.sources[k]!;
            if (source.channel < 0 || source.channel >= mixer.channels.in) {
              errors.push({
                path: `mixers.${step.name}.mapping[${j}].sources[${k}].channel`,
                message: `Source channel ${String(source.channel)} is out of range (0..${String(mixer.channels.in - 1)})`,
                code: 'mixer_source_out_of_range',
              });
            }
          }
        }

        currentChannels = mixer.channels.out;
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

      if (step.channels) {
        for (let c = 0; c < step.channels.length; c++) {
          const channel = step.channels[c]!;
          if (channel < 0 || channel >= currentChannels) {
            errors.push({
              path: `pipeline[${i}].channels[${c}]`,
              message: `Channel index ${String(channel)} is out of range (0..${String(currentChannels - 1)}) at this step`,
              code: 'pipeline_channel_out_of_range',
            });
          }
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

  // Rough sanity check: the pipeline's final channel count should match the playback device.
  // (If you intentionally downmix/upmix, add an explicit mixer stage to make it unambiguous.)
  if (currentChannels !== config.devices.playback.channels) {
    errors.push({
      path: 'devices.playback.channels',
      message: `Playback device expects ${String(config.devices.playback.channels)} channels, but pipeline ends with ${String(currentChannels)} channels`,
      code: 'playback_channel_mismatch',
    });
  }

  // Warn about unused filters
  if (config.filters) {
    const usedFilters = new Set(
      config.pipeline
        .filter((step): step is { type: 'Filter'; names: string[]; channels?: number[] } => step.type === 'Filter')
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

