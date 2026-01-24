import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseFilterHandler, zodToValidationResult } from './types';
import type { GainFilter } from '../../types';

// Create a simple test handler for GainFilter
class TestGainHandler extends BaseFilterHandler<GainFilter> {
  readonly type = 'Gain' as const;
  readonly schema = z.object({
    type: z.literal('Gain'),
    parameters: z.object({
      gain: z.number(),
      inverted: z.boolean().optional(),
      scale: z.enum(['dB', 'linear']).optional(),
    }),
  });

  serialize(config: GainFilter): Record<string, unknown> {
    return {
      type: 'Gain',
      parameters: {
        gain: config.parameters.gain,
        ...(config.parameters.inverted !== undefined && { inverted: config.parameters.inverted }),
        ...(config.parameters.scale && { scale: config.parameters.scale }),
      },
    };
  }

  getDefault(): GainFilter {
    return {
      type: 'Gain',
      parameters: {
        gain: 0,
        inverted: false,
        scale: 'dB',
      },
    };
  }

  getDisplayName(config: GainFilter): string {
    return `Gain: ${String(config.parameters.gain)}${config.parameters.scale === 'linear' ? '' : ' dB'}`;
  }

  getSummary(config: GainFilter): string {
    const sign = config.parameters.gain >= 0 ? '+' : '';
    const unit = config.parameters.scale === 'linear' ? '' : ' dB';
    const inverted = config.parameters.inverted ? ' (inverted)' : '';
    return `${sign}${String(config.parameters.gain)}${unit}${inverted}`;
  }
}

describe('zodToValidationResult', () => {
  it('should return success for valid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = schema.safeParse({ name: 'John', age: 30 });
    const validationResult = zodToValidationResult(result);

    expect(validationResult.success).toBe(true);
    expect(validationResult.errors).toBeUndefined();
  });

  it('should return errors for invalid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = schema.safeParse({ name: 123, age: 'invalid' });
    const validationResult = zodToValidationResult(result);

    expect(validationResult.success).toBe(false);
    expect(validationResult.errors).toBeDefined();
    expect(validationResult.errors).toHaveLength(2);
  });

  it('should convert error paths to string arrays', () => {
    const schema = z.object({
      nested: z.object({
        field: z.string(),
      }),
    });

    const result = schema.safeParse({ nested: { field: 123 } });
    const validationResult = zodToValidationResult(result);

    expect(validationResult.success).toBe(false);
    expect(validationResult.errors).toBeDefined();

    const firstError = validationResult.errors?.[0];
    expect(firstError).toBeDefined();
    if (!firstError) {
      throw new Error('Expected validation errors');
    }

    expect(firstError.path).toEqual(['nested', 'field']);
    expect(firstError.message).toBeDefined();
  });

  it('should handle array index paths', () => {
    const schema = z.object({
      items: z.array(z.number()),
    });

    const result = schema.safeParse({ items: [1, 'invalid', 3] });
    const validationResult = zodToValidationResult(result);

    expect(validationResult.success).toBe(false);
    expect(validationResult.errors).toBeDefined();

    const firstError = validationResult.errors?.[0];
    expect(firstError).toBeDefined();
    if (!firstError) {
      throw new Error('Expected validation errors');
    }

    expect(firstError.path).toEqual(['items', '1']);
  });
});

describe('BaseFilterHandler', () => {
  let handler: TestGainHandler;

  beforeEach(() => {
    handler = new TestGainHandler();
  });

  describe('type property', () => {
    it('should have correct type identifier', () => {
      expect(handler.type).toBe('Gain');
    });
  });

  describe('schema property', () => {
    it('should have a Zod schema', () => {
      expect(handler.schema).toBeDefined();
      expect(typeof handler.schema.parse).toBe('function');
    });
  });

  describe('parse', () => {
    it('should parse valid filter config', () => {
      const raw = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          inverted: false,
          scale: 'dB',
        },
      };

      const parsed = handler.parse(raw);

      expect(parsed).toEqual(raw);
      expect(parsed.type).toBe('Gain');
      expect(parsed.parameters.gain).toBe(6.0);
    });

    it('should parse config with optional fields omitted', () => {
      const raw = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
        },
      };

      const parsed = handler.parse(raw);

      expect(parsed.type).toBe('Gain');
      expect(parsed.parameters.gain).toBe(6.0);
    });

    it('should throw error for invalid config', () => {
      const raw = {
        type: 'Gain',
        parameters: {
          gain: 'invalid',
        },
      };

      expect(() => handler.parse(raw)).toThrow();
    });

    it('should throw error for wrong filter type', () => {
      const raw = {
        type: 'Biquad',
        parameters: {
          gain: 6.0,
        },
      };

      expect(() => handler.parse(raw)).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const raw = {
        type: 'Gain',
        parameters: {},
      };

      expect(() => handler.parse(raw)).toThrow();
    });
  });

  describe('validate', () => {
    it('should validate correct filter config', () => {
      const config = {
        type: 'Gain',
        parameters: {
          gain: -3.5,
          inverted: true,
          scale: 'dB',
        },
      };

      const result = handler.validate(config);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid filter config', () => {
      const config = {
        type: 'Gain',
        parameters: {
          gain: 'not a number',
        },
      };

      const result = handler.validate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    });

    it('should validate config with minimal required fields', () => {
      const config = {
        type: 'Gain',
        parameters: {
          gain: 0,
        },
      };

      const result = handler.validate(config);

      expect(result.success).toBe(true);
    });

    it('should reject invalid enum values', () => {
      const config = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          scale: 'invalid',
        },
      };

      const result = handler.validate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should include error paths in validation result', () => {
      const config = {
        type: 'Gain',
        parameters: {
          gain: 'invalid',
          inverted: 'not a boolean',
        },
      };

      const result = handler.validate(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      const errors = result.errors ?? [];
      expect(errors.some((err) => err.path.includes('gain'))).toBe(true);
      expect(errors.some((err) => err.path.includes('inverted'))).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should serialize filter config to CamillaDSP format', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          inverted: false,
          scale: 'dB',
        },
      };

      const serialized = handler.serialize(config);

      expect(serialized).toEqual({
        type: 'Gain',
        parameters: {
          gain: 6.0,
          inverted: false,
          scale: 'dB',
        },
      });
    });

    it('should serialize config with optional fields omitted', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
        },
      };

      const serialized = handler.serialize(config);

      expect(serialized).toEqual({
        type: 'Gain',
        parameters: {
          gain: 6.0,
        },
      });
    });
  });

  describe('getDefault', () => {
    it('should return default filter config', () => {
      const defaultConfig = handler.getDefault();

      expect(defaultConfig).toEqual({
        type: 'Gain',
        parameters: {
          gain: 0,
          inverted: false,
          scale: 'dB',
        },
      });
    });

    it('should return valid config according to schema', () => {
      const defaultConfig = handler.getDefault();
      const result = handler.validate(defaultConfig);

      expect(result.success).toBe(true);
    });
  });

  describe('getDisplayName', () => {
    it('should return display name for dB scale', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          scale: 'dB',
        },
      };

      expect(handler.getDisplayName(config)).toBe('Gain: 6 dB');
    });

    it('should return display name for linear scale', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 2.0,
          scale: 'linear',
        },
      };

      expect(handler.getDisplayName(config)).toBe('Gain: 2');
    });

    it('should handle default scale (dB)', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: -3.5,
        },
      };

      expect(handler.getDisplayName(config)).toBe('Gain: -3.5 dB');
    });
  });

  describe('getSummary', () => {
    it('should return summary with positive gain', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          scale: 'dB',
        },
      };

      expect(handler.getSummary(config)).toBe('+6 dB');
    });

    it('should return summary with negative gain', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: -3.5,
          scale: 'dB',
        },
      };

      expect(handler.getSummary(config)).toBe('-3.5 dB');
    });

    it('should return summary with inverted flag', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 6.0,
          inverted: true,
          scale: 'dB',
        },
      };

      expect(handler.getSummary(config)).toBe('+6 dB (inverted)');
    });

    it('should return summary for linear scale', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 2.0,
          scale: 'linear',
        },
      };

      expect(handler.getSummary(config)).toBe('+2');
    });

    it('should handle zero gain', () => {
      const config: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 0,
          scale: 'dB',
        },
      };

      expect(handler.getSummary(config)).toBe('+0 dB');
    });
  });
});
