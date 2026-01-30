import { useCallback, useEffect, useRef, useState } from 'react';
import type { SignalLevels, SignalLevelsRaw } from '../../../types';
import { normalizeSignalLevels } from '../../../types';
import { DEFAULT_STATE } from './constants';
import { applyPeakHoldDecay, updatePeakHold } from './peakHoldUtils';
import type { UseLevelsOptions, UseLevelsResult } from './types';

export function useLevels(options: UseLevelsOptions = {}): UseLevelsResult {
  const {
    wsManager,
    enabled = true,
    peakHoldDecay = 2000,
    peakHoldDecayRate = 0.5,
    pollInterval = 50,
  } = options;

  const [levels, setLevels] = useState(DEFAULT_STATE);
  const isPolling = enabled && !!wsManager;

  const rafRef = useRef<number | null>(null);
  const lastPollRef = useRef(0);
  const lastFrameRef = useRef(0);
  const peakHoldTimestampRef = useRef<Map<string, number>>(new Map());

  const fetchLevels = useCallback(async (): Promise<SignalLevels | null> => {
    if (!wsManager) return null;
    try {
      const raw = await wsManager.send<SignalLevelsRaw>('GetSignalLevelsSinceLast');
      return normalizeSignalLevels(raw);
    } catch {
      return null;
    }
  }, [wsManager]);

  const fetchClippedSamples = useCallback(async (): Promise<number> => {
    if (!wsManager) return 0;
    try {
      return await wsManager.send<number>('GetClippedSamples');
    } catch {
      return 0;
    }
  }, [wsManager]);

  const resetClipping = useCallback(() => {
    setLevels((prev) => ({ ...prev, clippedSamples: 0 }));
  }, []);

  useEffect(() => {
    if (!enabled || !wsManager) return;

    const animate = async (timestamp: number) => {
      const timeSinceLastPoll = timestamp - lastPollRef.current;

      if (timeSinceLastPoll >= pollInterval) {
        lastPollRef.current = timestamp;
        const [newLevels, clippedSamples] = await Promise.all([
          fetchLevels(),
          fetchClippedSamples(),
        ]);

        if (newLevels?.capture && newLevels.playback) {
          setLevels((prev) => ({
            capture: updatePeakHold(
              prev.capture,
              newLevels.capture,
              'capture',
              timestamp,
              peakHoldTimestampRef.current,
              peakHoldDecay,
              peakHoldDecayRate,
            ),
            playback: updatePeakHold(
              prev.playback,
              newLevels.playback,
              'playback',
              timestamp,
              peakHoldTimestampRef.current,
              peakHoldDecay,
              peakHoldDecayRate,
            ),
            clippedSamples,
            lastUpdated: timestamp,
          }));
        }
      } else if (timestamp - lastFrameRef.current >= 16) {
        lastFrameRef.current = timestamp;
        setLevels((prev) => {
          const nextCapture = applyPeakHoldDecay(
            prev.capture,
            'capture',
            timestamp,
            peakHoldTimestampRef.current,
            peakHoldDecay,
            peakHoldDecayRate,
          );
          const nextPlayback = applyPeakHoldDecay(
            prev.playback,
            'playback',
            timestamp,
            peakHoldTimestampRef.current,
            peakHoldDecay,
            peakHoldDecayRate,
          );
          if (nextCapture === prev.capture && nextPlayback === prev.playback) {
            return prev;
          }
          return { ...prev, capture: nextCapture, playback: nextPlayback };
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

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
    peakHoldDecay,
    peakHoldDecayRate,
  ]);

  return { levels, resetClipping, isPolling };
}
