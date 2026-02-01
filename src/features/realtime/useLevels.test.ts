import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLevels, useChannelLevel } from './useLevels';
import type { SignalLevelsRaw } from '../../types';

describe('useLevels', () => {
  // Mock requestAnimationFrame
  let rafCallback: FrameRequestCallback | null = null;
  let rafId = 0;

  beforeEach(() => {
    rafCallback = null;
    rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockLevels: SignalLevelsRaw = {
    capture_peak: [-15, -18],
    capture_rms: [-20, -25],
    playback_peak: [-12, -10],
    playback_rms: [-18, -16],
  };

  const createMockWsManager = (levels = mockLevels, clippedSamples = 0) => ({
    send: vi.fn().mockImplementation((cmd: string) => {
      if (cmd === 'GetSignalLevelsSinceLast') {
        return Promise.resolve(levels);
      }
      if (cmd === 'GetClippedSamples') {
        return Promise.resolve(clippedSamples);
      }
      return Promise.resolve(null);
    }),
  });

  describe('initialization', () => {
    it('returns default state when wsManager is not provided', () => {
      const { result } = renderHook(() => useLevels());

      expect(result.current.levels.capture).toEqual([]);
      expect(result.current.levels.playback).toEqual([]);
      expect(result.current.levels.clippedSamples).toBe(0);
      expect(result.current.isPolling).toBe(false);
    });

    it('returns default state when disabled', () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useLevels({ wsManager, enabled: false })
      );

      expect(result.current.isPolling).toBe(false);
    });

    it('starts polling when wsManager is provided and enabled', () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() => useLevels({ wsManager }));

      expect(result.current.isPolling).toBe(true);
    });
  });

  describe('data fetching', () => {
    it('fetches levels from wsManager', async () => {
      const wsManager = createMockWsManager();
      renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      // Simulate animation frame
      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      expect(wsManager.send).toHaveBeenCalledWith('GetSignalLevelsSinceLast');
      expect(wsManager.send).toHaveBeenCalledWith('GetClippedSamples');
    });

    it('updates levels state with fetched data', async () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      // Simulate animation frame
      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      await waitFor(() => {
        expect(result.current.levels.capture).toHaveLength(2);
      });

      expect(result.current.levels.capture[0]?.peak).toBe(-15);
      expect(result.current.levels.capture[0]?.rms).toBe(-20);
      expect(result.current.levels.playback[0]?.peak).toBe(-12);
    });

    it('updates clipped samples count', async () => {
      const wsManager = createMockWsManager(mockLevels, 42);
      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      await waitFor(() => {
        expect(result.current.levels.clippedSamples).toBe(42);
      });
    });

    it('handles fetch errors gracefully', async () => {
      const wsManager = {
        send: vi.fn().mockRejectedValue(new Error('Connection error')),
      };

      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      // Should not throw and should maintain default state
      expect(result.current.levels.capture).toEqual([]);
    });
  });

  describe('peak hold', () => {
    it('tracks peak hold value', async () => {
      const wsManager = createMockWsManager();
      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      await waitFor(() => {
        expect(result.current.levels.capture[0]?.peakHold).toBeDefined();
      });

      // Peak hold should be set to peak initially
      expect(result.current.levels.capture[0]?.peakHold).toBe(-15);
    });

    it('updates peak hold when new peak is higher', async () => {
      const wsManager = createMockWsManager({
        capture_peak: [-15],
        capture_rms: [-20],
        playback_peak: [],
        playback_rms: [],
      });

      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      // First update
      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      await waitFor(() => {
        expect(result.current.levels.capture[0]?.peakHold).toBe(-15);
      });

      // Update mock to return higher peak
      wsManager.send.mockImplementation((cmd: string) => {
        if (cmd === 'GetSignalLevelsSinceLast') {
          return Promise.resolve({
            capture_peak: [-10],
            capture_rms: [-18],
            playback_peak: [],
            playback_rms: [],
          });
        }
        return Promise.resolve(0);
      });

      // Second update with higher peak
      await act(async () => {
        await (rafCallback as any)?.(200);
      });

      await waitFor(() => {
        expect(result.current.levels.capture[0]?.peakHold).toBe(-10);
      });
    });
  });

  describe('resetClipping', () => {
    it('resets clipped samples to 0', async () => {
      const wsManager = createMockWsManager(mockLevels, 100);
      const { result } = renderHook(() =>
        useLevels({ wsManager, pollInterval: 0 })
      );

      await act(async () => {
        await (rafCallback as any)?.(100);
      });

      await waitFor(() => {
        expect(result.current.levels.clippedSamples).toBe(100);
      });

      act(() => {
        result.current.resetClipping();
      });

      expect(result.current.levels.clippedSamples).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('cancels animation frame on unmount', () => {
      const cancelRAF = vi.fn();
      vi.stubGlobal('cancelAnimationFrame', cancelRAF);

      const wsManager = createMockWsManager();
      const { unmount } = renderHook(() => useLevels({ wsManager }));

      // Trigger at least one animation frame
      act(() => {
        if (rafCallback) rafCallback(100);
      });

      unmount();

      expect(cancelRAF).toHaveBeenCalled();
    });

    it('stops polling on unmount', async () => {
      const wsManager = createMockWsManager();
      const { result, unmount } = renderHook(() => useLevels({ wsManager }));

      expect(result.current.isPolling).toBe(true);

      unmount();

      // isPolling should be false after unmount (checked through rerender behavior)
      // We can't directly check result.current after unmount
    });
  });
});

describe('useChannelLevel', () => {
  beforeEach(() => {
    let _rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (_cb: FrameRequestCallback) => {
      return ++_rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockLevels: SignalLevelsRaw = {
    capture_peak: [-15, -18],
    capture_rms: [-20, -25],
    playback_peak: [-12],
    playback_rms: [-18],
  };

  it('returns default level when wsManager is not provided', () => {
    const { result } = renderHook(() =>
      useChannelLevel(undefined, 'capture', 0)
    );

    expect(result.current.peak).toBe(-60);
    expect(result.current.rms).toBe(-60);
  });

  it('returns default level when channel index is out of bounds', () => {
    const wsManager = {
      send: vi.fn().mockResolvedValue(mockLevels),
    };

    const { result } = renderHook(() =>
      useChannelLevel(wsManager, 'capture', 10)
    );

    expect(result.current.peak).toBe(-60);
    expect(result.current.rms).toBe(-60);
  });

  it('returns default level when disabled', () => {
    const wsManager = {
      send: vi.fn().mockResolvedValue(mockLevels),
    };

    const { result } = renderHook(() =>
      useChannelLevel(wsManager, 'capture', 0, false)
    );

    expect(result.current.peak).toBe(-60);
    expect(result.current.rms).toBe(-60);
  });
});
