import { describe, it, expect } from 'vitest';
import { loudnessHandler, loudnessFilterSchema } from './loudness';
import type { LoudnessFilter } from '../../types';

describe('LoudnessFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid loudness filter', () => {
      const filter: LoudnessFilter = {
        type: 'Loudness',
        parameters: {
          reference_level: -25,
          high_boost: 5,
          low_boost: 10,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate minimum boost values', () => {
      const filter: LoudnessFilter = {
        type: 'Loudness',
        parameters: {
          reference_level: -30,
          high_boost: 0,
          low_boost: 0,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate maximum boost values', () => {
      const filter: LoudnessFilter = {
        type: 'Loudness',
        parameters: {
          reference_level: -20,
          high_boost: 20,
          low_boost: 20,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject negative high_boost', () => {
      const filter = {
        type: 'Loudness',
        parameters: {
          reference_level: -25,
          high_boost: -1,
          low_boost: 10,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative low_boost', () => {
      const filter = {
        type: 'Loudness',
        parameters: {
          reference_level: -25,
          high_boost: 5,
          low_boost: -5,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject high_boost greater than 20', () => {
      const filter = {
        type: 'Loudness',
        parameters: {
          reference_level: -25,
          high_boost: 21,
          low_boost: 10,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject low_boost greater than 20', () => {
      const filter = {
        type: 'Loudness',
        parameters: {
          reference_level: -25,
          high_boost: 5,
          low_boost: 25,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should allow any reference_level', () => {
      const filter: LoudnessFilter = {
        type: 'Loudness',
        parameters: {
          reference_level: -80,
          high_boost: 5,
          low_boost: 10,
        },
      };

      const result = loudnessFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default loudness filter', () => {
        const defaultFilter = loudnessHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Loudness',
          parameters: {
            reference_level: -25,
            high_boost: 5,
            low_boost: 10,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = loudnessHandler.getDefault();
        const result = loudnessHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize loudness filter', () => {
        const filter: LoudnessFilter = {
          type: 'Loudness',
          parameters: {
            reference_level: -30,
            high_boost: 8,
            low_boost: 15,
          },
        };

        const serialized = loudnessHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Loudness',
          parameters: {
            reference_level: -30,
            high_boost: 8,
            low_boost: 15,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name', () => {
        const filter: LoudnessFilter = {
          type: 'Loudness',
          parameters: {
            reference_level: -25,
            high_boost: 5,
            low_boost: 10,
          },
        };

        const displayName = loudnessHandler.getDisplayName(filter);

        expect(displayName).toBe('Loudness');
      });
    });

    describe('getSummary', () => {
      it('should return summary with reference level', () => {
        const filter: LoudnessFilter = {
          type: 'Loudness',
          parameters: {
            reference_level: -25,
            high_boost: 5,
            low_boost: 10,
          },
        };

        const summary = loudnessHandler.getSummary(filter);

        expect(summary).toBe('Ref: -25dB');
      });

      it('should return summary with different reference level', () => {
        const filter: LoudnessFilter = {
          type: 'Loudness',
          parameters: {
            reference_level: -30,
            high_boost: 5,
            low_boost: 10,
          },
        };

        const summary = loudnessHandler.getSummary(filter);

        expect(summary).toBe('Ref: -30dB');
      });
    });
  });
});
