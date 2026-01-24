import { create } from 'zustand';
import type { ConnectionStatus, UnitConnection } from '../types';

interface ConnectionState {
  connections: Map<string, UnitConnection>;
  activeUnitId: string | null;
}

interface ConnectionActions {
  setConnection: (unitId: string, connection: Partial<UnitConnection>) => void;
  removeConnection: (unitId: string) => void;
  setActiveUnit: (unitId: string | null) => void;
  getConnection: (unitId: string) => UnitConnection | undefined;
  updateStatus: (unitId: string, status: ConnectionStatus, error?: string) => void;
}

type ConnectionStore = ConnectionState & ConnectionActions;

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: new Map(),
  activeUnitId: null,

  setConnection: (unitId, connection) => {
    set((state) => {
      const connections = new Map(state.connections);
      const existing = connections.get(unitId);
      connections.set(unitId, {
        unitId,
        status: 'disconnected',
        ...existing,
        ...connection,
      });
      return { connections };
    });
  },

  removeConnection: (unitId) => {
    set((state) => {
      const connections = new Map(state.connections);
      connections.delete(unitId);
      return {
        connections,
        activeUnitId: state.activeUnitId === unitId ? null : state.activeUnitId,
      };
    });
  },

  setActiveUnit: (unitId) => {
    set({ activeUnitId: unitId });
  },

  getConnection: (unitId) => {
    return get().connections.get(unitId);
  },

  updateStatus: (unitId, status, error) => {
    set((state) => {
      const connections = new Map(state.connections);
      const existing = connections.get(unitId);
      if (existing) {
        connections.set(unitId, {
          ...existing,
          status,
          error,
          lastSeen: status === 'connected' ? Date.now() : existing.lastSeen,
        });
      }
      return { connections };
    });
  },
}));

// Selectors
export const selectActiveConnection = (state: ConnectionStore): UnitConnection | undefined => {
  if (!state.activeUnitId) return undefined;
  return state.connections.get(state.activeUnitId);
};

export const selectAllConnections = (state: ConnectionStore): UnitConnection[] => {
  return Array.from(state.connections.values());
};

export const selectConnectionStatus = (unitId: string) => (state: ConnectionStore): ConnectionStatus => {
  return state.connections.get(unitId)?.status ?? 'disconnected';
};
