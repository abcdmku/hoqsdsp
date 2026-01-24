import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys } from './configQueries';
import type { CamillaConfig } from '../../types';

interface SetConfigOptions {
  unitId: string;
  wsManager: { send: <T>(cmd: unknown) => Promise<T> };
}

export function useSetConfig({ unitId, wsManager }: SetConfigOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: string): Promise<void> => {
      await wsManager.send({ SetConfig: config });
    },
    onSuccess: () => {
      // Invalidate config queries to refetch
      void queryClient.invalidateQueries({ queryKey: configKeys.detail(unitId) });
    },
  });
}

export function useSetConfigJson({ unitId, wsManager }: SetConfigOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CamillaConfig): Promise<void> => {
      const jsonString = JSON.stringify(config);
      await wsManager.send({ SetConfigJson: jsonString });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.json(unitId) });
      void queryClient.invalidateQueries({ queryKey: configKeys.detail(unitId) });
    },
  });
}
