import { useCallback, useMemo } from 'react';
import { useConnectionStore, selectAllConnections } from '../../../stores/connectionStore';
import { useSignalFlowUiStore } from '../../../stores/signalFlowUiStore';
import { useUnitStore } from '../../../stores/unitStore';

export function useSignalFlowUnits() {
  const allConnections = useConnectionStore(selectAllConnections);
  const connectedUnits = useMemo(
    () => allConnections.filter((conn) => conn.status === 'connected'),
    [allConnections],
  );

  const selectedUnitIds = useSignalFlowUiStore((state) => state.selectedUnitIds);
  const setSelectedUnitIds = useSignalFlowUiStore((state) => state.setSelectedUnitIds);
  const toggleSelectedUnit = useSignalFlowUiStore((state) => state.toggleSelectedUnit);

  const effectiveSelectedIds = useMemo(() => {
    if (selectedUnitIds.length === 0) {
      return connectedUnits.map((u) => u.unitId);
    }
    const connectedIds = new Set(connectedUnits.map((u) => u.unitId));
    return selectedUnitIds.filter((id) => connectedIds.has(id));
  }, [selectedUnitIds, connectedUnits]);

  const activeUnitId = effectiveSelectedIds[0] ?? null;
  const unitId = activeUnitId ?? '__no-unit__';

  const getUnit = useUnitStore((state) => state.getUnit);
  const getUnitName = useCallback((id: string): string => {
    const unit = getUnit(id);
    return unit?.name ?? id;
  }, [getUnit]);

  return {
    activeUnitId,
    connectedUnits,
    effectiveSelectedIds,
    getUnitName,
    selectedUnitIds,
    setSelectedUnitIds,
    toggleSelectedUnit,
    unitId,
  };
}
