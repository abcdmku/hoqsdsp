import { useEffect, useRef, useCallback, useState } from 'react';
import type { SignalLevels, ChannelLevels } from '../../types';

export interface LevelState {
  /** Capture (input) channel levels */
  capture: ChannelLevelState[];
  /** Playback (output) channel levels */
  playback: ChannelLevelState[];
  /** Number of clipped samples since last reset */
  clippedSamples: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

export interface ChannelLevelState extends ChannelLevels {
  /** Peak hold value (slowly decays) */
  peakHold: number;
}

export interface UseLevelsOptions {
  /** WebSocket manager instance with send method */
  wsManager?: { send: <T>(cmd: string) => Promise<T> };
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Peak hold decay time in ms (default: 2000) */
  peakHoldDecay?: number;
  /** Peak hold decay rate in dB/frame (default: 0.5) */
  peakHoldDecayRate?: number;
  /** Polling interval in ms (default: 50 for ~20 updates/sec from server) */
  pollInterval?: number;
}

const DEFAULT_LEVEL: ChannelLevelState = {
  peak: -60,
  rms: -60,
  peakHold: -60,
};

const DEFAULT_STATE: LevelState = {
  capture: [],
  playback: [],
  clippedSamples: 0,
  lastUpdated: 0,
};

/**
 * Hook for real-time signal level monitoring with 60fps visual updates.
 *
 * Uses requestAnimationFrame for smooth meter animations while polling
 * the CamillaDSP WebSocket at a configurable interval.
 *
 * Features:
 * - Peak hold with configurable decay
 * - Clipped samples tracking
 * - Automatic cleanup on unmount
 * - Graceful handling of connection loss
 */
export function useLevels(options: UseLevelsOptions = {}): {
  levels: LevelState;
  resetClipping: () => void;
  isPolling: boolean;
} {
  const {
    wsManager,
    enabled = true,
    peakHoldDecay = 2000,
    peakHoldDecayRate = 0.5,
    pollInterval = 50,
  } = options;

  const [levels, setLevels] = useState<LevelState>(DEFAULT_STATE);
  const isPolling = enabled && !!wsManager;

  // Refs for animation frame and timing
  const rafRef = useRef<number | null>(null);
  const lastPollRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const peakHoldTimestampRef = useRef<Map<string, number>>(new Map());
  const currentLevelsRef = useRef<LevelState>(DEFAULT_STATE);

  // Update ref when state changes (for use in RAF callback)
  useEffect(() => {
    currentLevelsRef.current = levels;
  }, [levels]);

  /**
   * Fetch levels from WebSocket
   */
  const fetchLevels = useCallback(async (): Promise<SignalLevels | null> => {
    if (!wsManager) return null;

    try {
      const result = await wsManager.send<SignalLevels>('GetSignalLevelsSinceLast');
      return result;
    } catch {
      // Connection error - return null to indicate failure
      return null;
    }
  }, [wsManager]);

  /**
   * Fetch clipped samples count
   */
  const fetchClippedSamples = useCallback(async (): Promise<number> => {
    if (!wsManager) return 0;

    try {
      const result = await wsManager.send<number>('GetClippedSamples');
      return result;
    } catch {
      return 0;
    }
  }, [wsManager]);

  /**
   * Reset clipping counter
   */
  const resetClipping = useCallback(() => {
    setLevels((prev) => ({
      ...prev,
      clippedSamples: 0,
    }));
  }, []);

  /**
   * Update peak hold values with decay
   */
  const updatePeakHold = useCallback(
    (
      channels: ChannelLevelState[],
      newLevels: ChannelLevels[],
      prefix: string,
      now: number
    ): ChannelLevelState[] => {
      return newLevels.map((newLevel, index) => {
        const key = `${prefix}-${index}`;
        const existing = channels[index] ?? DEFAULT_LEVEL;
        const lastPeakTime = peakHoldTimestampRef.current.get(key) ?? 0;

        let newPeakHold = existing.peakHold;

        // If new peak is higher, update peak hold
        if (newLevel.peak > newPeakHold) {
          newPeakHold = newLevel.peak;
          peakHoldTimestampRef.current.set(key, now);
        } else if (now - lastPeakTime > peakHoldDecay) {
          // Decay peak hold after hold time expires
          newPeakHold = Math.max(newPeakHold - peakHoldDecayRate, newLevel.peak);
        }

        return {
          peak: newLevel.peak,
          rms: newLevel.rms,
          peakHold: newPeakHold,
        };
      });
    },
    [peakHoldDecay, peakHoldDecayRate]
  );

  /**
   * Main animation loop using requestAnimationFrame
   */
  useEffect(() => {
    if (!enabled || !wsManager) {
      return;
    }

    const animate = async (timestamp: number) => {
      // Calculate time since last poll
      const timeSinceLastPoll = timestamp - lastPollRef.current;

      // Poll for new data at the specified interval
      if (timeSinceLastPoll >= pollInterval) {
        lastPollRef.current = timestamp;

        const [newLevels, clippedSamples] = await Promise.all([
          fetchLevels(),
          fetchClippedSamples(),
        ]);

        if (newLevels) {
          setLevels((prev) => ({
            capture: updatePeakHold(
              prev.capture,
              newLevels.capture,
              'capture',
              timestamp
            ),
            playback: updatePeakHold(
              prev.playback,
              newLevels.playback,
              'playback',
              timestamp
            ),
            clippedSamples,
            lastUpdated: timestamp,
          }));
        }
      } else {
        // Between polls, just update peak hold decay for smooth animation
        const timeSinceLastFrame = timestamp - lastFrameRef.current;

        // Only update if enough time has passed (target 60fps = ~16.67ms)
        if (timeSinceLastFrame >= 16) {
          lastFrameRef.current = timestamp;

          setLevels((prev) => {
            // Check if any peak holds need decay
            const captureNeedsUpdate = prev.capture.some((ch, i) => {
              const key = `capture-${i}`;
              const lastPeakTime = peakHoldTimestampRef.current.get(key) ?? 0;
              return timestamp - lastPeakTime > peakHoldDecay && ch.peakHold > ch.peak;
            });

            const playbackNeedsUpdate = prev.playback.some((ch, i) => {
              const key = `playback-${i}`;
              const lastPeakTime = peakHoldTimestampRef.current.get(key) ?? 0;
              return timestamp - lastPeakTime > peakHoldDecay && ch.peakHold > ch.peak;
            });

            if (!captureNeedsUpdate && !playbackNeedsUpdate) {
              return prev;
            }

            return {
              ...prev,
              capture: prev.capture.map((ch, i) => {
                const key = `capture-${i}`;
                const lastPeakTime = peakHoldTimestampRef.current.get(key) ?? 0;
                if (timestamp - lastPeakTime > peakHoldDecay && ch.peakHold > ch.peak) {
                  return {
                    ...ch,
                    peakHold: Math.max(ch.peakHold - peakHoldDecayRate, ch.peak),
                  };
                }
                return ch;
              }),
              playback: prev.playback.map((ch, i) => {
                const key = `playback-${i}`;
                const lastPeakTime = peakHoldTimestampRef.current.get(key) ?? 0;
                if (timestamp - lastPeakTime > peakHoldDecay && ch.peakHold > ch.peak) {
                  return {
                    ...ch,
                    peakHold: Math.max(ch.peakHold - peakHoldDecayRate, ch.peak),
                  };
                }
                return ch;
              }),
            };
          });
        }
      }

      // Schedule next frame
      rafRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    enabled,
    wsManager,
    pollInterval,
    fetchLevels,
    fetchClippedSamples,
    updatePeakHold,
    peakHoldDecay,
    peakHoldDecayRate,
  ]);

  return {
    levels,
    resetClipping,
    isPolling,
  };
}

/**
 * Simplified hook for single-channel level monitoring.
 * Useful for mini meters in unit cards.
 */
export function useChannelLevel(
  wsManager: { send: <T>(cmd: string) => Promise<T> } | undefined,
  channel: 'capture' | 'playback',
  index: number,
  enabled = true
): ChannelLevelState {
  const { levels } = useLevels({ wsManager, enabled });

  const channels = channel === 'capture' ? levels.capture : levels.playback;
  return channels[index] ?? DEFAULT_LEVEL;
}
