import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores';
import type { ConnectionStatus } from '../types';
import { useAnnounce } from './useAnnounce';

/**
 * Messages for each connection status
 */
const statusMessages: Record<ConnectionStatus, string> = {
  connected: 'Connected to CamillaDSP',
  connecting: 'Connecting to CamillaDSP',
  disconnected: 'Disconnected from CamillaDSP',
  error: 'Connection error occurred',
};

/**
 * Hook that announces connection status changes to screen readers.
 * Should be used once at the app level.
 */
export function useConnectionAnnouncements(): void {
  const announce = useAnnounce();
  const connections = useConnectionStore((state) => state.connections);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

  // Track previous statuses to detect changes
  const prevStatusesRef = useRef<Map<string, ConnectionStatus>>(new Map());

  useEffect(() => {
    // Check for status changes in all connections
    connections.forEach((connection, unitId) => {
      const prevStatus = prevStatusesRef.current.get(unitId);
      const currentStatus = connection.status;

      // If status changed, announce it
      if (prevStatus !== undefined && prevStatus !== currentStatus) {
        const unitName = unitId; // Could be enhanced to use actual unit name
        const isActive = unitId === activeUnitId;

        // Use assertive for errors and active unit changes, polite for others
        const priority = currentStatus === 'error' || isActive ? 'assertive' : 'polite';

        if (currentStatus === 'error' && connection.error) {
          announce(`${unitName}: ${statusMessages[currentStatus]}. ${connection.error}`, priority);
        } else {
          announce(`${unitName}: ${statusMessages[currentStatus]}`, priority);
        }
      }

      // Update tracked status
      prevStatusesRef.current.set(unitId, currentStatus);
    });

    // Clean up removed connections from tracking
    prevStatusesRef.current.forEach((_, unitId) => {
      if (!connections.has(unitId)) {
        prevStatusesRef.current.delete(unitId);
      }
    });
  }, [connections, activeUnitId, announce]);
}
