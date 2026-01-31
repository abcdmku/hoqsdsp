import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CamillaConfig } from '../../types';
import { websocketService } from '../../services/websocketService';
import { useConnectionStore } from '../../stores/connectionStore';
import { cleanNullValues } from '../../lib/config/cleanConfig';
import { useConfigBackupStore } from '../../stores/configBackupStore';

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
  const saveConfig = useConfigBackupStore((state) => state.saveConfig);

  const query = useQuery({
    queryKey: configKeys.json(unitId),
    queryFn: async (): Promise<CamillaConfig | null> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      const jsonString = await wsManager.send<string>('GetConfigJson');
      const rawConfig = JSON.parse(jsonString) as CamillaConfig | null;
      if (rawConfig == null) {
        return null;
      }
      // Clean null values that CamillaDSP sends for optional fields
      return cleanNullValues(rawConfig);
    },
    enabled: status === 'connected' && !!wsManager,
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
