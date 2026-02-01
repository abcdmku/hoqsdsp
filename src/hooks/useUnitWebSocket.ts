import { useEffect, useCallback, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import type { DSPUnit } from '../types';

export function useUnitWebSocket(unit: DSPUnit | undefined) {
  const connectUnit = useConnectionStore((state) => state.connectUnit);
  const disconnectUnit = useConnectionStore((state) => state.disconnectUnit);
  const connectionRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (!unit) return;

    connectionRef.current = unit.id;

    try {
      await connectUnit(unit.id, unit.address, unit.port);
    } catch (error) {
      console.error(`Failed to connect to unit ${unit.id}:`, error);
    }
  }, [unit, connectUnit]);

  const disconnect = useCallback(async () => {
    if (!unit) return;
    await disconnectUnit(unit.id);
    connectionRef.current = null;
  }, [unit, disconnectUnit]);

  useEffect(() => {
    if (unit) {
      void connect();
    }

    return () => {
      if (connectionRef.current === unit?.id) {
        void disconnect();
      }
    };
  }, [unit, connect, disconnect]);

  return { connect, disconnect };
}
