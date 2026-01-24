import { parse, stringify } from 'yaml';
import type { CamillaConfig } from '../../types';
import { validateConfig, isConfigLike } from './validation';
import type { ConfigValidationResult } from './validation';

export interface ParseResult {
  success: boolean;
  config?: CamillaConfig;
  yamlError?: string;
  validation?: ConfigValidationResult;
}

/**
 * Parse a YAML string into a CamillaDSP configuration
 */
export function parseYamlConfig(yamlString: string): ParseResult {
  // First, try to parse the YAML
  let parsed: unknown;
  try {
    parsed = parse(yamlString);
  } catch (error) {
    return {
      success: false,
      yamlError:
        error instanceof Error ? error.message : 'Invalid YAML syntax',
    };
  }

  // Check if it looks like a config
  if (!isConfigLike(parsed)) {
    return {
      success: false,
      yamlError:
        'Invalid configuration structure: missing required fields (devices, pipeline)',
    };
  }

  // Validate the configuration
  const validation = validateConfig(parsed);

  if (!validation.valid) {
    return {
      success: false,
      validation,
    };
  }

  return {
    success: true,
    config: validation.config,
    validation,
  };
}

export interface StringifyOptions {
  /**
   * Include comments with descriptions
   */
  includeComments?: boolean;
  /**
   * Indentation level (spaces)
   */
  indent?: number;
  /**
   * Line width before wrapping
   */
  lineWidth?: number;
}

/**
 * Convert a CamillaDSP configuration to YAML string
 */
export function stringifyConfig(
  config: CamillaConfig,
  options: StringifyOptions = {},
): string {
  const { indent = 2, lineWidth = 80 } = options;

  return stringify(config, {
    indent,
    lineWidth,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
    nullStr: '',
    sortMapEntries: false,
  });
}

/**
 * Parse a JSON string into a CamillaDSP configuration
 */
export function parseJsonConfig(jsonString: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      yamlError:
        error instanceof Error ? error.message : 'Invalid JSON syntax',
    };
  }

  if (!isConfigLike(parsed)) {
    return {
      success: false,
      yamlError:
        'Invalid configuration structure: missing required fields (devices, pipeline)',
    };
  }

  const validation = validateConfig(parsed);

  if (!validation.valid) {
    return {
      success: false,
      validation,
    };
  }

  return {
    success: true,
    config: validation.config,
    validation,
  };
}

/**
 * Convert a CamillaDSP configuration to JSON string
 */
export function stringifyConfigJson(
  config: CamillaConfig,
  pretty = true,
): string {
  return JSON.stringify(config, null, pretty ? 2 : undefined);
}

/**
 * Detect if a string is YAML or JSON
 */
export function detectFormat(content: string): 'yaml' | 'json' | 'unknown' {
  const trimmed = content.trim();

  // JSON starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  // YAML typically has key: value format or starts with ---
  if (trimmed.startsWith('---') || /^\w+:/m.test(trimmed)) {
    return 'yaml';
  }

  return 'unknown';
}

/**
 * Parse config from file content, auto-detecting format
 */
export function parseConfigAuto(content: string): ParseResult {
  const format = detectFormat(content);

  if (format === 'json') {
    return parseJsonConfig(content);
  }

  // Default to YAML (more permissive)
  return parseYamlConfig(content);
}
