import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RealtimeSubscriptionManager,
  createRealtimeSubscriptionManager,
} from './realtimeSubscriptions';
import type { SignalLevels } from '../../types';

describe('RealtimeSubscriptionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockLevels: SignalLevels = {
    capture: [{ peak: -15, rms: -20 }],
    playback: [{ peak: -12, rms: -18 }],
  };

  const createMockWsManager = (overrides = {}) => ({
    isConnected: true,
    send: vi.fn().mockImplementation((cmd: string) => {
      switch (cmd) {
        case 'GetSignalLevelsSinceLast':
          return Promise.resolve(mockLevels);
        case 'GetClippedSamples':
          return Promise.resolve(0);
        case 'GetProcessingLoad':
          return Promise.resolve(45.5);
        case 'GetBufferLevel':
          return Promise.resolve(0.6);
        case 'GetCaptureSampleRate':
          return Promise.resolve(48000);
        case 'GetRateAdjust':
          return Promise.resolve(1.0);
        default:
          return Promise.resolve(null);
      }
    }),
    ...overrides,
  });

  describe('subscribe', () => {
    it('returns a subscription ID', () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);

      const id = manager.subscribe({
        types: ['levels'],
        onData: vi.fn(),
      });

      expect(id).toMatch(/^sub_\d+$/);
    });

    it('calls onData immediately with initial data', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ processingLoad: 45.5 })
      );
    });

    it('fetches levels data when subscribed', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['levels'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(wsManager.send).toHaveBeenCalledWith('GetSignalLevelsSinceLast');
      expect(wsManager.send).toHaveBeenCalledWith('GetClippedSamples');
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          levels: mockLevels,
          clippedSamples: 0,
        })
      );
    });

    it('fetches processing load when subscribed', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(wsManager.send).toHaveBeenCalledWith('GetProcessingLoad');
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ processingLoad: 45.5 })
      );
    });

    it('fetches buffer level when subscribed', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['bufferLevel'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(wsManager.send).toHaveBeenCalledWith('GetBufferLevel');
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ bufferLevel: 60 }) // Converted to percentage
      );
    });

    it('fetches sample rate and rate adjust when subscribed', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['sampleRate'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(wsManager.send).toHaveBeenCalledWith('GetCaptureSampleRate');
      expect(wsManager.send).toHaveBeenCalledWith('GetRateAdjust');
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          captureSampleRate: 48000,
          rateAdjust: 1.0,
        })
      );
    });

    it('can subscribe to multiple types', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad', 'bufferLevel', 'sampleRate'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(wsManager.send).toHaveBeenCalledWith('GetProcessingLoad');
      expect(wsManager.send).toHaveBeenCalledWith('GetBufferLevel');
      expect(wsManager.send).toHaveBeenCalledWith('GetCaptureSampleRate');
    });
  });

  describe('polling', () => {
    it('uses default interval of 50ms for levels', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['levels'],
        onData,
      });

      // Initial call
      await vi.advanceTimersByTimeAsync(10);
      const initialCallCount = onData.mock.calls.length;

      // After 50ms
      await vi.advanceTimersByTimeAsync(50);
      expect(onData.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('uses default interval of 500ms for metrics', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        onData,
      });

      // Initial call
      await vi.advanceTimersByTimeAsync(10);
      const initialCallCount = onData.mock.calls.length;

      // Should not poll yet at 400ms
      await vi.advanceTimersByTimeAsync(400);
      expect(onData.mock.calls.length).toBe(initialCallCount);

      // Should poll at 500ms
      await vi.advanceTimersByTimeAsync(100);
      expect(onData.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('uses custom poll interval when specified', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        pollInterval: 100,
        onData,
      });

      // Initial call
      await vi.advanceTimersByTimeAsync(10);
      const initialCallCount = onData.mock.calls.length;

      // Should poll at 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(onData.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('unsubscribe', () => {
    it('stops polling after unsubscribe', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      const id = manager.subscribe({
        types: ['processingLoad'],
        pollInterval: 100,
        onData,
      });

      // Initial call
      await vi.advanceTimersByTimeAsync(10);
      const callCount = onData.mock.calls.length;

      manager.unsubscribe(id);

      // Should not poll anymore
      await vi.advanceTimersByTimeAsync(500);
      expect(onData.mock.calls.length).toBe(callCount);
    });

    it('handles unsubscribe of non-existent subscription', () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);

      // Should not throw
      expect(() => { manager.unsubscribe('non-existent'); }).not.toThrow();
    });
  });

  describe('unsubscribeAll', () => {
    it('stops all subscriptions', async () => {
      const wsManager = createMockWsManager();
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData1 = vi.fn();
      const onData2 = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        pollInterval: 100,
        onData: onData1,
      });

      manager.subscribe({
        types: ['bufferLevel'],
        pollInterval: 100,
        onData: onData2,
      });

      // Initial calls
      await vi.advanceTimersByTimeAsync(10);
      const callCount1 = onData1.mock.calls.length;
      const callCount2 = onData2.mock.calls.length;

      manager.unsubscribeAll();

      // Should not poll anymore
      await vi.advanceTimersByTimeAsync(500);
      expect(onData1.mock.calls.length).toBe(callCount1);
      expect(onData2.mock.calls.length).toBe(callCount2);
    });
  });

  describe('connection state', () => {
    it('does not fetch when disconnected', async () => {
      const wsManager = createMockWsManager({ isConnected: false });
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(100);

      expect(wsManager.send).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns default values when fetch fails', async () => {
      const wsManager = {
        isConnected: true,
        send: vi.fn().mockRejectedValue(new Error('Connection error')),
      };
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        onData,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Individual fetch errors are caught and return defaults
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ processingLoad: 0 })
      );
    });

    it('continues polling after error', async () => {
      let callCount = 0;
      const wsManager = {
        isConnected: true,
        send: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Temporary error'));
          }
          return Promise.resolve(45.5);
        }),
      };
      const manager = new RealtimeSubscriptionManager(wsManager);
      const onData = vi.fn();

      manager.subscribe({
        types: ['processingLoad'],
        pollInterval: 100,
        onData,
        onError: vi.fn(),
      });

      // First call (fails)
      await vi.advanceTimersByTimeAsync(10);

      // Second call (succeeds)
      await vi.advanceTimersByTimeAsync(100);

      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ processingLoad: 45.5 })
      );
    });
  });
});

describe('createRealtimeSubscriptionManager', () => {
  it('creates a new subscription manager', () => {
    const wsManager = {
      isConnected: true,
      send: vi.fn(),
    };

    const manager = createRealtimeSubscriptionManager(wsManager);

    expect(manager).toBeInstanceOf(RealtimeSubscriptionManager);
  });
});
