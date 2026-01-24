import { describe, it, expect } from 'vitest';
import {
  WebSocketManager,
  MessageQueue,
  calculateDelay,
  shouldReconnect,
  defaultReconnectionConfig,
  type ReconnectionConfig,
} from './index';

describe('WebSocket Barrel Exports', () => {
  describe('WebSocketManager Export', () => {
    it('should export WebSocketManager class', () => {
      expect(WebSocketManager).toBeDefined();
      expect(typeof WebSocketManager).toBe('function');
    });

    it('should be able to instantiate WebSocketManager', () => {
      const manager = new WebSocketManager('ws://localhost:1234');
      expect(manager).toBeDefined();
      expect(manager.connectionState).toBe('disconnected');
    });
  });

  describe('MessageQueue Export', () => {
    it('should export MessageQueue class', () => {
      expect(MessageQueue).toBeDefined();
      expect(typeof MessageQueue).toBe('function');
    });

    it('should be able to instantiate MessageQueue', () => {
      const queue = new MessageQueue();
      expect(queue).toBeDefined();
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('ReconnectionStrategy Exports', () => {
    it('should export calculateDelay function', () => {
      expect(calculateDelay).toBeDefined();
      expect(typeof calculateDelay).toBe('function');
    });

    it('should export shouldReconnect function', () => {
      expect(shouldReconnect).toBeDefined();
      expect(typeof shouldReconnect).toBe('function');
    });

    it('should export defaultReconnectionConfig', () => {
      expect(defaultReconnectionConfig).toBeDefined();
      expect(defaultReconnectionConfig).toHaveProperty('maxAttempts');
      expect(defaultReconnectionConfig).toHaveProperty('baseDelay');
      expect(defaultReconnectionConfig).toHaveProperty('maxDelay');
      expect(defaultReconnectionConfig).toHaveProperty('jitterFactor');
    });

    it('should calculate delay correctly', () => {
      const delay = calculateDelay(1, {
        maxAttempts: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        jitterFactor: 0,
      });
      expect(delay).toBe(1000);
    });

    it('should check reconnection correctly', () => {
      expect(shouldReconnect(5, defaultReconnectionConfig)).toBe(true);
      expect(shouldReconnect(10, defaultReconnectionConfig)).toBe(false);
    });
  });

  describe('Type Exports', () => {
    it('should allow ReconnectionConfig type usage', () => {
      const config: ReconnectionConfig = {
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 10000,
        jitterFactor: 0.1,
      };

      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(500);
    });
  });
});
