import { useQuery } from '@tanstack/react-query';
import type { CamillaConfig } from '../../types';

export const configKeys = {
  all: ['config'] as const,
  detail: (unitId: string) => [...configKeys.all, unitId] as const,
  json: (unitId: string) => [...configKeys.all, 'json', unitId] as const,
};

export function useConfig(unitId: string, wsManager?: { send: <T>(cmd: string) => Promise<T> }) {
  return useQuery({
    queryKey: configKeys.detail(unitId),
    queryFn: async (): Promise<string> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      return wsManager.send<string>('GetConfig');
    },
    enabled: !!wsManager,
    staleTime: 5000,
  });
}

export function useConfigJson(unitId: string, wsManager?: { send: <T>(cmd: string) => Promise<T> }) {
  return useQuery({
    queryKey: configKeys.json(unitId),
    queryFn: async (): Promise<CamillaConfig> => {
      if (!wsManager) throw new Error('WebSocket not connected');
      const jsonString = await wsManager.send<string>('GetConfigJson');
      return JSON.parse(jsonString) as CamillaConfig;
    },
    enabled: !!wsManager,
    staleTime: 5000,
  });
}
