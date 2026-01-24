import { describe, it, expect } from 'vitest';
import { ditherHandler, ditherFilterSchema } from './dither';
import type { DitherFilter } from '../../types';

describe('DitherFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid dither filter', () => {
      const filter: DitherFilter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 16,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate all dither types', () => {
      const ditherTypes = [
        'Simple',
        'Uniform',
        'Lipshitz441',
        'Fweighted441',
        'Shibata441',
        'Shibata48',
        'ShibataLow441',
        'ShibataLow48',
        'None',
      ] as const;

      ditherTypes.forEach((ditherType) => {
        const filter: DitherFilter = {
          type: 'Dither',
          parameters: {
            type: ditherType,
            bits: 16,
          },
        };

        const result = ditherFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    it('should validate minimum bits', () => {
      const filter: DitherFilter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 1,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate maximum bits', () => {
      const filter: DitherFilter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 32,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject invalid dither type', () => {
      const filter = {
        type: 'Dither',
        parameters: {
          type: 'InvalidType',
          bits: 16,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject bits less than 1', () => {
      const filter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 0,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject bits greater than 32', () => {
      const filter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 33,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer bits', () => {
      const filter = {
        type: 'Dither',
        parameters: {
          type: 'Simple',
          bits: 16.5,
        },
      };

      const result = ditherFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default dither filter', () => {
        const defaultFilter = ditherHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Dither',
          parameters: {
            type: 'Simple',
            bits: 16,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = ditherHandler.getDefault();
        const result = ditherHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize dither filter', () => {
        const filter: DitherFilter = {
          type: 'Dither',
          parameters: {
            type: 'Shibata441',
            bits: 24,
          },
        };

        const serialized = ditherHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Dither',
          parameters: {
            type: 'Shibata441',
            bits: 24,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name', () => {
        const filter: DitherFilter = {
          type: 'Dither',
          parameters: {
            type: 'Shibata441',
            bits: 16,
          },
        };

        const displayName = ditherHandler.getDisplayName(filter);

        expect(displayName).toBe('Dither (Shibata441)');
      });
    });

    describe('getSummary', () => {
      it('should return summary with type and bits', () => {
        const filter: DitherFilter = {
          type: 'Dither',
          parameters: {
            type: 'Simple',
            bits: 16,
          },
        };

        const summary = ditherHandler.getSummary(filter);

        expect(summary).toBe('Simple (16-bit)');
      });

      it('should return summary for 24-bit', () => {
        const filter: DitherFilter = {
          type: 'Dither',
          parameters: {
            type: 'Lipshitz441',
            bits: 24,
          },
        };

        const summary = ditherHandler.getSummary(filter);

        expect(summary).toBe('Lipshitz441 (24-bit)');
      });
    });
  });
});
