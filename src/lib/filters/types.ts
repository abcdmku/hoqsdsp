import type { ZodSafeParseError, ZodSafeParseSuccess, ZodType } from 'zod';
import type { FilterConfig, FilterType } from '../../types';

export interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
}

export interface FilterHandler<T extends FilterConfig = FilterConfig> {
  /** Filter type identifier */
  readonly type: FilterType;

  /** Zod schema for validation */
  readonly schema: ZodType<T>;

  /** Parse raw config into typed filter */
  parse(raw: unknown): T;

  /** Serialize filter config to CamillaDSP format */
  serialize(config: T): Record<string, unknown>;

  /** Validate filter config */
  validate(config: unknown): ValidationResult;

  /** Get default configuration */
  getDefault(): T;

  /** Get human-readable display name */
  getDisplayName(config: T): string;

  /** Get short summary for UI display */
  getSummary(config: T): string;
}

// Helper function to create validation result from Zod
export function zodToValidationResult(
  result: ZodSafeParseSuccess<unknown> | ZodSafeParseError<unknown>,
): ValidationResult {
  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  };
}

// Base class for filter handlers
export abstract class BaseFilterHandler<T extends FilterConfig> implements FilterHandler<T> {
  abstract readonly type: FilterType;
  abstract readonly schema: ZodType<T>;

  parse(raw: unknown): T {
    return this.schema.parse(raw);
  }

  validate(config: unknown): ValidationResult {
    return zodToValidationResult(this.schema.safeParse(config));
  }

  abstract serialize(config: T): Record<string, unknown>;
  abstract getDefault(): T;
  abstract getDisplayName(config: T): string;
  abstract getSummary(config: T): string;
}
