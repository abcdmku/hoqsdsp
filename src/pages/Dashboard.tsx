import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useUnitStore, selectUnits, selectZones } from '../stores/unitStore';
import { useConnectionStore, selectAllConnections } from '../stores/connectionStore';
import { Page, PageBody, PageHeader } from '../components/layout';
import { Button } from '../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/Tooltip';
import { UnitCard, type UnitCardProps } from '../components/dashboard/UnitCard';
import { AddUnitDialog } from '../components/dashboard/AddUnitDialog';
import { AutoSetupDialog } from '../components/devices/AutoSetupDialog';
import { ZoneGroup, UngroupedSection } from '../components/dashboard/ZoneGroup';
import { useConfigJson } from '../features/configuration';
import { useUnitLevels, type ChannelLevelState } from '../features/realtime';
import { useAutoSetup } from '../hooks';
import { useAutoSetupStore } from '../stores/autoSetupStore';
import { showToast } from '../components/feedback';
import type { DSPUnit, ConnectionStatus, DeviceInfo } from '../types';

interface ConnectedUnitCardProps
  extends Omit<
    UnitCardProps,
    | 'inputChannels'
    | 'outputChannels'
    | 'sampleRate'
    | 'inputLevels'
    | 'outputLevels'
    | 'inputPeaks'
    | 'outputPeaks'
    | 'clipping'
    | 'hasConfig'
    | 'onAutoSetup'
    | 'isAutoSetupRunning'
  > {
  unit: DSPUnit;
}

function ConnectedUnitCard({ unit, ...props }: ConnectedUnitCardProps) {
  const { data: config, isLoading: configLoading } = useConfigJson(unit.id);
  const isConnected = props.status === 'connected';

  const autoSetup = useAutoSetup(unit.id);
  const [autoSetupDialogOpen, setAutoSetupDialogOpen] = useState(false);

  const pendingUnitId = useAutoSetupStore((state) => state.pendingUnitId);
  const clearPendingRequest = useAutoSetupStore((state) => state.clearPendingRequest);

  const { capture, playback, clippedSamples } = useUnitLevels(isConnected ? unit.id : null, { enabled: isConnected });

  const inputLevels = useMemo<ChannelLevelState[] | undefined>(() => {
    if (!isConnected || capture.length === 0) return undefined;
    return capture;
  }, [isConnected, capture]);

  const outputLevels = useMemo<ChannelLevelState[] | undefined>(() => {
    if (!isConnected || playback.length === 0) return undefined;
    return playback;
  }, [isConnected, playback]);

  const hasConfig = configLoading ? undefined : !!config;

  const handleAutoSetupClick = useCallback(() => {
    setAutoSetupDialogOpen(true);
  }, []);

  const handleDeviceConfirm = useCallback(
    async (captureDevice: DeviceInfo, playbackDevice: DeviceInfo, backend: string) => {
      const result = await autoSetup.applyWithDevices(captureDevice, playbackDevice, backend);
      if (result.success) {
        const deviceName = captureDevice.name ?? captureDevice.device ?? 'unknown device';
        showToast.success('Auto Setup Complete', `Configured: ${deviceName}`);
      } else {
        showToast.error('Auto Setup Failed', result.error ?? 'Unknown error');
      }
    },
    [autoSetup]
  );

  useEffect(() => {
    if (pendingUnitId === unit.id && isConnected && !autoSetup.isRunning) {
      clearPendingRequest();
      setAutoSetupDialogOpen(true);
    }
  }, [pendingUnitId, unit.id, isConnected, autoSetup.isRunning, clearPendingRequest]);

  return (
    <>
      <UnitCard
        {...props}
        unit={unit}
        sampleRate={config?.devices.samplerate}
        inputChannels={config?.devices.capture.channels}
        outputChannels={config?.devices.playback.channels}
        inputLevels={inputLevels}
        outputLevels={outputLevels}
        clipping={clippedSamples > 0}
        hasConfig={hasConfig}
        onAutoSetup={handleAutoSetupClick}
        isAutoSetupRunning={autoSetup.isRunning}
      />
      <AutoSetupDialog
        open={autoSetupDialogOpen}
        onOpenChange={setAutoSetupDialogOpen}
        unitId={unit.id}
        onConfirm={handleDeviceConfirm}
      />
    </>
  );
}

type ZoneCollapsedState = Record<string, boolean>;

export function Dashboard() {
  const navigate = useNavigate();

  const units = useUnitStore(selectUnits);
  const zones = useUnitStore(selectZones);
  const connections = useConnectionStore(selectAllConnections);

  const addUnit = useUnitStore((state) => state.addUnit);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const disconnectUnit = useConnectionStore((state) => state.disconnectUnit);
  const setVolume = useConnectionStore((state) => state.setVolume);
  const setMute = useConnectionStore((state) => state.setMute);
  const connectUnit = useConnectionStore((state) => state.connectUnit);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [collapsedZones, setCollapsedZones] = useState<ZoneCollapsedState>({});
  const [unitVolumes, setUnitVolumes] = useState<Record<string, number>>({});
  const [unitMuted, setUnitMuted] = useState<Record<string, boolean>>({});
  const [unitLoads, setUnitLoads] = useState<Record<string, number>>({});
  const [unitBuffers, setUnitBuffers] = useState<Record<string, number>>({});

  const connectionsByUnitId = useMemo(() => {
    const map = new Map<string, { status: ConnectionStatus; lastSeen?: number; version?: string }>();
    for (const connection of connections) {
      map.set(connection.unitId, {
        status: connection.status,
        lastSeen: connection.lastSeen,
        version: connection.version,
      });
    }
    return map;
  }, [connections]);

  const getConnectionStatus = useCallback(
    (unitId: string): { status: ConnectionStatus; lastSeen?: number; version?: string } => {
      return connectionsByUnitId.get(unitId) ?? { status: 'disconnected' };
    },
    [connectionsByUnitId]
  );

  const { zoneGroups, ungroupedUnits } = useMemo(() => {
    const grouped: Record<string, DSPUnit[]> = {};
    const ungrouped: DSPUnit[] = [];

    for (const unit of units) {
      if (unit.zone) {
        (grouped[unit.zone] ??= []).push(unit);
      } else {
        ungrouped.push(unit);
      }
    }

    return { zoneGroups: grouped, ungroupedUnits: ungrouped };
  }, [units]);

  const getZoneOnlineCount = useCallback(
    (zoneUnits: DSPUnit[]): number => {
      return zoneUnits.filter((unit) => getConnectionStatus(unit.id).status === 'connected').length;
    },
    [getConnectionStatus]
  );

  const onlineCount = useMemo(
    () => connections.filter((c) => c.status === 'connected').length,
    [connections]
  );

  const handleAddUnit = useCallback(
    (unitData: Omit<DSPUnit, 'id'>) => {
      addUnit(unitData);
    },
    [addUnit]
  );

  const handleUnitClick = useCallback(
    (unit: DSPUnit) => {
      setActiveUnit(unit.id);
    },
    [setActiveUnit]
  );

  const handleUnitSettings = useCallback(
    (unit: DSPUnit) => {
      setActiveUnit(unit.id);
      navigate('/settings');
    },
    [setActiveUnit, navigate]
  );

  const toggleZoneCollapse = useCallback((zone: string) => {
    setCollapsedZones((prev) => ({ ...prev, [zone]: !prev[zone] }));
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setAddDialogOpen(open);
  }, []);

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      const connectedUnitIds = units
        .filter((u) => getConnectionStatus(u.id).status === 'connected')
        .map((u) => u.id);

      if (connectedUnitIds.length === 0) return;

      const nextVolumes: Record<string, number> = {};
      const nextMuted: Record<string, boolean> = {};
      const nextLoads: Record<string, number> = {};
      const nextBuffers: Record<string, number> = {};

      await Promise.all(
        connectedUnitIds.map(async (unitId) => {
          try {
            const [volume, mute, load, buffer] = await Promise.all([
              useConnectionStore.getState().getVolume(unitId),
              useConnectionStore.getState().getMute(unitId),
              useConnectionStore.getState().getProcessingLoad(unitId),
              useConnectionStore.getState().getBufferLevel(unitId),
            ]);

            nextVolumes[unitId] = volume;
            nextMuted[unitId] = mute;
            nextLoads[unitId] = load;
            nextBuffers[unitId] = buffer;
          } catch {
            // Ignore per-unit errors to keep the dashboard responsive
          }
        })
      );

      if (!alive) return;
      setUnitVolumes((prev) => ({ ...prev, ...nextVolumes }));
      setUnitMuted((prev) => ({ ...prev, ...nextMuted }));
      setUnitLoads((prev) => ({ ...prev, ...nextLoads }));
      setUnitBuffers((prev) => ({ ...prev, ...nextBuffers }));
    };

    void poll();
    const pollInterval = setInterval(() => { void poll(); }, 1000);

    return () => {
      alive = false;
      clearInterval(pollInterval);
    };
  }, [units, getConnectionStatus]);

  const handleVolumeChange = useCallback(
    (unitId: string, volume: number) => {
      setVolume(unitId, volume)
        .then(() => { setUnitVolumes((prev) => ({ ...prev, [unitId]: volume })); })
        .catch(() => {});
    },
    [setVolume]
  );

  const handleMuteToggle = useCallback(
    (unitId: string) => {
      const isMuted = unitMuted[unitId] ?? false;
      setMute(unitId, !isMuted)
        .then(() => { setUnitMuted((prev) => ({ ...prev, [unitId]: !isMuted })); })
        .catch(() => {});
    },
    [unitMuted, setMute]
  );

  const handleMuteAllInZone = useCallback(
    (zone: string) => {
      const zoneUnits = zoneGroups[zone] ?? [];
      zoneUnits.forEach((unit) => {
        setMute(unit.id, true)
          .then(() => { setUnitMuted((prev) => ({ ...prev, [unit.id]: true })); })
          .catch(() => {});
      });
    },
    [zoneGroups, setMute]
  );

  const handleRefreshAll = useCallback(async () => {
    for (const unit of units) {
      try {
        await disconnectUnit(unit.id);
        await connectUnit(unit.id, unit.address, unit.port);
      } catch {
        // Keep iterating so one bad unit doesn't block the rest
      }
    }
  }, [units, connectUnit, disconnectUnit]);

  const handleMuteAll = useCallback(() => {
    units.forEach((unit) => {
      setMute(unit.id, true)
        .then(() => { setUnitMuted((prev) => ({ ...prev, [unit.id]: true })); })
        .catch(() => {});
    });
  }, [units, setMute]);

  const renderUnitCard = useCallback(
    (unit: DSPUnit) => {
      const conn = getConnectionStatus(unit.id);
      const volume = unitVolumes[unit.id] ?? 0;
      const muted = unitMuted[unit.id] ?? false;
      const processingLoad = unitLoads[unit.id];
      const bufferLevel = unitBuffers[unit.id];

      return (
        <ConnectedUnitCard
          key={unit.id}
          unit={unit}
          status={conn.status}
          version={conn.version}
          lastSeen={conn.lastSeen}
          isSelected={activeUnitId === unit.id}
          onClick={() => { handleUnitClick(unit); }}
          onSettingsClick={() => { handleUnitSettings(unit); }}
          onVolumeChange={(vol) => { handleVolumeChange(unit.id, vol); }}
          onMuteToggle={() => { handleMuteToggle(unit.id); }}
          volume={volume}
          muted={muted}
          processingLoad={conn.status === 'connected' ? processingLoad : undefined}
          bufferLevel={conn.status === 'connected' ? bufferLevel : undefined}
        />
      );
    },
    [
      activeUnitId,
      getConnectionStatus,
      handleUnitClick,
      handleUnitSettings,
      handleVolumeChange,
      handleMuteToggle,
      unitVolumes,
      unitMuted,
      unitLoads,
      unitBuffers,
    ]
  );

  const summary = useMemo(() => {
    if (units.length === 0) return 'No units configured';
    const unitLabel = `${units.length} unit${units.length === 1 ? '' : 's'}`;
    return `${unitLabel} • ${onlineCount} online`;
  }, [units.length, onlineCount]);

  return (
    <Page>
      <PageHeader
        title="System Overview"
        description={summary}
        actions={
          <>
            <Tooltip>
              <TooltipTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:bg-dsp-primary/35 hover:border-dsp-primary/60 transition-colors"
                onClick={handleRefreshAll}
                aria-label="Reconnect all units"
              >
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Reconnect all</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:bg-dsp-primary/35 hover:border-dsp-primary/60 transition-colors"
                onClick={handleMuteAll}
                aria-label="Mute all units"
              >
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Mute all</TooltipContent>
            </Tooltip>

            <Button onClick={() => { setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Unit
            </Button>
          </>
        }
      />

      <PageBody>
        {units.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-dsp-primary/60 bg-dsp-surface/30 py-16">
            <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
              <Volume2 className="h-8 w-8 text-dsp-text-muted" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-dsp-text">No units configured</h3>
            <p className="mb-6 max-w-md text-center text-sm text-dsp-text-muted">
              Add your first DSP unit to start monitoring levels, performance, and routing.
            </p>
            <Button onClick={() => { setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Unit
            </Button>
          </div>
        )}

        {zones.map((zone) => {
          const zoneUnits = zoneGroups[zone] ?? [];
          if (zoneUnits.length === 0) return null;

          return (
            <ZoneGroup
              key={zone}
              name={zone}
              unitCount={zoneUnits.length}
              onlineCount={getZoneOnlineCount(zoneUnits)}
              collapsed={collapsedZones[zone] ?? false}
              onToggleCollapse={() => { toggleZoneCollapse(zone); }}
              onMuteAll={() => { handleMuteAllInZone(zone); }}
            >
              {zoneUnits.map(renderUnitCard)}
            </ZoneGroup>
          );
        })}

        {ungroupedUnits.length > 0 && <UngroupedSection>{ungroupedUnits.map(renderUnitCard)}</UngroupedSection>}

        <AddUnitDialog
          open={addDialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={handleAddUnit}
          existingZones={zones}
        />
      </PageBody>
    </Page>
  );
}

