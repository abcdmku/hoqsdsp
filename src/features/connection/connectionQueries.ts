import { useQuery } from '@tanstack/react-query';
import type { ProcessingState } from '../../types';

// Query keys factory
export const connectionKeys = {
  all: ['connection'] as const,
  version: (unitId: string) => [...connectionKeys.all, 'version', unitId] as const,
  state: (unitId: string) => [...connectionKeys.all, 'state', unitId] as const,
};

// These hooks will be connected to WebSocketManager in later integration
// For now, they define the query structure

export function useVersion(unitId: string, wsManager?: { send: <T>(cmd: string) => Promise<T> }) {
  return useQuery({
    queryKey: connectionKeys.version(unitId),
    queryFn: async (): Promise<string> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<string>('GetVersion');
    },
    enabled: !!wsManager,
    staleTime: Infinity, // Version doesn't change
  });
}

export function useProcessingState(unitId: string, wsManager?: { send: <T>(cmd: string) => Promise<T> }) {
  return useQuery({
    queryKey: connectionKeys.state(unitId),
    queryFn: async (): Promise<ProcessingState> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<ProcessingState>('GetState');
    },
    enabled: !!wsManager,
    refetchInterval: 1000, // Poll every second
  });
}
