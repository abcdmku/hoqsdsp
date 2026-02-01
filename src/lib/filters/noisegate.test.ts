import { describe, it, expect } from 'vitest';
import { noisegateHandler, noisegateFilterSchema } from './noisegate';
import type { NoiseGateFilter } from '../../types';

describe('NoiseGateFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid noisegate filter', () => {
      const filter: NoiseGateFilter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -60,
          attack: 5,
          release: 100,
          attenuation: 50,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate with different values', () => {
      const filter: NoiseGateFilter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -40,
          attack: 1,
          release: 50,
          attenuation: 20,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate zero timing values', () => {
      const filter: NoiseGateFilter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -60,
          attack: 0,
          release: 0,
          attenuation: 0,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should allow any threshold value', () => {
      const filter: NoiseGateFilter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -90,
          attack: 5,
          release: 100,
          attenuation: 50,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject negative attack', () => {
      const filter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -60,
          attack: -1,
          release: 100,
          attenuation: 50,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative release', () => {
      const filter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -60,
          attack: 5,
          release: -100,
          attenuation: 50,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative attenuation', () => {
      const filter = {
        type: 'NoiseGate',
        parameters: {
          threshold: -60,
          attack: 5,
          release: 100,
          attenuation: -10,
        },
      };

      const result = noisegateFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default noisegate filter', () => {
        const defaultFilter = noisegateHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'NoiseGate',
          parameters: {
            threshold: -60,
            attack: 5,
            release: 100,
            attenuation: 50,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = noisegateHandler.getDefault();
        const result = noisegateHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize noisegate filter', () => {
        const filter: NoiseGateFilter = {
          type: 'NoiseGate',
          parameters: {
            threshold: -50,
            attack: 2,
            release: 80,
            attenuation: 30,
          },
        };

        const serialized = noisegateHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'NoiseGate',
          parameters: {
            threshold: -50,
            attack: 2,
            release: 80,
            attenuation: 30,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name', () => {
        const filter: NoiseGateFilter = {
          type: 'NoiseGate',
          parameters: {
            threshold: -60,
            attack: 5,
            release: 100,
            attenuation: 50,
          },
        };

        const displayName = noisegateHandler.getDisplayName(filter);

        expect(displayName).toBe('Noise Gate');
      });
    });

    describe('getSummary', () => {
      it('should return summary with threshold', () => {
        const filter: NoiseGateFilter = {
          type: 'NoiseGate',
          parameters: {
            threshold: -60,
            attack: 5,
            release: 100,
            attenuation: 50,
          },
        };

        const summary = noisegateHandler.getSummary(filter);

        expect(summary).toBe('Threshold: -60dB');
      });

      it('should return summary with different threshold', () => {
        const filter: NoiseGateFilter = {
          type: 'NoiseGate',
          parameters: {
            threshold: -40,
            attack: 5,
            release: 100,
            attenuation: 50,
          },
        };

        const summary = noisegateHandler.getSummary(filter);

        expect(summary).toBe('Threshold: -40dB');
      });
    });
  });
});
