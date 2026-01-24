import { describe, it, expect } from 'vitest';
import { filterRegistry } from './registry';

describe('FilterRegistry', () => {
  describe('Registration', () => {
    it('should have all filter types registered', () => {
      const expectedTypes = [
        'Biquad',
        'Conv',
        'Delay',
        'Gain',
        'Volume',
        'Dither',
        'DiffEq',
        'Compressor',
        'Loudness',
        'NoiseGate',
      ];

      expectedTypes.forEach((type) => {
        expect(filterRegistry.has(type as never)).toBe(true);
      });
    });

    it('should return all registered handlers', () => {
      const handlers = filterRegistry.getAll();
      expect(handlers.length).toBe(10);
    });

    it('should return all registered types', () => {
      const types = filterRegistry.getAllTypes();
      expect(types.length).toBe(10);
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

  describe('Handler Retrieval', () => {
    it('should retrieve Biquad handler', () => {
      const handler = filterRegistry.get('Biquad');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Biquad');
    });

    it('should retrieve Conv handler', () => {
      const handler = filterRegistry.get('Conv');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Conv');
    });

    it('should retrieve Delay handler', () => {
      const handler = filterRegistry.get('Delay');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Delay');
    });

    it('should retrieve Gain handler', () => {
      const handler = filterRegistry.get('Gain');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Gain');
    });

    it('should retrieve Volume handler', () => {
      const handler = filterRegistry.get('Volume');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Volume');
    });

    it('should retrieve Dither handler', () => {
      const handler = filterRegistry.get('Dither');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Dither');
    });

    it('should retrieve DiffEq handler', () => {
      const handler = filterRegistry.get('DiffEq');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('DiffEq');
    });

    it('should retrieve Compressor handler', () => {
      const handler = filterRegistry.get('Compressor');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Compressor');
    });

    it('should retrieve Loudness handler', () => {
      const handler = filterRegistry.get('Loudness');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('Loudness');
    });

    it('should retrieve NoiseGate handler', () => {
      const handler = filterRegistry.get('NoiseGate');
      expect(handler).toBeDefined();
      expect(handler?.type).toBe('NoiseGate');
    });

    it('should return undefined for unknown type', () => {
      const handler = filterRegistry.get('Unknown' as never);
      expect(handler).toBeUndefined();
    });
  });

  describe('Handler Functionality', () => {
    it('should validate filters using retrieved handlers', () => {
      const handler = filterRegistry.get('Biquad');
      const filter = handler?.getDefault();

      expect(filter).toBeDefined();
      const result = handler?.validate(filter);
      expect(result?.success).toBe(true);
    });

    it('should provide defaults for all handlers', () => {
      const handlers = filterRegistry.getAll();

      handlers.forEach((handler) => {
        const defaultFilter = handler.getDefault();
        expect(defaultFilter).toBeDefined();
        expect(defaultFilter.type).toBe(handler.type);
      });
    });

    it('should serialize filters for all handlers', () => {
      const handlers = filterRegistry.getAll();

      handlers.forEach((handler) => {
        const defaultFilter = handler.getDefault();
        const serialized = handler.serialize(defaultFilter);
        expect(serialized).toBeDefined();
        expect(serialized.type).toBe(handler.type);
      });
    });

    it('should provide display names for all handlers', () => {
      const handlers = filterRegistry.getAll();

      handlers.forEach((handler) => {
        const defaultFilter = handler.getDefault();
        const displayName = handler.getDisplayName(defaultFilter);
        expect(displayName).toBeDefined();
        expect(typeof displayName).toBe('string');
        expect(displayName.length).toBeGreaterThan(0);
      });
    });

    it('should provide summaries for all handlers', () => {
      const handlers = filterRegistry.getAll();

      handlers.forEach((handler) => {
        const defaultFilter = handler.getDefault();
        const summary = handler.getSummary(defaultFilter);
        expect(summary).toBeDefined();
        expect(typeof summary).toBe('string');
      });
    });
  });
});
