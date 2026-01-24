import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateDelay,
  shouldReconnect,
  defaultReconnectionConfig,
  type ReconnectionConfig,
} from './ReconnectionStrategy';

describe('ReconnectionStrategy', () => {
  describe('defaultReconnectionConfig', () => {
    it('should have correct default values', () => {
      expect(defaultReconnectionConfig).toEqual({
        maxAttempts: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        jitterFactor: 0.25,
      });
    });
  });

  describe('calculateDelay', () => {
    beforeEach(() => {
      // Mock Math.random for predictable jitter
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should calculate exponential backoff for first attempt', () => {
      const delay = calculateDelay(1);
      // Base delay with no exponential increase: 1000 * 2^0 = 1000
      // Jitter at 0.5: 1000 * 0.25 * (0.5 * 2 - 1) = 0
      expect(delay).toBe(1000);
    });

    it('should double delay for each subsequent attempt', () => {
      // With jitter = 0 (Math.random = 0.5)
      const delay1 = calculateDelay(1); // 1000 * 2^0 = 1000
      const delay2 = calculateDelay(2); // 1000 * 2^1 = 2000
      const delay3 = calculateDelay(3); // 1000 * 2^2 = 4000
      const delay4 = calculateDelay(4); // 1000 * 2^3 = 8000

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
      expect(delay3).toBe(4000);
      expect(delay4).toBe(8000);
    });

    it('should cap delay at maxDelay', () => {
      // Attempt 10: 1000 * 2^9 = 512000 > 30000, should cap at 30000
      const delay = calculateDelay(10);
      expect(delay).toBe(30000); // Capped at maxDelay
    });

    it('should respect custom config', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 10000,
        jitterFactor: 0,
      };

      const delay1 = calculateDelay(1, customConfig);
      const delay2 = calculateDelay(2, customConfig);

      expect(delay1).toBe(500); // No jitter
      expect(delay2).toBe(1000);
    });

    it('should apply jitter within bounds', () => {
      // Test with Math.random returning 0 (minimum jitter)
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const minDelay = calculateDelay(1);
      // 1000 + 1000 * 0.25 * (0 * 2 - 1) = 1000 - 250 = 750
      expect(minDelay).toBe(750);

      // Test with Math.random returning 1 (maximum jitter)
      vi.spyOn(Math, 'random').mockReturnValue(1);
      const maxDelay = calculateDelay(1);
      // 1000 + 1000 * 0.25 * (1 * 2 - 1) = 1000 + 250 = 1250
      expect(maxDelay).toBe(1250);
    });

    it('should return floor of calculated delay', () => {
      // Create scenario where delay would have decimals
      vi.spyOn(Math, 'random').mockReturnValue(0.333);
      const delay = calculateDelay(1);
      expect(delay).toBe(Math.floor(delay));
      expect(Number.isInteger(delay)).toBe(true);
    });

    it('should handle zero jitter factor', () => {
      const config: ReconnectionConfig = {
        ...defaultReconnectionConfig,
        jitterFactor: 0,
      };

      // Any random value should not affect result
      vi.spyOn(Math, 'random').mockReturnValue(0.123);
      const delay1 = calculateDelay(1, config);

      vi.spyOn(Math, 'random').mockReturnValue(0.987);
      const delay2 = calculateDelay(1, config);

      expect(delay1).toBe(1000);
      expect(delay2).toBe(1000);
    });

    it('should handle very large attempt numbers', () => {
      // Even with huge attempt, should cap at maxDelay
      const delay = calculateDelay(100);
      expect(delay).toBeLessThanOrEqual(
        defaultReconnectionConfig.maxDelay * (1 + defaultReconnectionConfig.jitterFactor)
      );
      expect(delay).toBeGreaterThanOrEqual(
        defaultReconnectionConfig.maxDelay * (1 - defaultReconnectionConfig.jitterFactor)
      );
    });
  });

  describe('shouldReconnect', () => {
    it('should return true for attempts less than maxAttempts', () => {
      expect(shouldReconnect(0)).toBe(true);
      expect(shouldReconnect(1)).toBe(true);
      expect(shouldReconnect(5)).toBe(true);
      expect(shouldReconnect(9)).toBe(true);
    });

    it('should return false when attempts equal maxAttempts', () => {
      expect(shouldReconnect(10)).toBe(false);
    });

    it('should return false when attempts exceed maxAttempts', () => {
      expect(shouldReconnect(11)).toBe(false);
      expect(shouldReconnect(100)).toBe(false);
    });

    it('should use default config when not provided', () => {
      // Default maxAttempts is 10
      expect(shouldReconnect(9)).toBe(true);
      expect(shouldReconnect(10)).toBe(false);
    });

    it('should respect custom maxAttempts', () => {
      const customConfig: ReconnectionConfig = {
        ...defaultReconnectionConfig,
        maxAttempts: 3,
      };

      expect(shouldReconnect(0, customConfig)).toBe(true);
      expect(shouldReconnect(1, customConfig)).toBe(true);
      expect(shouldReconnect(2, customConfig)).toBe(true);
      expect(shouldReconnect(3, customConfig)).toBe(false);
    });

    it('should handle maxAttempts of 0', () => {
      const zeroAttempts: ReconnectionConfig = {
        ...defaultReconnectionConfig,
        maxAttempts: 0,
      };

      expect(shouldReconnect(0, zeroAttempts)).toBe(false);
    });

    it('should handle maxAttempts of 1', () => {
      const oneAttempt: ReconnectionConfig = {
        ...defaultReconnectionConfig,
        maxAttempts: 1,
      };

      expect(shouldReconnect(0, oneAttempt)).toBe(true);
      expect(shouldReconnect(1, oneAttempt)).toBe(false);
    });
  });

  describe('Integration: calculateDelay + shouldReconnect', () => {
    it('should provide reasonable delays for all valid attempts', () => {
      for (let attempt = 1; shouldReconnect(attempt - 1); attempt++) {
        const delay = calculateDelay(attempt);

        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThanOrEqual(
          defaultReconnectionConfig.maxDelay * 1.25
        );
      }
    });

    it('should have increasing delays up to the cap', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // No jitter variance

      let prevDelay = 0;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = calculateDelay(attempt);
        expect(delay).toBeGreaterThan(prevDelay);
        prevDelay = delay;
      }
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle attempt 0', () => {
      // 2^(0-1) = 2^-1 = 0.5, so delay = 500
      const delay = calculateDelay(0);
      expect(delay).toBe(500);
    });

    it('should handle negative attempts gracefully', () => {
      // While not expected, should not crash
      const delay = calculateDelay(-1);
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });

    it('should handle config with very small baseDelay', () => {
      const config: ReconnectionConfig = {
        maxAttempts: 10,
        baseDelay: 10,
        maxDelay: 1000,
        jitterFactor: 0.25,
      };

      const delay = calculateDelay(1, config);
      expect(delay).toBe(10);
    });

    it('should handle config where baseDelay equals maxDelay', () => {
      const config: ReconnectionConfig = {
        maxAttempts: 10,
        baseDelay: 5000,
        maxDelay: 5000,
        jitterFactor: 0,
      };

      // All attempts should return maxDelay
      expect(calculateDelay(1, config)).toBe(5000);
      expect(calculateDelay(5, config)).toBe(5000);
      expect(calculateDelay(10, config)).toBe(5000);
    });

    it('should handle high jitter factor', () => {
      const config: ReconnectionConfig = {
        maxAttempts: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        jitterFactor: 0.5, // 50% jitter
      };

      // At random = 0, jitter = -50%
      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(calculateDelay(1, config)).toBe(500);

      // At random = 1, jitter = +50%
      vi.spyOn(Math, 'random').mockReturnValue(1);
      expect(calculateDelay(1, config)).toBe(1500);
    });
  });
});
