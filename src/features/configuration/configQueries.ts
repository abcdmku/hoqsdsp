import { useQuery } from '@tanstack/react-query';
import type { CamillaConfig } from '../../types';
import { websocketService } from '../../services/websocketService';
import { useConnectionStore } from '../../stores/connectionStore';

export const configKeys = {
  all: ['config'] as const,
  detail: (unitId: string) => [...configKeys.all, unitId] as const,
  json: (unitId: string) => [...configKeys.all, 'json', unitId] as const,
};

export function useConfig(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );
  const wsManager = websocketService.getManager(unitId);

  return useQuery({
    queryKey: configKeys.detail(unitId),
    queryFn: async (): Promise<string> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<string>('GetConfig');
    },
    enabled: status === 'connected' && !!wsManager,
    staleTime: 5000,
  });
}

export function useConfigJson(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );
  const wsManager = websocketService.getManager(unitId);

  return useQuery({
    queryKey: configKeys.json(unitId),
    queryFn: async (): Promise<CamillaConfig> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      const jsonString = await wsManager.send<string>('GetConfigJson');
      return JSON.parse(jsonString) as CamillaConfig;
    },
    enabled: status === 'connected' && !!wsManager,
    staleTime: 5000,
  });
}

export interface ConfigStatus {
  hasConfig: boolean;
  isLoading: boolean;
  isError: boolean;
  config: CamillaConfig | null;
  dataUpdatedAt: number;
}

export function useConfigStatus(unitId: string): ConfigStatus {
  const { data, isLoading, isError, dataUpdatedAt } = useConfigJson(unitId);

  return {
    hasConfig: !!data && !isError,
    isLoading,
    isError,
    config: data ?? null,
    dataUpdatedAt,
  };
}
