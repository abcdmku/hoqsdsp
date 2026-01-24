import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useUnitStore, selectUnits, selectZones } from '../stores/unitStore';
import { useConnectionStore, selectAllConnections } from '../stores/connectionStore';
import { Button } from '../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/Tooltip';
import { UnitCard } from '../components/dashboard/UnitCard';
import { AddUnitDialog } from '../components/dashboard/AddUnitDialog';
import { ZoneGroup, UngroupedSection } from '../components/dashboard/ZoneGroup';
import { useUnitWebSocket } from '../hooks/useUnitWebSocket';
import type { DSPUnit, ConnectionStatus } from '../types';

type ZoneCollapsedState = Record<string, boolean>;

/**
 * Network Dashboard page displaying all configured CamillaDSP units.
 * Units are grouped by zone and show real-time status and metrics.
 */
export function Dashboard() {
  const units = useUnitStore(selectUnits);
  const zones = useUnitStore(selectZones);
  const connections = useConnectionStore(selectAllConnections);
  const addUnit = useUnitStore((state) => state.addUnit);
  const updateUnit = useUnitStore((state) => state.updateUnit);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const disconnectUnit = useConnectionStore((state) => state.disconnectUnit);
  const setVolume = useConnectionStore((state) => state.setVolume);
  const setMute = useConnectionStore((state) => state.setMute);
  const connectUnit = useConnectionStore((state) => state.connectUnit);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DSPUnit | undefined>(undefined);
  const [collapsedZones, setCollapsedZones] = useState<ZoneCollapsedState>({});
  const [unitVolumes, setUnitVolumes] = useState<Record<string, number>>({});
  const [unitMuted, setUnitMuted] = useState<Record<string, boolean>>({});
  const [unitLoads, setUnitLoads] = useState<Record<string, number>>({});
  const [unitBuffers, setUnitBuffers] = useState<Record<string, number>>({});

  // Get active unit
  const activeUnit = units.find((u) => u.id === activeUnitId);

  // Connect to active unit
  useUnitWebSocket(activeUnit);

  // Get connection status for a unit
  const getConnectionStatus = useCallback(
    (unitId: string): { status: ConnectionStatus; lastSeen?: number; version?: string } => {
      const connection = connections.find((c) => c.unitId === unitId);
      return {
        status: connection?.status ?? 'disconnected',
        lastSeen: connection?.lastSeen,
        version: connection?.version,
      };
    },
    [connections]
  );

  // Group units by zone
  const { zoneGroups, ungroupedUnits } = useMemo(() => {
    const grouped: Record<string, DSPUnit[]> = {};
    const ungrouped: DSPUnit[] = [];

    for (const unit of units) {
      if (unit.zone) {
        const arr = (grouped[unit.zone] ??= []);
        arr.push(unit);
      } else {
        ungrouped.push(unit);
      }
    }

    return {
      zoneGroups: grouped,
      ungroupedUnits: ungrouped,
    };
  }, [units]);

  // Count online units per zone
  const getZoneOnlineCount = useCallback(
    (zoneUnits: DSPUnit[]): number => {
      return zoneUnits.filter((unit) => {
        const conn = getConnectionStatus(unit.id);
        return conn.status === 'connected';
      }).length;
    },
    [getConnectionStatus]
  );

  // Handle adding a new unit
  const handleAddUnit = useCallback(
    (unitData: Omit<DSPUnit, 'id'>) => {
      if (editingUnit) {
        updateUnit(editingUnit.id, unitData);
        setEditingUnit(undefined);
      } else {
        addUnit(unitData);
      }
    },
    [addUnit, updateUnit, editingUnit]
  );

  // Handle clicking on a unit card
  const handleUnitClick = useCallback(
    (unit: DSPUnit) => {
      setActiveUnit(unit.id);
    },
    [setActiveUnit]
  );

  // Handle settings click on a unit
  const handleUnitSettings = useCallback(
    (unit: DSPUnit) => {
      setEditingUnit(unit);
      setAddDialogOpen(true);
    },
    []
  );

  // Toggle zone collapse state
  const toggleZoneCollapse = useCallback((zone: string) => {
    setCollapsedZones((prev) => ({
      ...prev,
      [zone]: !prev[zone],
    }));
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditingUnit(undefined);
    }
  }, []);

  // Poll for real-time data from connected unit
  useEffect(() => {
    if (!activeUnitId) return;

    const pollInterval = setInterval(async () => {
      try {
        const volume = await useConnectionStore.getState().getVolume(activeUnitId);
        const mute = await useConnectionStore.getState().getMute(activeUnitId);
        const load = await useConnectionStore.getState().getProcessingLoad(activeUnitId);
        const buffer = await useConnectionStore.getState().getBufferLevel(activeUnitId);

        setUnitVolumes((prev) => ({ ...prev, [activeUnitId]: volume }));
        setUnitMuted((prev) => ({ ...prev, [activeUnitId]: mute }));
        setUnitLoads((prev) => ({ ...prev, [activeUnitId]: load }));
        setUnitBuffers((prev) => ({ ...prev, [activeUnitId]: buffer }));
      } catch (error) {
        console.error('Failed to poll unit data:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [activeUnitId]);

  const handleVolumeChange = useCallback(
    (unitId: string, volume: number) => {
      setVolume(unitId, volume)
        .then(() => {
          setUnitVolumes((prev) => ({ ...prev, [unitId]: volume }));
        })
        .catch((error) => {
          console.error('Failed to set volume:', error);
        });
    },
    [setVolume]
  );

  const handleMuteToggle = useCallback(
    (unitId: string) => {
      const isMuted = unitMuted[unitId] ?? false;
      setMute(unitId, !isMuted)
        .then(() => {
          setUnitMuted((prev) => ({ ...prev, [unitId]: !isMuted }));
        })
        .catch((error) => {
          console.error('Failed to toggle mute:', error);
        });
    },
    [unitMuted, setMute]
  );

  const handleMuteAllInZone = useCallback(
    (zone: string) => {
      const zoneUnits = zoneGroups[zone] ?? [];
      zoneUnits.forEach((unit) => {
        setMute(unit.id, true)
          .then(() => {
            setUnitMuted((prev) => ({ ...prev, [unit.id]: true }));
          })
          .catch((error) => {
            console.error(`Failed to mute unit ${unit.id}:`, error);
          });
      });
    },
    [zoneGroups, setMute]
  );

  const handleRefreshAll = useCallback(async () => {
    // Reconnect all units
    for (const unit of units) {
      try {
        await disconnectUnit(unit.id);
        await connectUnit(unit.id, unit.address, unit.port);
      } catch (error) {
        console.error(`Failed to reconnect unit ${unit.id}:`, error);
      }
    }
  }, [units, connectUnit, disconnectUnit]);

  const handleMuteAll = useCallback(() => {
    units.forEach((unit) => {
      setMute(unit.id, true)
        .then(() => {
          setUnitMuted((prev) => ({ ...prev, [unit.id]: true }));
        })
        .catch((error) => {
          console.error(`Failed to mute unit ${unit.id}:`, error);
        });
    });
  }, [units, setMute]);

  // Render a single unit card
  const renderUnitCard = useCallback(
    (unit: DSPUnit) => {
      const conn = getConnectionStatus(unit.id);
      const volume = unitVolumes[unit.id] ?? 0;
      const muted = unitMuted[unit.id] ?? false;
      const processingLoad = unitLoads[unit.id];
      const bufferLevel = unitBuffers[unit.id];

      return (
        <UnitCard
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
          sampleRate={48000}
          inputChannels={2}
          outputChannels={2}
          processingLoad={conn.status === 'connected' ? processingLoad : undefined}
          bufferLevel={conn.status === 'connected' ? bufferLevel : undefined}
          inputLevels={conn.status === 'connected' ? [-18, -20] : undefined}
          outputLevels={conn.status === 'connected' ? [-12, -14] : undefined}
        />
      );
    },
    [activeUnitId, getConnectionStatus, handleUnitClick, handleUnitSettings, handleVolumeChange, handleMuteToggle, unitVolumes, unitMuted, unitLoads, unitBuffers]
  );

  const onlineCount = useMemo(
    () => connections.filter((c) => c.status === 'connected').length,
    [connections]
  );

  return (
    <div className="h-full overflow-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dsp-text">Network Dashboard</h1>
            <p className="text-sm text-dsp-text-muted">
              {units.length} unit{units.length !== 1 ? 's' : ''} configured
              {units.length > 0 && ` (${String(onlineCount)} online)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-dsp-primary/50"
                onClick={handleRefreshAll}
                aria-label="Refresh all units"
              >
                <RefreshCw className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent>Refresh all</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-dsp-primary/50"
                onClick={handleMuteAll}
                aria-label="Mute all units"
              >
                <VolumeX className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent>Mute all</TooltipContent>
            </Tooltip>

            <Button onClick={() => { setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {units.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-dsp-primary/50 py-16">
            <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
              <Volume2 className="h-8 w-8 text-dsp-text-muted" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-dsp-text">
              No units configured
            </h3>
            <p className="mb-4 text-center text-sm text-dsp-text-muted">
              Add your first CamillaDSP unit to start monitoring and controlling.
            </p>
            <Button onClick={() => { setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
        )}

        {/* Zone groups */}
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

        {/* Ungrouped units */}
        {ungroupedUnits.length > 0 && (
          <UngroupedSection>
            {ungroupedUnits.map(renderUnitCard)}
          </UngroupedSection>
        )}

        {/* Add/Edit unit dialog */}
        <AddUnitDialog
          open={addDialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={handleAddUnit}
          existingZones={zones}
          editingUnit={editingUnit}
        />
      </div>
  );
}
