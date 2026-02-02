import { useCallback, useEffect, useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { usePageVisibility } from '../../hooks';
import type { ConnectionStatus, DSPUnit } from '../../types';

interface UseUnitMetricsParams {
  units: DSPUnit[];
  getConnectionStatus: (unitId: string) => { status: ConnectionStatus };
  setVolume: (unitId: string, volume: number) => Promise<void>;
  setMute: (unitId: string, muted: boolean) => Promise<void>;
}

export function useUnitMetrics({
  units,
  getConnectionStatus,
  setVolume,
  setMute,
}: UseUnitMetricsParams) {
  const [unitVolumes, setUnitVolumes] = useState<Record<string, number>>({});
  const [unitMuted, setUnitMuted] = useState<Record<string, boolean>>({});
  const [unitLoads, setUnitLoads] = useState<Record<string, number>>({});
  const [unitBuffers, setUnitBuffers] = useState<Record<string, number>>({});
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (!isPageVisible) {
      return;
    }

    let alive = true;
    let pollInFlight = false;

    const poll = async () => {
      if (pollInFlight) return;
      pollInFlight = true;

      const connectedUnitIds = units
        .filter((u) => getConnectionStatus(u.id).status === 'connected')
        .map((u) => u.id);

      if (connectedUnitIds.length === 0) {
        pollInFlight = false;
        return;
      }

      const nextVolumes: Record<string, number> = {};
      const nextMuted: Record<string, boolean> = {};
      const nextLoads: Record<string, number> = {};
      const nextBuffers: Record<string, number> = {};

      try {
        await Promise.all(
          connectedUnitIds.map(async (unitId) => {
            // Check alive before each unit fetch to avoid unnecessary work on unmount
            if (!alive) return;
            try {
              const [volume, mute, load, buffer] = await Promise.all([
                useConnectionStore.getState().getVolume(unitId),
                useConnectionStore.getState().getMute(unitId),
                useConnectionStore.getState().getProcessingLoad(unitId),
                useConnectionStore.getState().getBufferLevel(unitId),
              ]);

              // Check alive again after async operations complete
              if (!alive) return;

              nextVolumes[unitId] = volume;
              nextMuted[unitId] = mute;
              nextLoads[unitId] = load;
              nextBuffers[unitId] = buffer;
            } catch {
              // Ignore per-unit errors to keep the dashboard responsive
            }
          }),
        );

        if (!alive) return;
        // Replace state completely instead of merging to prevent orphaned keys from disconnected units
        setUnitVolumes(nextVolumes);
        setUnitMuted(nextMuted);
        setUnitLoads(nextLoads);
        setUnitBuffers(nextBuffers);
      } finally {
        pollInFlight = false;
      }
    };

    void poll();
    const pollInterval = setInterval(() => { void poll(); }, 1000);

    return () => {
      alive = false;
      pollInFlight = false;
      clearInterval(pollInterval);
    };
  }, [units, getConnectionStatus, isPageVisible]);

  const handleVolumeChange = useCallback(
    (unitId: string, volume: number) => {
      setVolume(unitId, volume)
        .then(() => { setUnitVolumes((prev) => ({ ...prev, [unitId]: volume })); })
        .catch(() => {});
    },
    [setVolume],
  );

  const setUnitMutedValue = useCallback((unitId: string, muted: boolean) => {
    setUnitMuted((prev) => ({ ...prev, [unitId]: muted }));
  }, []);

  const muteUnits = useCallback(
    (unitIds: string[], muted: boolean) => {
      unitIds.forEach((unitId) => {
        setMute(unitId, muted)
          .then(() => { setUnitMutedValue(unitId, muted); })
          .catch(() => {});
      });
    },
    [setMute, setUnitMutedValue],
  );

  const handleMuteToggle = useCallback(
    (unitId: string) => {
      const isMuted = unitMuted[unitId] ?? false;
      muteUnits([unitId], !isMuted);
    },
    [muteUnits, unitMuted],
  );

  return {
    unitVolumes,
    unitMuted,
    unitLoads,
    unitBuffers,
    handleVolumeChange,
    handleMuteToggle,
    muteUnits,
  };
}
