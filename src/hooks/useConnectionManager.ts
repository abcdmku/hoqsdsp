import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';

/**
 * Manages WebSocket connections at the app level.
 * This hook should be called once in the App component to maintain
 * connections across route changes.
 *
 * Behavior:
 * - Automatically connects to ALL units on app startup
 * - Auto-sets the first unit as active if none is selected
 * - Maintains connection when navigating between routes
 * - Only disconnects when explicitly requested or when unit is removed
 */
export function useConnectionManager() {
  const units = useUnitStore((state) => state.units);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const connectUnit = useConnectionStore((state) => state.connectUnit);
  const connections = useConnectionStore((state) => state.connections);

  // Track which units we've attempted to connect
  const connectedUnitsRef = useRef<Set<string>>(new Set());
  // Track if initial auto-connect has run
  const initialConnectDone = useRef(false);

  // Auto-connect ALL units on app startup
  useEffect(() => {
    if (initialConnectDone.current || units.length === 0) return;
    initialConnectDone.current = true;

    // Connect all units in parallel
    units.forEach((unit) => {
      const connection = connections.get(unit.id);
      const isConnected = connection?.status === 'connected';
      const isConnecting = connection?.status === 'connecting';

      if (!isConnected && !isConnecting && !connectedUnitsRef.current.has(unit.id)) {
        connectedUnitsRef.current.add(unit.id);
        connectUnit(unit.id, unit.address, unit.port).catch((error) => {
          console.error(`Failed to connect to unit ${unit.id}:`, error);
          connectedUnitsRef.current.delete(unit.id);
        });
      }
    });

    // Auto-set active unit if none selected
    const firstUnit = units[0];
    if (!activeUnitId && firstUnit) {
      setActiveUnit(firstUnit.id);
    }
  }, [units, activeUnitId, connections, connectUnit, setActiveUnit]);

  // Connect newly added units
  useEffect(() => {
    if (!initialConnectDone.current) return;

    units.forEach((unit) => {
      const connection = connections.get(unit.id);
      const isConnected = connection?.status === 'connected';
      const isConnecting = connection?.status === 'connecting';

      if (!isConnected && !isConnecting && !connectedUnitsRef.current.has(unit.id)) {
        connectedUnitsRef.current.add(unit.id);
        connectUnit(unit.id, unit.address, unit.port).catch((error) => {
          console.error(`Failed to connect to unit ${unit.id}:`, error);
          connectedUnitsRef.current.delete(unit.id);
        });
      }
    });
  }, [units, connections, connectUnit]);

  // Clean up tracking when units are removed
  useEffect(() => {
    const currentUnitIds = new Set(units.map((u) => u.id));
    connectedUnitsRef.current.forEach((id) => {
      if (!currentUnitIds.has(id)) {
        connectedUnitsRef.current.delete(id);
      }
    });
  }, [units]);
}
