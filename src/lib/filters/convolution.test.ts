import { describe, it, expect } from 'vitest';
import { convolutionHandler, convolutionFilterSchema } from './convolution';
import type { ConvolutionFilter } from '../../types';

describe('ConvolutionFilterHandler', () => {
  describe('Schema Validation', () => {
    describe('Wav type', () => {
      it('should validate valid Wav filter', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should validate Wav filter with channel', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
            channel: 0,
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Wav filter with empty filename', () => {
        const filter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: '',
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });

      it('should reject Wav filter with negative channel', () => {
        const filter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
            channel: -1,
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('Raw type', () => {
      it('should validate valid Raw filter', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Raw',
            filename: 'impulse.raw',
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should validate Raw filter with format', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Raw',
            filename: 'impulse.raw',
            format: 'FLOAT32LE',
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should validate Raw filter with all optional params', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Raw',
            filename: 'impulse.raw',
            format: 'S16LE',
            skip_bytes_lines: 44,
            read_bytes_lines: 1024,
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Raw filter with negative skip_bytes_lines', () => {
        const filter = {
          type: 'Conv',
          parameters: {
            type: 'Raw',
            filename: 'impulse.raw',
            skip_bytes_lines: -1,
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });

    describe('Values type', () => {
      it('should validate valid Values filter', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [1.0, 0.5, 0.25, 0.125],
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it('should reject Values filter with empty array', () => {
        const filter = {
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [],
          },
        };

        const result = convolutionFilterSchema.safeParse(filter);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Handler Methods', () => {
    describe('getDefault', () => {
      it('should return default Values filter', () => {
        const defaultFilter = convolutionHandler.getDefault();

        expect(defaultFilter.type).toBe('Conv');
        expect(defaultFilter.parameters.type).toBe('Values');
      });

      it('should return a valid filter', () => {
        const defaultFilter = convolutionHandler.getDefault();
        const result = convolutionFilterSchema.safeParse(defaultFilter);
        expect(result.success).toBe(true);
      });
    });

    describe('serialize', () => {
      it('should serialize Wav filter', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
            channel: 0,
          },
        };

        const serialized = convolutionHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
            channel: 0,
          },
        });
      });

      it('should serialize Values filter', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [1.0, 0.5],
          },
        };

        const serialized = convolutionHandler.serialize(filter);

        expect(serialized).toEqual({
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [1.0, 0.5],
          },
        });
      });
    });

    describe('getDisplayName', () => {
      it('should return display name for Wav', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
          },
        };

        const displayName = convolutionHandler.getDisplayName(filter);

        expect(displayName).toBe('Convolution (Wav)');
      });

      it('should return display name for Values', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [1.0],
          },
        };

        const displayName = convolutionHandler.getDisplayName(filter);

        expect(displayName).toBe('FIR Phase Correction');
      });
    });

    describe('getSummary', () => {
      it('should return filename for Wav', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: '/path/to/impulse.wav',
          },
        };

        const summary = convolutionHandler.getSummary(filter);

        expect(summary).toBe('impulse.wav');
      });

      it('should return filename with channel for Wav', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Wav',
            filename: 'impulse.wav',
            channel: 1,
          },
        };

        const summary = convolutionHandler.getSummary(filter);

        expect(summary).toBe('impulse.wav (ch1)');
      });

      it('should return tap count for Values', () => {
        const filter: ConvolutionFilter = {
          type: 'Conv',
          parameters: {
            type: 'Values',
            values: [1.0, 0.5, 0.25, 0.125],
          },
        };

        const summary = convolutionHandler.getSummary(filter);

        expect(summary).toBe('4 taps');
      });
    });
  });
});
