import { describe, it, expect } from 'vitest';
import {
  // Registry
  filterRegistry,
  // Types
  BaseFilterHandler,
  zodToValidationResult,
  // Biquad
  biquadHandler,
  biquadFilterSchema,
  biquadParametersSchema,
  // Convolution
  convolutionHandler,
  convolutionFilterSchema,
  convolutionParametersSchema,
  // Delay
  delayHandler,
  delayFilterSchema,
  delayParametersSchema,
  // Gain
  gainHandler,
  gainFilterSchema,
  gainParametersSchema,
  // Volume
  volumeHandler,
  volumeFilterSchema,
  volumeParametersSchema,
  // Dither
  ditherHandler,
  ditherFilterSchema,
  ditherParametersSchema,
  // DiffEq
  diffeqHandler,
  diffeqFilterSchema,
  diffeqParametersSchema,
  // Compressor
  compressorHandler,
  compressorFilterSchema,
  compressorParametersSchema,
  // Loudness
  loudnessHandler,
  loudnessFilterSchema,
  loudnessParametersSchema,
  // NoiseGate
  noisegateHandler,
  noisegateFilterSchema,
  noisegateParametersSchema,
} from './index';

describe('Filter Barrel Exports', () => {
  describe('Registry Export', () => {
    it('should export filterRegistry', () => {
      expect(filterRegistry).toBeDefined();
      expect(typeof filterRegistry.get).toBe('function');
      expect(typeof filterRegistry.getAll).toBe('function');
    });
  });

  describe('Types Export', () => {
    it('should export BaseFilterHandler class', () => {
      expect(BaseFilterHandler).toBeDefined();
      expect(typeof BaseFilterHandler).toBe('function');
    });

    it('should export zodToValidationResult function', () => {
      expect(zodToValidationResult).toBeDefined();
      expect(typeof zodToValidationResult).toBe('function');
    });
  });

  describe('Biquad Exports', () => {
    it('should export biquadHandler', () => {
      expect(biquadHandler).toBeDefined();
      expect(biquadHandler.type).toBe('Biquad');
    });

    it('should export biquad schemas', () => {
      expect(biquadFilterSchema).toBeDefined();
      expect(biquadParametersSchema).toBeDefined();
    });
  });

  describe('Convolution Exports', () => {
    it('should export convolutionHandler', () => {
      expect(convolutionHandler).toBeDefined();
      expect(convolutionHandler.type).toBe('Conv');
    });

    it('should export convolution schemas', () => {
      expect(convolutionFilterSchema).toBeDefined();
      expect(convolutionParametersSchema).toBeDefined();
    });
  });

  describe('Delay Exports', () => {
    it('should export delayHandler', () => {
      expect(delayHandler).toBeDefined();
      expect(delayHandler.type).toBe('Delay');
    });

    it('should export delay schemas', () => {
      expect(delayFilterSchema).toBeDefined();
      expect(delayParametersSchema).toBeDefined();
    });
  });

  describe('Gain Exports', () => {
    it('should export gainHandler', () => {
      expect(gainHandler).toBeDefined();
      expect(gainHandler.type).toBe('Gain');
    });

    it('should export gain schemas', () => {
      expect(gainFilterSchema).toBeDefined();
      expect(gainParametersSchema).toBeDefined();
    });
  });

  describe('Volume Exports', () => {
    it('should export volumeHandler', () => {
      expect(volumeHandler).toBeDefined();
      expect(volumeHandler.type).toBe('Volume');
    });

    it('should export volume schemas', () => {
      expect(volumeFilterSchema).toBeDefined();
      expect(volumeParametersSchema).toBeDefined();
    });
  });

  describe('Dither Exports', () => {
    it('should export ditherHandler', () => {
      expect(ditherHandler).toBeDefined();
      expect(ditherHandler.type).toBe('Dither');
    });

    it('should export dither schemas', () => {
      expect(ditherFilterSchema).toBeDefined();
      expect(ditherParametersSchema).toBeDefined();
    });
  });

  describe('DiffEq Exports', () => {
    it('should export diffeqHandler', () => {
      expect(diffeqHandler).toBeDefined();
      expect(diffeqHandler.type).toBe('DiffEq');
    });

    it('should export diffeq schemas', () => {
      expect(diffeqFilterSchema).toBeDefined();
      expect(diffeqParametersSchema).toBeDefined();
    });
  });

  describe('Compressor Exports', () => {
    it('should export compressorHandler', () => {
      expect(compressorHandler).toBeDefined();
      expect(compressorHandler.type).toBe('Compressor');
    });

    it('should export compressor schemas', () => {
      expect(compressorFilterSchema).toBeDefined();
      expect(compressorParametersSchema).toBeDefined();
    });
  });

  describe('Loudness Exports', () => {
    it('should export loudnessHandler', () => {
      expect(loudnessHandler).toBeDefined();
      expect(loudnessHandler.type).toBe('Loudness');
    });

    it('should export loudness schemas', () => {
      expect(loudnessFilterSchema).toBeDefined();
      expect(loudnessParametersSchema).toBeDefined();
    });
  });

  describe('NoiseGate Exports', () => {
    it('should export noisegateHandler', () => {
      expect(noisegateHandler).toBeDefined();
      expect(noisegateHandler.type).toBe('NoiseGate');
    });

    it('should export noisegate schemas', () => {
      expect(noisegateFilterSchema).toBeDefined();
      expect(noisegateParametersSchema).toBeDefined();
    });
  });

  describe('All Handlers Integration', () => {
    const allHandlers = [
      biquadHandler,
      convolutionHandler,
      delayHandler,
      gainHandler,
      volumeHandler,
      ditherHandler,
      diffeqHandler,
      compressorHandler,
      loudnessHandler,
      noisegateHandler,
    ];

    it('should have all handlers with required interface methods', () => {
      allHandlers.forEach((handler) => {
        expect(handler.type).toBeDefined();
        expect(typeof handler.parse).toBe('function');
        expect(typeof handler.serialize).toBe('function');
        expect(typeof handler.validate).toBe('function');
        expect(typeof handler.getDefault).toBe('function');
        expect(typeof handler.getDisplayName).toBe('function');
      });
    });

    it('should have all handlers registered in filterRegistry', () => {
      allHandlers.forEach((handler) => {
        const registered = filterRegistry.get(handler.type);
        expect(registered).toBeDefined();
        expect(registered?.type).toBe(handler.type);
      });
    });

    it('should return all handlers from registry', () => {
      const allFromRegistry = filterRegistry.getAll();
      expect(allFromRegistry.length).toBeGreaterThanOrEqual(10);

      const types = allFromRegistry.map((h) => h.type);
      expect(types).toContain('Biquad');
      expect(types).toContain('Conv');
      expect(types).toContain('Delay');
      expect(types).toContain('Gain');
      expect(types).toContain('Volume');
      expect(types).toContain('Dither');
      expect(types).toContain('DiffEq');
      expect(types).toContain('Compressor');
      expect(types).toContain('Loudness');
      expect(types).toContain('NoiseGate');
    });
  });
});
