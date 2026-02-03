import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageVisibility } from '../../../hooks';
import type { SignalLevels, SignalLevelsRaw } from '../../../types';
import { normalizeSignalLevels } from '../../../types';
import { DEFAULT_STATE } from './constants';
import { applyPeakHoldDecay, updatePeakHold } from './peakHoldUtils';
import type { UseLevelsOptions, UseLevelsResult } from './types';

const CLIPPED_SAMPLES_POLL_INTERVAL = 1000;
const STALLED_LEVELS_RECONNECT_AFTER_MS = 3000;
const RECONNECT_COOLDOWN_MS = 5000;
const MAX_CONSECUTIVE_LEVEL_FAILURES_BEFORE_RECONNECT = 3;

export function useLevels(options: UseLevelsOptions = {}): UseLevelsResult {
  const {
    wsManager,
    enabled = true,
    peakHoldDecay = 2000,
    peakHoldDecayRate = 0.5,
    pollInterval = 50,
  } = options;

  const [levels, setLevels] = useState(DEFAULT_STATE);
  const levelsRef = useRef(levels);
  const isPolling = enabled && !!wsManager;
  const isPageVisible = usePageVisibility();

  const rafRef = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);
  const lastPollRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastClippedPollRef = useRef<number>(-Infinity);
  const isPageVisibleRef = useRef(true);
  const lastSuccessfulLevelsRef = useRef(0);
  const consecutiveLevelFailuresRef = useRef(0);
  const lastReconnectAttemptRef = useRef(0);
  const peakHoldTimestampRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

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
    if (levelsRef.current.clippedSamples === 0) return;
    setLevels((prev) => {
      if (prev.clippedSamples === 0) return prev;
      const next = { ...prev, clippedSamples: 0 };
      levelsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    isPageVisibleRef.current = isPageVisible;

    // When returning to the tab, allow an immediate poll.
    if (isPageVisible) {
      lastPollRef.current = 0;
      lastClippedPollRef.current = -Infinity;
    }
  }, [isPageVisible]);

  useEffect(() => {
    if (!enabled || !wsManager) {
      // Clear peak hold timestamps when disabled
      peakHoldTimestampRef.current.clear();
      return;
    }

    let alive = true;

    const maybeReconnect = (timestamp: number) => {
      if (!wsManager.reconnect) return;

      const lastSuccessAt = lastSuccessfulLevelsRef.current;
      if (lastSuccessAt <= 0) return;

      const staleFor = timestamp - lastSuccessAt;
      if (staleFor < STALLED_LEVELS_RECONNECT_AFTER_MS) return;

      if (consecutiveLevelFailuresRef.current < MAX_CONSECUTIVE_LEVEL_FAILURES_BEFORE_RECONNECT) {
        return;
      }

      if (timestamp - lastReconnectAttemptRef.current < RECONNECT_COOLDOWN_MS) {
        return;
      }

      lastReconnectAttemptRef.current = timestamp;
      consecutiveLevelFailuresRef.current = 0;
      wsManager.reconnect();
    };

    const pollOnce = async (timestamp: number) => {
      if (!alive) return;
      if (pollInFlightRef.current) return;

      pollInFlightRef.current = true;

      const shouldPollClipped = timestamp - lastClippedPollRef.current >= CLIPPED_SAMPLES_POLL_INTERVAL;
      if (shouldPollClipped) {
        lastClippedPollRef.current = timestamp;
      }

      try {
        const newLevels = await fetchLevels();

        if (shouldPollClipped && alive) {
          // Do not let clipped sample fetching delay meter updates.
          // Check alive before starting fetch to avoid unnecessary network requests on unmount.
          void fetchClippedSamples().then((clippedSamples) => {
            if (!alive) return;
            if (levelsRef.current.clippedSamples === clippedSamples) return;
            setLevels((prev) => {
              if (prev.clippedSamples === clippedSamples) return prev;
              const next = { ...prev, clippedSamples };
              levelsRef.current = next;
              return next;
            });
          });
        }

        if (!alive) return;

        if (newLevels?.capture && newLevels.playback) {
          lastSuccessfulLevelsRef.current = timestamp;
          consecutiveLevelFailuresRef.current = 0;

          // Clean up stale peak hold timestamps for removed channels
          // Only delete if map is larger than expected (avoids Set allocation on every poll)
          const expectedSize = newLevels.capture.length + newLevels.playback.length;
          if (peakHoldTimestampRef.current.size > expectedSize) {
            const captureCount = newLevels.capture.length;
            const playbackCount = newLevels.playback.length;
            for (const key of peakHoldTimestampRef.current.keys()) {
              const parts = key.split('-');
              const prefix = parts[0];
              const index = parseInt(parts[1] ?? '0', 10);
              const isValid = (prefix === 'capture' && index < captureCount) ||
                              (prefix === 'playback' && index < playbackCount);
              if (!isValid) {
                peakHoldTimestampRef.current.delete(key);
              }
            }
          }

          setLevels((prev) => {
            const capture = updatePeakHold(
              prev.capture,
              newLevels.capture,
              'capture',
              timestamp,
              peakHoldTimestampRef.current,
              peakHoldDecay,
              peakHoldDecayRate,
            );
            const playback = updatePeakHold(
              prev.playback,
              newLevels.playback,
              'playback',
              timestamp,
              peakHoldTimestampRef.current,
              peakHoldDecay,
              peakHoldDecayRate,
            );
            const next = {
              capture,
              playback,
              clippedSamples: prev.clippedSamples,
              lastUpdated: timestamp,
            };
            levelsRef.current = next;
            return next;
          });
          return;
        }

        consecutiveLevelFailuresRef.current += 1;
        maybeReconnect(timestamp);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const animate = (timestamp: number) => {
      if (!alive) return;

      if (!isPageVisibleRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const timeSinceLastPoll = timestamp - lastPollRef.current;
      if (timeSinceLastPoll >= pollInterval && !pollInFlightRef.current) {
        lastPollRef.current = timestamp;
        void pollOnce(timestamp);
      }

      if (timestamp - lastFrameRef.current >= 16) {
        lastFrameRef.current = timestamp;
        const snapshot = levelsRef.current;
        const snapshotCapture = applyPeakHoldDecay(
          snapshot.capture,
          'capture',
          timestamp,
          peakHoldTimestampRef.current,
          peakHoldDecay,
          peakHoldDecayRate,
        );
        const snapshotPlayback = applyPeakHoldDecay(
          snapshot.playback,
          'playback',
          timestamp,
          peakHoldTimestampRef.current,
          peakHoldDecay,
          peakHoldDecayRate,
        );
        const captureChanged = snapshotCapture !== snapshot.capture;
        const playbackChanged = snapshotPlayback !== snapshot.playback;

        // Avoid calling setState when nothing changes; repeated no-op updates can accumulate
        // in React's internal update queue over time.
        if (captureChanged || playbackChanged) {
          setLevels((prev) => {
            if (prev.capture === snapshot.capture && prev.playback === snapshot.playback) {
              const next = { ...prev, capture: snapshotCapture, playback: snapshotPlayback };
              levelsRef.current = next;
              return next;
            }

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
            const next = { ...prev, capture: nextCapture, playback: nextPlayback };
            levelsRef.current = next;
            return next;
          });
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      alive = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pollInFlightRef.current = false;
      lastPollRef.current = 0;
      lastFrameRef.current = 0;
      lastClippedPollRef.current = -Infinity;
      lastSuccessfulLevelsRef.current = 0;
      consecutiveLevelFailuresRef.current = 0;
      lastReconnectAttemptRef.current = 0;
      // Clear peak hold timestamps on unmount to prevent memory leak
      peakHoldTimestampRef.current.clear();
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
