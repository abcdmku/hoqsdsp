import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProcessingLoad, useFormattedProcessingMetrics } from './useProcessingLoad';

describe('useProcessingLoad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockWsManager = (
    processingLoad = 45.5,
    bufferLevel = 0.6,
    sampleRate = 48000,
    rateAdjust = 1.0
  ) => ({
    send: vi.fn().mockImplementation((cmd: string) => {
      switch (cmd) {
        case 'GetProcessingLoad':
          return Promise.resolve(processingLoad);
        case 'GetBufferLevel':
          return Promise.resolve(bufferLevel);
        case 'GetCaptureSampleRate':
          return Promise.resolve(sampleRate);
        case 'GetRateAdjust':
          return Promise.resolve(rateAdjust);
        default:
          return Promise.resolve(null);
      }
    }),
  });

  describe('initialization', () => {
    it('returns default state when wsManager is not provided', () => {
      const { result } = renderHook(() => useProcessingLoad());

      expect(result.current.metrics.processingLoad).toBe(0);
      expect(result.current.metrics.bufferLevel).toBe(0);
      expect(result.current.metrics.captureSampleRate).toBe(0);
      expect(result.current.metrics.rateAdjust).toBe(1.0);
      expect(result.current.isPolling).toBe(false);
    });

    it('returns default state when disabled', () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, enabled: false })
      );

      expect(result.current.isPolling).toBe(false);
    });

    it('starts polling when wsManager is provided and enabled', async () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      expect(result.current.isPolling).toBe(true);
    });
  });

  describe('data fetching', () => {
    it('fetches all metrics from wsManager', async () => {
      const wsManager = createMockWsManager();
      renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      // Wait for initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(wsManager.send).toHaveBeenCalledWith('GetProcessingLoad');
      expect(wsManager.send).toHaveBeenCalledWith('GetBufferLevel');
      expect(wsManager.send).toHaveBeenCalledWith('GetCaptureSampleRate');
      expect(wsManager.send).toHaveBeenCalledWith('GetRateAdjust');
    });

    it('updates metrics state with fetched data', async () => {
      const wsManager = createMockWsManager(50.5, 0.75, 96000, 1.0002);
      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      // Wait for initial fetch and state update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
        // Allow promises to resolve
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.metrics.processingLoad).toBe(50.5);
      expect(result.current.metrics.bufferLevel).toBe(75); // Converted to percentage
      expect(result.current.metrics.captureSampleRate).toBe(96000);
      expect(result.current.metrics.rateAdjust).toBe(1.0002);
    });

    it('converts buffer level from 0-1 to percentage', async () => {
      const wsManager = createMockWsManager(30, 0.45, 48000, 1.0);
      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      // Wait for initial fetch and state update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.metrics.bufferLevel).toBe(45);
    });

    it('handles fetch errors gracefully', async () => {
      const wsManager = {
        send: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      // Should not throw and should maintain default state
      expect(result.current.metrics.processingLoad).toBe(0);
      expect(result.current.metrics.bufferLevel).toBe(0);
    });
  });

  describe('polling', () => {
    it('polls at specified interval', async () => {
      const wsManager = createMockWsManager();
      renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 200 })
      );

      // Initial call
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      const initialCallCount = wsManager.send.mock.calls.length;

      // After one interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(wsManager.send.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('uses default poll interval of 500ms', async () => {
      const wsManager = createMockWsManager();
      renderHook(() => useProcessingLoad({ wsManager }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      const initialCallCount = wsManager.send.mock.calls.length;

      // Should not poll yet at 400ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      // Should poll at 500ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(wsManager.send.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('cleanup', () => {
    it('stops polling on unmount', async () => {
      const wsManager = createMockWsManager();
      const { unmount } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      const callCount = wsManager.send.mock.calls.length;

      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // No new calls should have been made after unmount
      expect(wsManager.send.mock.calls.length).toBe(callCount);
    });

    it('clears interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const wsManager = createMockWsManager();
      const { unmount } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('updates lastUpdated timestamp', () => {
    it('sets lastUpdated after successful fetch', async () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useProcessingLoad({ wsManager, pollInterval: 100 })
      );

      expect(result.current.metrics.lastUpdated).toBe(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.metrics.lastUpdated).toBeGreaterThan(0);
    });
  });
});

describe('useFormattedProcessingMetrics', () => {
  describe('formatted values - static tests', () => {
    it('shows placeholder for zero sample rate', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      expect(result.current.sampleRateFormatted).toBe('-- kHz');
    });

    it('shows default CPU load formatted', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      expect(result.current.cpuLoadFormatted).toBe('0.0%');
    });

    it('shows default buffer level formatted', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      expect(result.current.bufferLevelFormatted).toBe('0%');
    });

    it('shows default rate adjust formatted', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      expect(result.current.rateAdjustFormatted).toBe('1.0000x');
    });
  });

  describe('CPU load color - static with default values', () => {
    it('returns green for default load (0%)', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      // Default load is 0, which is below 50%
      expect(result.current.cpuLoadColor).toBe('text-meter-green');
    });
  });

  describe('buffer level color - static with default values', () => {
    it('returns red for default buffer level (0%)', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      // Default buffer is 0, which is critically low (<20%)
      expect(result.current.bufferLevelColor).toBe('text-meter-red');
    });
  });

  describe('isPolling state', () => {
    it('returns false when no wsManager provided', () => {
      const { result } = renderHook(() => useFormattedProcessingMetrics());

      expect(result.current.isPolling).toBe(false);
    });
  });
});
