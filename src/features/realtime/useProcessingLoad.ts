import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { usePageVisibility } from '../../hooks';
import { normalizeBufferLevel } from '../../types';

export interface ProcessingLoadState {
  /** CPU processing load as percentage (0-100) */
  processingLoad: number;
  /** Buffer fill level as percentage (0-100) */
  bufferLevel: number;
  /** Capture sample rate in Hz */
  captureSampleRate: number;
  /** Rate adjust factor (for resampling) */
  rateAdjust: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

export interface UseProcessingLoadOptions {
  /** WebSocket manager instance with send method */
  wsManager?: { send: <T>(cmd: string) => Promise<T> };
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Polling interval in ms (default: 500 for 2 updates/sec) */
  pollInterval?: number;
}

const DEFAULT_STATE: ProcessingLoadState = {
  processingLoad: 0,
  bufferLevel: 0,
  captureSampleRate: 0,
  rateAdjust: 1.0,
  lastUpdated: 0,
};

/**
 * Hook for real-time processing metrics monitoring.
 *
 * Polls CamillaDSP at a configurable interval to retrieve:
 * - CPU processing load
 * - Buffer fill level
 * - Capture sample rate
 * - Rate adjust factor
 *
 * Uses a slower polling rate than level meters since these
 * metrics don't need sub-second updates.
 */
export function useProcessingLoad(options: UseProcessingLoadOptions = {}): {
  metrics: ProcessingLoadState;
  isPolling: boolean;
} {
  const {
    wsManager,
    enabled = true,
    pollInterval = 500,
  } = options;

  const [metrics, setMetrics] = useState<ProcessingLoadState>(DEFAULT_STATE);
  const isPolling = enabled && !!wsManager;
  const isPageVisible = usePageVisibility();

  // Refs for interval management
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);
  const isMountedRef = useRef(false);

  /**
   * Fetch processing load from WebSocket
   */
  const fetchProcessingLoad = useCallback(async (): Promise<number> => {
    if (!wsManager) return 0;

    try {
      const result = await wsManager.send<number>('GetProcessingLoad');
      return result;
    } catch {
      return 0;
    }
  }, [wsManager]);

  /**
   * Fetch buffer level from WebSocket
   */
  const fetchBufferLevel = useCallback(async (): Promise<number> => {
    if (!wsManager) return 0;

    try {
      const result = await wsManager.send<number>('GetBufferLevel');
      return normalizeBufferLevel(result);
    } catch {
      return 0;
    }
  }, [wsManager]);

  /**
   * Fetch capture sample rate from WebSocket
   */
  const fetchCaptureSampleRate = useCallback(async (): Promise<number> => {
    if (!wsManager) return 0;

    try {
      const result = await wsManager.send<number>('GetCaptureSampleRate');
      return result;
    } catch {
      return 0;
    }
  }, [wsManager]);

  /**
   * Fetch rate adjust from WebSocket
   */
  const fetchRateAdjust = useCallback(async (): Promise<number> => {
    if (!wsManager) return 1.0;

    try {
      const result = await wsManager.send<number>('GetRateAdjust');
      return result;
    } catch {
      return 1.0;
    }
  }, [wsManager]);

  /**
   * Poll all metrics
   */
  const pollMetrics = useCallback(async () => {
    const [processingLoad, bufferLevel, captureSampleRate, rateAdjust] =
      await Promise.all([
        fetchProcessingLoad(),
        fetchBufferLevel(),
        fetchCaptureSampleRate(),
        fetchRateAdjust(),
      ]);

    if (!isMountedRef.current) {
      return;
    }

    setMetrics({
      processingLoad,
      bufferLevel,
      captureSampleRate,
      rateAdjust,
      lastUpdated: Date.now(),
    });
  }, [fetchProcessingLoad, fetchBufferLevel, fetchCaptureSampleRate, fetchRateAdjust]);

  /**
   * Main polling effect
   */
  useEffect(() => {
    if (!enabled || !wsManager || !isPageVisible) {
      return;
    }

    isMountedRef.current = true;

    const pollOnce = async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        await pollMetrics();
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void pollOnce();

    // Set up interval
    intervalRef.current = setInterval(() => { void pollOnce(); }, pollInterval);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      pollInFlightRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, wsManager, pollInterval, pollMetrics, isPageVisible]);

  return {
    metrics,
    isPolling,
  };
}

/**
 * Hook for a combined view of processing state.
 * Returns formatted values ready for display.
 */
export function useFormattedProcessingMetrics(options: UseProcessingLoadOptions = {}): {
  /** CPU load as formatted string (e.g., "45.2%") */
  cpuLoadFormatted: string;
  /** Buffer level as formatted string (e.g., "78%") */
  bufferLevelFormatted: string;
  /** Sample rate as formatted string (e.g., "48.0 kHz") */
  sampleRateFormatted: string;
  /** Rate adjust as formatted string (e.g., "1.002x") */
  rateAdjustFormatted: string;
  /** CPU load color class based on level */
  cpuLoadColor: 'text-meter-green' | 'text-meter-yellow' | 'text-meter-red';
  /** Buffer level color class based on level */
  bufferLevelColor: 'text-meter-green' | 'text-meter-yellow' | 'text-meter-red';
  /** Whether currently polling */
  isPolling: boolean;
  /** Raw metrics state */
  metrics: ProcessingLoadState;
} {
  const { metrics, isPolling } = useProcessingLoad(options);

  // Memoize formatted strings to avoid allocation on every render
  return useMemo(() => {
    // CPU load color: green < 50%, yellow 50-80%, red > 80%
    const cpuLoadColor =
      metrics.processingLoad > 80
        ? 'text-meter-red'
        : metrics.processingLoad > 50
          ? 'text-meter-yellow'
          : 'text-meter-green';

    // Buffer level color: green 30-80%, yellow 20-30% or 80-90%, red < 20% or > 90%
    const bufferLevelColor =
      metrics.bufferLevel < 20 || metrics.bufferLevel > 90
        ? 'text-meter-red'
        : metrics.bufferLevel < 30 || metrics.bufferLevel > 80
          ? 'text-meter-yellow'
          : 'text-meter-green';

    return {
      cpuLoadFormatted: `${metrics.processingLoad.toFixed(1)}%`,
      bufferLevelFormatted: `${metrics.bufferLevel.toFixed(0)}%`,
      sampleRateFormatted:
        metrics.captureSampleRate > 0
          ? `${(metrics.captureSampleRate / 1000).toFixed(1)} kHz`
          : '-- kHz',
      rateAdjustFormatted: `${metrics.rateAdjust.toFixed(4)}x`,
      cpuLoadColor,
      bufferLevelColor,
      isPolling,
      metrics,
    };
  }, [metrics, isPolling]);
}
