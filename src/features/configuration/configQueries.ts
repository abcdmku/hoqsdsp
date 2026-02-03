import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CamillaConfig } from '../../types';
import { websocketService } from '../../services/websocketService';
import { useConnectionStore } from '../../stores/connectionStore';
import { useConfigBackupStore } from '../../stores/configBackupStore';
import { fetchConfigFromManager } from './configFetch';

export const configKeys = {
  all: ['config'] as const,
  detail: (unitId: string) => [...configKeys.all, unitId] as const,
  json: (unitId: string) => [...configKeys.all, 'json', unitId] as const,
};

export function useConfig(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );

  return useQuery({
    queryKey: configKeys.detail(unitId),
    queryFn: async (): Promise<string> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<string>('GetConfig', 'normal', { timeout: 30000 });
    },
    enabled: status === 'connected',
    staleTime: 5000,
  });
}

export function useConfigJson(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );
  const saveConfig = useConfigBackupStore((state) => state.saveConfig);

  const query = useQuery({
    queryKey: configKeys.json(unitId),
    queryFn: async (): Promise<CamillaConfig | null> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      return fetchConfigFromManager(wsManager, { timeoutMs: 30000 });
    },
    enabled: status === 'connected',
    staleTime: 5000,
  });

  useEffect(() => {
    if (query.data) {
      saveConfig(unitId, query.data);
    }
  }, [query.data, saveConfig, unitId]);

  return query;
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
