import { describe, it, expect } from 'vitest';
import { gainHandler, gainFilterSchema } from './gain';
import type { GainFilter } from '../../types';

describe('GainFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid gain filter', () => {
      const filter: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: -6,
        },
      };

      const result = gainFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate gain filter with all options', () => {
      const filter: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 0,
          inverted: true,
          scale: 'dB',
        },
      };

      const result = gainFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate gain filter with linear scale', () => {
      const filter: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 0.5,
          scale: 'linear',
        },
      };

      const result = gainFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate negative gain', () => {
      const filter: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: -20,
        },
      };

      const result = gainFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate positive gain', () => {
      const filter: GainFilter = {
        type: 'Gain',
        parameters: {
          gain: 12,
        },
      };

      const result = gainFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default gain filter', () => {
        const defaultFilter = gainHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Gain',
          parameters: {
            gain: 0,
            inverted: false,
            scale: 'dB',
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = gainHandler.getDefault();
        const result = gainHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize gain filter', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: -6,
            inverted: true,
            scale: 'dB',
          },
        };

        const serialized = gainHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Gain',
          parameters: {
            gain: -6,
            inverted: true,
            scale: 'dB',
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name for dB scale', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: -6,
            scale: 'dB',
          },
        };

        const displayName = gainHandler.getDisplayName(filter);

        expect(displayName).toBe('Gain (dB)');
      });

      it('should return display name for linear scale', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: 0.5,
            scale: 'linear',
          },
        };

        const displayName = gainHandler.getDisplayName(filter);

        expect(displayName).toBe('Gain (linear)');
      });

      it('should default to dB when scale is undefined', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: -6,
          },
        };

        const displayName = gainHandler.getDisplayName(filter);

        expect(displayName).toBe('Gain (dB)');
      });
    });

    describe('getSummary', () => {
      it('should return summary for positive dB gain', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: 6,
            scale: 'dB',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('+6dB');
      });

      it('should return summary for negative dB gain', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: -6,
            scale: 'dB',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('-6dB');
      });

      it('should return summary for zero dB gain', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: 0,
            scale: 'dB',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('0dB');
      });

      it('should return summary for inverted gain', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: -6,
            inverted: true,
            scale: 'dB',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('-6dB (inverted)');
      });

      it('should return summary for linear scale', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: 0.5,
            scale: 'linear',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('0.5x');
      });

      it('should return summary for linear scale with inverted', () => {
        const filter: GainFilter = {
          type: 'Gain',
          parameters: {
            gain: 2,
            inverted: true,
            scale: 'linear',
          },
        };

        const summary = gainHandler.getSummary(filter);

        expect(summary).toBe('2x (inverted)');
      });
    });
  });
});
