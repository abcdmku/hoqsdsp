import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageBody, PageHeader } from '../components/layout';
import { AddUnitDialog } from '../components/dashboard/AddUnitDialog';
import { ZoneGroup, UngroupedSection } from '../components/dashboard/ZoneGroup';
import { useConnectionStore } from '../stores/connectionStore';
import { selectUnits, selectZones, useUnitStore } from '../stores/unitStore';
import type { DSPUnit } from '../types';
import { ConnectedUnitCard } from './dashboard/ConnectedUnitCard';
import { DashboardHeaderActions } from './dashboard/DashboardHeaderActions';
import { EmptyDashboardState } from './dashboard/EmptyDashboardState';
import { useConnectionStatusMap } from './dashboard/useConnectionStatusMap';
import { useUnitMetrics } from './dashboard/useUnitMetrics';
import { useZoneGroups } from './dashboard/useZoneGroups';

type ZoneCollapsedState = Record<string, boolean>;

export function Dashboard() {
  const navigate = useNavigate();
  const units = useUnitStore(selectUnits);
  const zones = useUnitStore(selectZones);

  const addUnit = useUnitStore((state) => state.addUnit);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const disconnectUnit = useConnectionStore((state) => state.disconnectUnit);
  const setVolume = useConnectionStore((state) => state.setVolume);
  const setMute = useConnectionStore((state) => state.setMute);
  const connectUnit = useConnectionStore((state) => state.connectUnit);

  const { getConnectionStatus, onlineCount } = useConnectionStatusMap();
  const { zoneGroups, ungroupedUnits } = useZoneGroups(units);
  const {
    unitVolumes,
    unitMuted,
    unitLoads,
    unitBuffers,
    handleVolumeChange,
    handleMuteToggle,
    muteUnits,
  } = useUnitMetrics({ units, getConnectionStatus, setVolume, setMute });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [collapsedZones, setCollapsedZones] = useState<ZoneCollapsedState>({});

  const handleAddUnit = useCallback(
    (unitData: Omit<DSPUnit, 'id'>) => {
      addUnit(unitData);
    },
    [addUnit],
  );

  const handleUnitClick = useCallback(
    (unit: DSPUnit) => {
      setActiveUnit(unit.id);
    },
    [setActiveUnit],
  );

  const handleUnitSettings = useCallback(
    (unit: DSPUnit) => {
      setActiveUnit(unit.id);
      navigate('/settings');
    },
    [setActiveUnit, navigate],
  );

  const toggleZoneCollapse = useCallback((zone: string) => {
    setCollapsedZones((prev) => ({ ...prev, [zone]: !prev[zone] }));
  }, []);

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
    muteUnits(units.map((unit) => unit.id), true);
  }, [muteUnits, units]);

  const handleMuteAllInZone = useCallback(
    (zone: string) => {
      const zoneUnits = zoneGroups[zone] ?? [];
      muteUnits(zoneUnits.map((unit) => unit.id), true);
    },
    [muteUnits, zoneGroups],
  );

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
    ],
  );

  const summary = useMemo(() => {
    if (units.length === 0) return 'No units configured';
    const unitLabel = `${units.length} unit${units.length === 1 ? '' : 's'}`;
    return `${unitLabel} - ${onlineCount} online`;
  }, [units.length, onlineCount]);

  return (
    <Page>
      <PageHeader
        title="System Overview"
        description={summary}
        actions={(
          <DashboardHeaderActions
            onRefreshAll={handleRefreshAll}
            onMuteAll={handleMuteAll}
            onAddUnit={() => { setAddDialogOpen(true); }}
          />
        )}
      />

      <PageBody>
        {units.length === 0 && (
          <EmptyDashboardState onAddUnit={() => { setAddDialogOpen(true); }} />
        )}

        {zones.map((zone) => {
          const zoneUnits = zoneGroups[zone] ?? [];
          if (zoneUnits.length === 0) return null;

          return (
            <ZoneGroup
              key={zone}
              name={zone}
              unitCount={zoneUnits.length}
              onlineCount={zoneUnits.filter((unit) => getConnectionStatus(unit.id).status === 'connected').length}
              collapsed={collapsedZones[zone] ?? false}
              onToggleCollapse={() => { toggleZoneCollapse(zone); }}
              onMuteAll={() => { handleMuteAllInZone(zone); }}
            >
              {zoneUnits.map(renderUnitCard)}
            </ZoneGroup>
          );
        })}

        {ungroupedUnits.length > 0 && (
          <UngroupedSection>
            {ungroupedUnits.map(renderUnitCard)}
          </UngroupedSection>
        )}

        <AddUnitDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddUnit}
          existingZones={zones}
        />
      </PageBody>
    </Page>
  );
}
