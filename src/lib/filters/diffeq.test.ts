import { describe, it, expect } from 'vitest';
import { diffeqHandler, diffeqFilterSchema } from './diffeq';
import type { DiffEqFilter } from '../../types';

describe('DiffEqFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid diffeq filter', () => {
      const filter: DiffEqFilter = {
        type: 'DiffEq',
        parameters: {
          a: [1.0, -0.5],
          b: [0.5, 0.5],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate minimal diffeq filter', () => {
      const filter: DiffEqFilter = {
        type: 'DiffEq',
        parameters: {
          a: [1.0],
          b: [1.0],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate diffeq with many coefficients', () => {
      const filter: DiffEqFilter = {
        type: 'DiffEq',
        parameters: {
          a: [1.0, -1.5, 0.9, -0.3, 0.1],
          b: [0.1, 0.2, 0.3, 0.2, 0.1],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject empty a array', () => {
      const filter = {
        type: 'DiffEq',
        parameters: {
          a: [],
          b: [1.0],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject empty b array', () => {
      const filter = {
        type: 'DiffEq',
        parameters: {
          a: [1.0],
          b: [],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject missing a array', () => {
      const filter = {
        type: 'DiffEq',
        parameters: {
          b: [1.0],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject missing b array', () => {
      const filter = {
        type: 'DiffEq',
        parameters: {
          a: [1.0],
        },
      };

      const result = diffeqFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default diffeq filter', () => {
        const defaultFilter = diffeqHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'DiffEq',
          parameters: {
            a: [1.0],
            b: [1.0],
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = diffeqHandler.getDefault();
        const result = diffeqHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize diffeq filter', () => {
        const filter: DiffEqFilter = {
          type: 'DiffEq',
          parameters: {
            a: [1.0, -0.5],
            b: [0.5, 0.5],
          },
        };

        const serialized = diffeqHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'DiffEq',
          parameters: {
            a: [1.0, -0.5],
            b: [0.5, 0.5],
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name', () => {
        const filter: DiffEqFilter = {
          type: 'DiffEq',
          parameters: {
            a: [1.0],
            b: [1.0],
          },
        };

        const displayName = diffeqHandler.getDisplayName(filter);

        expect(displayName).toBe('DiffEq');
      });
    });

    describe('getSummary', () => {
      it('should return summary with coefficient counts', () => {
        const filter: DiffEqFilter = {
          type: 'DiffEq',
          parameters: {
            a: [1.0, -0.5],
            b: [0.5, 0.5, 0.25],
          },
        };

        const summary = diffeqHandler.getSummary(filter);

        expect(summary).toBe('a[2] b[3]');
      });

      it('should return summary for single coefficients', () => {
        const filter: DiffEqFilter = {
          type: 'DiffEq',
          parameters: {
            a: [1.0],
            b: [1.0],
          },
        };

        const summary = diffeqHandler.getSummary(filter);

        expect(summary).toBe('a[1] b[1]');
      });
    });
  });
});
