import { useCallback, useMemo } from 'react';
import { selectAllConnections, useConnectionStore } from '../../stores/connectionStore';
import type { ConnectionStatus } from '../../types';

export interface ConnectionStatusInfo {
  status: ConnectionStatus;
  lastSeen?: number;
  version?: string;
}

export function useConnectionStatusMap() {
  const connections = useConnectionStore(selectAllConnections);

  const connectionsByUnitId = useMemo(() => {
    const map = new Map<string, ConnectionStatusInfo>();
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
    (unitId: string): ConnectionStatusInfo => {
      return connectionsByUnitId.get(unitId) ?? { status: 'disconnected' };
    },
    [connectionsByUnitId],
  );

  const onlineCount = useMemo(
    () => connections.filter((c) => c.status === 'connected').length,
    [connections],
  );

  return { connections, getConnectionStatus, onlineCount };
}
