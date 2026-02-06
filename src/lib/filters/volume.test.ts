import { describe, it, expect } from 'vitest';
import { volumeHandler, volumeFilterSchema } from './volume';
import type { VolumeFilter } from '../../types';

describe('VolumeFilterHandler', () => {
  describe('Schema Validation', () => {
    it('should validate valid volume filter with ramp_time', () => {
      const filter: VolumeFilter = {
        type: 'Volume',
        parameters: {
          fader: 'Aux1',
          ramp_time: 200,
        },
      };

      const result = volumeFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate volume filter without ramp_time', () => {
      const filter: VolumeFilter = {
        type: 'Volume',
        parameters: {
          fader: 'Aux1',
        },
      };

      const result = volumeFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should validate volume filter with zero ramp_time', () => {
      const filter: VolumeFilter = {
        type: 'Volume',
        parameters: {
          fader: 'Aux2',
          ramp_time: 0,
        },
      };

      const result = volumeFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should reject volume filter without fader', () => {
      const filter = {
        type: 'Volume',
        parameters: {
          ramp_time: 100,
        },
      };

      const result = volumeFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });

    it('should reject negative ramp_time', () => {
      const filter = {
        type: 'Volume',
        parameters: {
          fader: 'Aux1',
          ramp_time: -100,
        },
      };

      const result = volumeFilterSchema.safeParse(filter);
      expect(result.success).toBe(false);
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default volume filter', () => {
        const defaultFilter = volumeHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
            ramp_time: 200,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = volumeHandler.getDefault();
        const result = volumeHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize volume filter', () => {
        const filter: VolumeFilter = {
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
            ramp_time: 100,
          },
        };

        const serialized = volumeHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
            ramp_time: 100,
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name with ramp', () => {
        const filter: VolumeFilter = {
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
            ramp_time: 200,
          },
        };

        const displayName = volumeHandler.getDisplayName(filter);

        expect(displayName).toBe('Volume (ramp)');
      });

      it('should return display name without ramp', () => {
        const filter: VolumeFilter = {
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
          },
        };

        const displayName = volumeHandler.getDisplayName(filter);

        expect(displayName).toBe('Volume');
      });
    });

    describe('getSummary', () => {
      it('should return summary with ramp time', () => {
        const filter: VolumeFilter = {
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
            ramp_time: 200,
          },
        };

        const summary = volumeHandler.getSummary(filter);

        expect(summary).toBe('Aux1, ramp: 200ms');
      });

      it('should return summary without ramp time', () => {
        const filter: VolumeFilter = {
          type: 'Volume',
          parameters: {
            fader: 'Aux1',
          },
        };

        const summary = volumeHandler.getSummary(filter);

        expect(summary).toBe('Aux1 fader control');
      });
    });
  });
});
