import { describe, it, expect } from 'vitest';
import { biquadHandler, biquadFilterSchema } from './biquad';
import type { BiquadFilter } from '../../types';

describe('BiquadFilterHandler', () => {
  describe('Schema Validation', () => {
    describe('Lowpass', () => {
      it('should validate valid Lowpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Lowpass with invalid frequency', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 0,
            q: 0.707,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should reject Lowpass with invalid Q', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.05,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('Highpass', () => {
      it('should validate valid Highpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Highpass',
            freq: 80,
            q: 0.5,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Highpass with frequency too high', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Highpass',
            freq: 25000,
            q: 0.5,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('LowpassFO', () => {
      it('should validate valid LowpassFO filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LowpassFO',
            freq: 10000,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject LowpassFO with missing freq', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'LowpassFO',
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('HighpassFO', () => {
      it('should validate valid HighpassFO filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'HighpassFO',
            freq: 20,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('Peaking', () => {
      it('should validate valid Peaking filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Peaking with gain too high', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 50,
            q: 1.0,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should reject Peaking with gain too low', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: -50,
            q: 1.0,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should accept Peaking with negative gain', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: -6,
            q: 1.0,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('Lowshelf', () => {
      it('should validate valid Lowshelf filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowshelf',
            freq: 100,
            gain: 3,
            slope: 6,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Lowshelf with invalid slope', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowshelf',
            freq: 100,
            gain: 3,
            slope: 0.05,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should reject Lowshelf with slope too high', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowshelf',
            freq: 100,
            gain: 3,
            slope: 15,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('Highshelf', () => {
      it('should validate valid Highshelf filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Highshelf',
            freq: 10000,
            gain: -3,
            slope: 12,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('LowshelfFO', () => {
      it('should validate valid LowshelfFO filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LowshelfFO',
            freq: 100,
            gain: 6,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('HighshelfFO', () => {
      it('should validate valid HighshelfFO filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'HighshelfFO',
            freq: 10000,
            gain: -6,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('Notch', () => {
      it('should validate valid Notch filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Notch',
            freq: 60,
            q: 10,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('Bandpass', () => {
      it('should validate valid Bandpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Bandpass',
            freq: 1000,
            q: 2,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('Allpass', () => {
      it('should validate valid Allpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Allpass',
            freq: 500,
            q: 1.5,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('AllpassFO', () => {
      it('should validate valid AllpassFO filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'AllpassFO',
            freq: 200,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('LinkwitzTransform', () => {
      it('should validate valid LinkwitzTransform filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
            freq_target: 25,
            q_target: 0.5,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject LinkwitzTransform with missing parameters', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should reject LinkwitzTransform with invalid Q values', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.05,
            freq_target: 25,
            q_target: 0.5,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('ButterworthLowpass', () => {
      it('should validate valid ButterworthLowpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'ButterworthLowpass',
            freq: 2000,
            order: 4,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should accept all valid orders', () => {
        const orders = [2, 4, 6, 8] as const;
        orders.forEach((order) => {
          const filter: BiquadFilter = {
            type: 'Biquad',
            parameters: {
              type: 'ButterworthLowpass',
              freq: 2000,
              order,
            },
          };

          const result = biquadFilterSchema.safeParse(filter);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid order', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'ButterworthLowpass',
            freq: 2000,
            order: 3,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('ButterworthHighpass', () => {
      it('should validate valid ButterworthHighpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'ButterworthHighpass',
            freq: 80,
            order: 2,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('LinkwitzRileyLowpass', () => {
      it('should validate valid LinkwitzRileyLowpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzRileyLowpass',
            freq: 2500,
            order: 4,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe('LinkwitzRileyHighpass', () => {
      it('should validate valid LinkwitzRileyHighpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzRileyHighpass',
            freq: 2500,
            order: 4,
          },
        };

        const result = biquadFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default Peaking filter', () => {
        const defaultFilter = biquadHandler.getDefault();

        expect(defaultFilter).toEqual({
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 0,
            q: 1.0,
          },
        });
      });

      it('should return a valid filter', () => {
        const defaultFilter = biquadHandler.getDefault();
        const result = biquadHandler.validate(defaultFilter);

        expect(result.success).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    describe('serialize', () => {
      it('should serialize Lowpass filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        };

        const serialized = biquadHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        });
      });

      it('should serialize Peaking filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        };

        const serialized = biquadHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        });
      });

      it('should serialize LinkwitzTransform filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
            freq_target: 25,
            q_target: 0.5,
          },
        };

        const serialized = biquadHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
            freq_target: 25,
            q_target: 0.5,
          },
        });
      });
    });

    describe('parse', () => {
      it('should parse valid Lowpass filter', () => {
        const yaml = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        };

        const parsed = biquadHandler.parse(yaml);

        expect(parsed).toEqual(yaml);
      });

      it('should throw on invalid filter', () => {
        const yaml = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 0,
            q: 0.707,
          },
        };

        expect(() => biquadHandler.parse(yaml)).toThrow();
      });
    });

    describe('validate', () => {
      it('should validate correct filter', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        };

        const result = biquadHandler.validate(filter);

        expect(result.success).toBe(true);
        expect(result.errors).toBeUndefined();
      });

      it('should return errors for invalid filter', () => {
        const filter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 0,
            gain: 6,
            q: 1.0,
          },
        } as BiquadFilter;

        const result = biquadHandler.validate(filter);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length ?? 0).toBeGreaterThan(0);
      });
    });

    describe('getDisplayName', () => {
      it('should return display name for Lowpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        };

        const displayName = biquadHandler.getDisplayName(filter);

        expect(displayName).toBe('Biquad - Lowpass');
      });

      it('should return display name for Peaking', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        };

        const displayName = biquadHandler.getDisplayName(filter);

        expect(displayName).toBe('Biquad - Peaking');
      });

      it('should return display name for LinkwitzTransform', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
            freq_target: 25,
            q_target: 0.5,
          },
        };

        const displayName = biquadHandler.getDisplayName(filter);

        expect(displayName).toBe('Biquad - LinkwitzTransform');
      });
    });

    describe('getSummary', () => {
      it('should return summary for Lowpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowpass',
            freq: 1000,
            q: 0.707,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('1000Hz Q0.707');
      });

      it('should return summary for Highpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Highpass',
            freq: 80,
            q: 0.5,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('80Hz Q0.5');
      });

      it('should return summary for Peaking with positive gain', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 6,
            q: 1.0,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('1000Hz +6dB Q1');
      });

      it('should return summary for Peaking with negative gain', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: -6,
            q: 1.0,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('1000Hz -6dB Q1');
      });

      it('should return summary for Peaking with zero gain', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Peaking',
            freq: 1000,
            gain: 0,
            q: 1.0,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('1000Hz +0dB Q1');
      });

      it('should return summary for LowpassFO', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LowpassFO',
            freq: 10000,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('10000Hz');
      });

      it('should return summary for HighpassFO', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'HighpassFO',
            freq: 20,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('20Hz');
      });

      it('should return summary for AllpassFO', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'AllpassFO',
            freq: 200,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('200Hz');
      });

      it('should return summary for Lowshelf', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Lowshelf',
            freq: 100,
            gain: 3,
            slope: 6,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('100Hz +3dB');
      });

      it('should return summary for Highshelf', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Highshelf',
            freq: 10000,
            gain: -3,
            slope: 12,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('10000Hz -3dB');
      });

      it('should return summary for LowshelfFO', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LowshelfFO',
            freq: 100,
            gain: 6,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('100Hz +6dB');
      });

      it('should return summary for HighshelfFO', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'HighshelfFO',
            freq: 10000,
            gain: -6,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('10000Hz -6dB');
      });

      it('should return summary for Notch', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Notch',
            freq: 60,
            q: 10,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('60Hz Q10');
      });

      it('should return summary for Bandpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Bandpass',
            freq: 1000,
            q: 2,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('1000Hz Q2');
      });

      it('should return summary for Allpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'Allpass',
            freq: 500,
            q: 1.5,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('500Hz Q1.5');
      });

      it('should return summary for LinkwitzTransform', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzTransform',
            freq_act: 50,
            q_act: 0.707,
            freq_target: 25,
            q_target: 0.5,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('50Hz → 25Hz');
      });

      it('should return summary for ButterworthLowpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'ButterworthLowpass',
            freq: 2000,
            order: 4,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('2000Hz 4th order');
      });

      it('should return summary for ButterworthHighpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'ButterworthHighpass',
            freq: 80,
            order: 2,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('80Hz 2th order');
      });

      it('should return summary for LinkwitzRileyLowpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzRileyLowpass',
            freq: 2500,
            order: 4,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('2500Hz 4th order');
      });

      it('should return summary for LinkwitzRileyHighpass', () => {
        const filter: BiquadFilter = {
          type: 'Biquad',
          parameters: {
            type: 'LinkwitzRileyHighpass',
            freq: 2500,
            order: 4,
          },
        };

        const summary = biquadHandler.getSummary(filter);

        expect(summary).toBe('2500Hz 4th order');
      });
    });
  });

  describe('Boundary Value Testing', () => {
    it('should accept minimum valid frequency', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowpass',
          freq: 1,
          q: 0.707,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid frequency', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowpass',
          freq: 24000,
          q: 0.707,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid Q', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowpass',
          freq: 1000,
          q: 0.1,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid Q', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowpass',
          freq: 1000,
          q: 100,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid gain', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Peaking',
          freq: 1000,
          gain: -40,
          q: 1.0,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid gain', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Peaking',
          freq: 1000,
          gain: 40,
          q: 1.0,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid slope', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowshelf',
          freq: 100,
          gain: 3,
          slope: 0.1,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should accept maximum valid slope', () => {
      const filter: BiquadFilter = {
        type: 'Biquad',
        parameters: {
          type: 'Lowshelf',
          freq: 100,
          gain: 3,
          slope: 12,
        },
      };

      const result = biquadFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });
  });
});
