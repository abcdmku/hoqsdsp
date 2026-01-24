import { useState, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useUnitStore, selectUnits, selectZones } from '../stores/unitStore';
import { useConnectionStore, selectAllConnections } from '../stores/connectionStore';
import { Button } from '../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../components/ui/Tooltip';
import { UnitCard } from '../components/dashboard/UnitCard';
import { AddUnitDialog } from '../components/dashboard/AddUnitDialog';
import { ZoneGroup, UngroupedSection } from '../components/dashboard/ZoneGroup';
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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DSPUnit | undefined>(undefined);
  const [collapsedZones, setCollapsedZones] = useState<ZoneCollapsedState>({});

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

  // Placeholder handlers for volume/mute (will be connected to WebSocket in later steps)
  const handleVolumeChange = useCallback((_unitId: string, _volume: number) => {
    // TODO: Send volume change via WebSocket
    console.log('Volume change:', _unitId, _volume);
  }, []);

  const handleMuteToggle = useCallback((_unitId: string) => {
    // TODO: Send mute toggle via WebSocket
    console.log('Mute toggle:', _unitId);
  }, []);

  const handleMuteAllInZone = useCallback((_zone: string) => {
    // TODO: Implement batch mute for zone
    console.log('Mute all in zone:', _zone);
  }, []);

  const handleRefreshAll = useCallback(() => {
    // TODO: Trigger reconnection/refresh for all units
    console.log('Refresh all units');
  }, []);

  const handleMuteAll = useCallback(() => {
    // TODO: Mute all units
    console.log('Mute all units');
  }, []);

  // Render a single unit card
  const renderUnitCard = useCallback(
    (unit: DSPUnit) => {
      const conn = getConnectionStatus(unit.id);
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
          // Mock data for now - will be replaced with real data from WebSocket
          volume={-12}
          muted={false}
          sampleRate={48000}
          inputChannels={2}
          outputChannels={2}
          processingLoad={conn.status === 'connected' ? 15.5 : undefined}
          bufferLevel={conn.status === 'connected' ? 75 : undefined}
          inputLevels={conn.status === 'connected' ? [-18, -20] : undefined}
          outputLevels={conn.status === 'connected' ? [-12, -14] : undefined}
        />
      );
    },
    [activeUnitId, getConnectionStatus, handleUnitClick, handleUnitSettings, handleVolumeChange, handleMuteToggle]
  );

  const onlineCount = useMemo(
    () => connections.filter((c) => c.status === 'connected').length,
    [connections]
  );

  return (
    <TooltipProvider>
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
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshAll}
                  aria-label="Refresh all units"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh all</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMuteAll}
                  aria-label="Mute all units"
                >
                  <VolumeX className="h-5 w-5" />
                </Button>
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
    </TooltipProvider>
  );
}
