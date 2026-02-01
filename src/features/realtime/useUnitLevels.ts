import { useMemo } from 'react';
import { getWebSocketManager } from '../../lib/websocket/managerRegistry';
import { useConnectionStore } from '../../stores/connectionStore';
import { useLevels, type LevelState, type ChannelLevelState, type UseLevelsOptions } from './useLevels';
import type { WSCommand } from '../../types';

export interface UseUnitLevelsOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Peak hold decay time in ms (default: 2000) */
  peakHoldDecay?: number;
  /** Peak hold decay rate in dB/frame (default: 0.5) */
  peakHoldDecayRate?: number;
  /** Polling interval in ms (default: 50 for ~20 updates/sec) */
  pollInterval?: number;
}

export interface UseUnitLevelsResult {
  /** Capture (input) channel levels */
  capture: ChannelLevelState[];
  /** Playback (output) channel levels */
  playback: ChannelLevelState[];
  /** Number of clipped samples since last reset */
  clippedSamples: number;
  /** Whether the hook is actively polling */
  isPolling: boolean;
  /** Reset the clipping counter */
  resetClipping: () => void;
  /** Whether the unit is connected */
  isConnected: boolean;
}

const EMPTY_RESULT: UseUnitLevelsResult = {
  capture: [],
  playback: [],
  clippedSamples: 0,
  isPolling: false,
  resetClipping: () => {},
  isConnected: false,
};

/**
 * Convenience hook for getting real-time signal levels from a CamillaDSP unit.
 *
 * This hook automatically looks up the WebSocket manager for the given unit ID
 * and returns the signal levels with peak hold tracking.
 *
 * @param unitId - The unit ID to get levels for (null to disable)
 * @param options - Configuration options
 * @returns Level data with capture/playback arrays and clipping info
 *
 * @example
 * ```tsx
 * function UnitMeter({ unitId }: { unitId: string }) {
 *   const { capture, playback, clippedSamples, isConnected } = useUnitLevels(unitId);
 *
 *   if (!isConnected) return <div>Disconnected</div>;
 *
 *   return (
 *     <div>
 *       <MultiChannelMeter levels={capture.map(c => c.peak)} />
 *       <MultiChannelMeter levels={playback.map(c => c.peak)} />
 *       {clippedSamples > 0 && <span>Clipping!</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnitLevels(
  unitId: string | null,
  options: UseUnitLevelsOptions = {}
): UseUnitLevelsResult {
  const { enabled = true, peakHoldDecay, peakHoldDecayRate, pollInterval } = options;

  // Check connection status from the store
  const connectionStatus = useConnectionStore((state) => {
    if (!unitId) return 'disconnected';
    return state.connections.get(unitId)?.status ?? 'disconnected';
  });

  const isConnected = connectionStatus === 'connected';

  // Get the WebSocket manager for this unit, wrapped to match the expected interface
  // Note: We memoize this lookup but it's fine if the manager changes
  // because useLevels handles that case gracefully
  const wsManager = useMemo((): UseLevelsOptions['wsManager'] => {
    if (!unitId || !isConnected) return undefined;
    const manager = getWebSocketManager(unitId);
    if (!manager) return undefined;

    // Wrap the manager to match the expected interface
    return {
      send: <T>(cmd: string) => manager.send<T>(cmd as WSCommand),
      reconnect: () => {
        manager.disconnect();
        void manager.connect().catch(() => {});
      },
    };
  }, [unitId, isConnected]);

  // Use the base levels hook with the WebSocket manager
  const { levels, resetClipping, isPolling } = useLevels({
    wsManager,
    enabled: enabled && isConnected,
    peakHoldDecay,
    peakHoldDecayRate,
    pollInterval,
  });

  // Return empty result if not connected or disabled
  if (!unitId || !isConnected || !enabled) {
    return EMPTY_RESULT;
  }

  return {
    capture: levels.capture,
    playback: levels.playback,
    clippedSamples: levels.clippedSamples,
    isPolling,
    resetClipping,
    isConnected,
  };
}

/**
 * Get input levels as a simple [left, right] tuple for stereo display.
 * Returns undefined if not enough channels available.
 */
export function getStereoInputLevels(
  levels: LevelState
): [number, number] | undefined {
  if (levels.capture.length < 2) return undefined;
  return [levels.capture[0]?.peak ?? -60, levels.capture[1]?.peak ?? -60];
}

/**
 * Get output levels as a simple [left, right] tuple for stereo display.
 * Returns undefined if not enough channels available.
 */
export function getStereoOutputLevels(
  levels: LevelState
): [number, number] | undefined {
  if (levels.playback.length < 2) return undefined;
  return [levels.playback[0]?.peak ?? -60, levels.playback[1]?.peak ?? -60];
}

/**
 * Get stereo peak hold values for input channels.
 */
export function getStereoInputPeaks(
  levels: LevelState
): [number, number] | undefined {
  if (levels.capture.length < 2) return undefined;
  return [levels.capture[0]?.peakHold ?? -60, levels.capture[1]?.peakHold ?? -60];
}

/**
 * Get stereo peak hold values for output channels.
 */
export function getStereoOutputPeaks(
  levels: LevelState
): [number, number] | undefined {
  if (levels.playback.length < 2) return undefined;
  return [levels.playback[0]?.peakHold ?? -60, levels.playback[1]?.peakHold ?? -60];
}
