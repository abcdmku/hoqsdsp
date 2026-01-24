import { describe, it, expect } from 'vitest';
import { compressorHandler, compressorFilterSchema } from './compressor';
import type { CompressorFilter } from '../../types';

describe('CompressorFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid compressor filter', () => {
      const filter: CompressorFilter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: -20,
          factor: 4,
          attack: 10,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate compressor with all options', () => {
      const filter: CompressorFilter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: -24,
          factor: 8,
          attack: 5,
          release: 200,
          makeup_gain: 6,
          soft_clip: true,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate threshold at 0 dB', () => {
      const filter: CompressorFilter = {
        type: 'Compressor',
        parameters: {
          channels: 1,
          threshold: 0,
          factor: 2,
          attack: 10,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject threshold above 0 dB', () => {
      const filter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: 1,
          factor: 4,
          attack: 10,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject factor less than 1', () => {
      const filter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: -20,
          factor: 0.5,
          attack: 10,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative attack', () => {
      const filter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: -20,
          factor: 4,
          attack: -1,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative release', () => {
      const filter = {
        type: 'Compressor',
        parameters: {
          channels: 2,
          threshold: -20,
          factor: 4,
          attack: 10,
          release: -50,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject channels less than 1', () => {
      const filter = {
        type: 'Compressor',
        parameters: {
          channels: 0,
          threshold: -20,
          factor: 4,
          attack: 10,
          release: 100,
        },
      };

      const result = compressorFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default compressor filter', () => {
        const defaultFilter = compressorHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -20,
            factor: 4,
            attack: 10,
            release: 100,
            makeup_gain: 0,
            soft_clip: false,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = compressorHandler.getDefault();
        const result = compressorHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize compressor filter', () => {
        const filter: CompressorFilter = {
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -24,
            factor: 8,
            attack: 5,
            release: 200,
            makeup_gain: 6,
            soft_clip: true,
          },
        };

        const serialized = compressorHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -24,
            factor: 8,
            attack: 5,
            release: 200,
            makeup_gain: 6,
            soft_clip: true,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name', () => {
        const filter: CompressorFilter = {
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -20,
            factor: 4,
            attack: 10,
            release: 100,
          },
        };

        const displayName = compressorHandler.getDisplayName(filter);

        expect(displayName).toBe('Compressor');
      });
    });

    describe('getSummary', () => {
      it('should return summary with threshold and ratio', () => {
        const filter: CompressorFilter = {
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -20,
            factor: 4,
            attack: 10,
            release: 100,
          },
        };

        const summary = compressorHandler.getSummary(filter);

        expect(summary).toBe('-20dB 4:1');
      });

      it('should show infinity for very high ratios', () => {
        const filter: CompressorFilter = {
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -30,
            factor: 100,
            attack: 1,
            release: 50,
          },
        };

        const summary = compressorHandler.getSummary(filter);

        expect(summary).toBe('-30dB ∞:1');
      });

      it('should show ratio for normal values', () => {
        const filter: CompressorFilter = {
          type: 'Compressor',
          parameters: {
            channels: 2,
            threshold: -10,
            factor: 2,
            attack: 10,
            release: 100,
          },
        };

        const summary = compressorHandler.getSummary(filter);

        expect(summary).toBe('-10dB 2:1');
      });
    });
  });
});
