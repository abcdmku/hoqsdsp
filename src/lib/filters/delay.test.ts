import { describe, it, expect } from 'vitest';
import { delayHandler, delayFilterSchema } from './delay';
import type { DelayFilter } from '../../types';

describe('DelayFilterHandler', () => {
  describe('Schema Validation', () => {
    describe('ms unit', () => {
      it('should validate valid delay in ms', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 10,
            unit: 'ms',
            subsample: false,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should validate zero delay', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 0,
            unit: 'ms',
            subsample: false,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should validate delay with subsample true', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 0.5,
            unit: 'ms',
            subsample: true,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject negative delay', () => {
        const filter = {
          type: 'Delay',
          parameters: {
            delay: -1,
            unit: 'ms',
            subsample: false,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('samples unit', () => {
      it('should validate valid delay in samples', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 48,
            unit: 'samples',
            subsample: false,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('mm unit', () => {
      it('should validate valid delay in mm', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 1000,
            unit: 'mm',
            subsample: true,
          },
        };

        const result = delayFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default delay filter', () => {
        const defaultFilter = delayHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Delay',
          parameters: {
            delay: 0,
            unit: 'ms',
            subsample: false,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = delayHandler.getDefault();
        const result = delayHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize delay filter', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 10,
            unit: 'ms',
            subsample: true,
          },
        };

        const serialized = delayHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Delay',
          parameters: {
            delay: 10,
            unit: 'ms',
            subsample: true,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name for ms', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 10,
            unit: 'ms',
            subsample: false,
          },
        };

        const displayName = delayHandler.getDisplayName(filter);

        expect(displayName).toBe('Delay (ms)');
      });

      it('should return display name for samples', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 48,
            unit: 'samples',
            subsample: false,
          },
        };

        const displayName = delayHandler.getDisplayName(filter);

        expect(displayName).toBe('Delay (samples)');
      });

      it('should return display name for mm', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 1000,
            unit: 'mm',
            subsample: false,
          },
        };

        const displayName = delayHandler.getDisplayName(filter);

        expect(displayName).toBe('Delay (mm)');
      });
    });

    describe('getSummary', () => {
      it('should return summary for ms without subsample', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 10,
            unit: 'ms',
            subsample: false,
          },
        };

        const summary = delayHandler.getSummary(filter);

        expect(summary).toBe('10ms');
      });

      it('should return summary for ms with subsample', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 10.5,
            unit: 'ms',
            subsample: true,
          },
        };

        const summary = delayHandler.getSummary(filter);

        expect(summary).toBe('10.5ms (subsample)');
      });

      it('should return summary for samples', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 48,
            unit: 'samples',
            subsample: false,
          },
        };

        const summary = delayHandler.getSummary(filter);

        expect(summary).toBe('48samples');
      });

      it('should return summary for mm', () => {
        const filter: DelayFilter = {
          type: 'Delay',
          parameters: {
            delay: 1000,
            unit: 'mm',
            subsample: false,
          },
        };

        const summary = delayHandler.getSummary(filter);

        expect(summary).toBe('1000mm');
      });
    });
  });
});
