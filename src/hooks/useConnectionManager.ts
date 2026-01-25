import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';

/**
 * Manages WebSocket connections at the app level.
 * This hook should be called once in the App component to maintain
 * connections across route changes.
 *
 * Behavior:
 * - Automatically connects to the active unit when selected
 * - Maintains connection when navigating between routes
 * - Only disconnects when explicitly requested or when unit is removed
 */
export function useConnectionManager() {
  const units = useUnitStore((state) => state.units);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const connectUnit = useConnectionStore((state) => state.connectUnit);
  const connections = useConnectionStore((state) => state.connections);

  // Track which units we've attempted to connect
  const connectedUnitsRef = useRef<Set<string>>(new Set());

  // Auto-connect to active unit when it changes
  useEffect(() => {
    if (!activeUnitId) return;

    const unit = units.find((u) => u.id === activeUnitId);
    if (!unit) return;

    const connection = connections.get(activeUnitId);
    const isConnected = connection?.status === 'connected';
    const isConnecting = connection?.status === 'connecting';

    // Only connect if not already connected or connecting
    if (!isConnected && !isConnecting && !connectedUnitsRef.current.has(activeUnitId)) {
      connectedUnitsRef.current.add(activeUnitId);
      connectUnit(activeUnitId, unit.address, unit.port).catch((error) => {
        console.error(`Failed to connect to unit ${activeUnitId}:`, error);
        connectedUnitsRef.current.delete(activeUnitId);
      });
    }
  }, [activeUnitId, units, connections, connectUnit]);

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
