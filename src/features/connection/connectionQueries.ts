import { useQuery } from '@tanstack/react-query';
import type { ProcessingState } from '../../types';
import { websocketService } from '../../services/websocketService';
import { useConnectionStore } from '../../stores/connectionStore';

// Query keys factory
export const connectionKeys = {
  all: ['connection'] as const,
  version: (unitId: string) => [...connectionKeys.all, 'version', unitId] as const,
  state: (unitId: string) => [...connectionKeys.all, 'state', unitId] as const,
};

export function useVersion(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );
  const wsManager = websocketService.getManager(unitId);

  return useQuery({
    queryKey: connectionKeys.version(unitId),
    queryFn: async (): Promise<string> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<string>('GetVersion');
    },
    enabled: status === 'connected' && !!wsManager,
    staleTime: Infinity, // Version doesn't change
  });
}

export function useProcessingState(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );
  const wsManager = websocketService.getManager(unitId);

  return useQuery({
    queryKey: connectionKeys.state(unitId),
    queryFn: async (): Promise<ProcessingState> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<ProcessingState>('GetState');
    },
    enabled: status === 'connected' && !!wsManager,
    refetchInterval: 1000, // Poll every second
  });
}
