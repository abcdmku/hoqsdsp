import { create } from 'zustand';
import type { ConnectionStatus, UnitConnection } from '../types';
import { websocketService } from '../services/websocketService';

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
  connectUnit: (unitId: string, address: string, port: number) => Promise<void>;
  disconnectUnit: (unitId: string) => Promise<void>;
  setVolume: (unitId: string, volume: number) => Promise<void>;
  setMute: (unitId: string, mute: boolean) => Promise<void>;
  getVolume: (unitId: string) => Promise<number>;
  getMute: (unitId: string) => Promise<boolean>;
  getProcessingLoad: (unitId: string) => Promise<number>;
  getSignalLevels: (unitId: string) => Promise<any>;
  getBufferLevel: (unitId: string) => Promise<number>;
  getVersion: (unitId: string) => Promise<string>;
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

  connectUnit: async (unitId: string, address: string, port: number) => {
    const { setConnection, updateStatus } = get();

    // Ensure the unit exists in the store so status updates work reliably.
    setConnection(unitId, { unitId, status: 'connecting' });

    try {
      updateStatus(unitId, 'connecting');
      await websocketService.connect(unitId, address, port);

      // Get version to confirm connection
      const version = await websocketService.getVersion(unitId);
      setConnection(unitId, { version });

      // Subscribe to state changes
      websocketService.subscribeToStateChanges(unitId, (state) => {
        if (state === 'connected') {
          get().updateStatus(unitId, 'connected');
        } else if (state === 'disconnected' || state === 'error') {
          get().updateStatus(unitId, 'disconnected');
        } else if (state === 'connecting' || state === 'reconnecting') {
          get().updateStatus(unitId, 'connecting');
        }
      });

      updateStatus(unitId, 'connected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      updateStatus(unitId, 'error', errorMsg);
      throw error;
    }
  },

  disconnectUnit: async (unitId: string) => {
    websocketService.disconnect(unitId);
    get().updateStatus(unitId, 'disconnected');
  },

  setVolume: async (unitId: string, volume: number) => {
    await websocketService.setVolume(unitId, volume);
  },

  setMute: async (unitId: string, mute: boolean) => {
    await websocketService.setMute(unitId, mute);
  },

  getVolume: async (unitId: string) => {
    return websocketService.getVolume(unitId);
  },

  getMute: async (unitId: string) => {
    return websocketService.getMute(unitId);
  },

  getProcessingLoad: async (unitId: string) => {
    return websocketService.getProcessingLoad(unitId);
  },

  getSignalLevels: async (unitId: string) => {
    return websocketService.getSignalLevels(unitId);
  },

  getBufferLevel: async (unitId: string) => {
    return websocketService.getBufferLevel(unitId);
  },

  getVersion: async (unitId: string) => {
    return websocketService.getVersion(unitId);
  },
}));

// Selectors
export const selectActiveConnection = (state: ConnectionStore): UnitConnection | undefined => {
  if (!state.activeUnitId) return undefined;
  return state.connections.get(state.activeUnitId);
};

let cachedConnections: UnitConnection[] = [];
let lastConnectionsMap: Map<string, UnitConnection> | null = null;

export const selectAllConnections = (state: ConnectionStore): UnitConnection[] => {
  if (lastConnectionsMap !== state.connections) {
    cachedConnections = Array.from(state.connections.values());
    lastConnectionsMap = state.connections;
  }

  return cachedConnections;
};

export const selectConnectionStatus = (unitId: string) => (state: ConnectionStore): ConnectionStatus => {
  return state.connections.get(unitId)?.status ?? 'disconnected';
};
