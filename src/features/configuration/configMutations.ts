import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys } from './configQueries';
import type { CamillaConfig } from '../../types';
import { websocketService } from '../../services/websocketService';
import { cleanNullValues } from '../../lib/config/cleanConfig';

export function useSetConfig(unitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: string): Promise<void> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      await wsManager.send({ SetConfig: config });
    },
    onSuccess: () => {
      // Invalidate config queries to refetch
      void queryClient.invalidateQueries({ queryKey: configKeys.detail(unitId) });
    },
  });
}

export function useSetConfigJson(unitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: CamillaConfig): Promise<void> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      // Clean null values from config before sending to CamillaDSP
      const cleanedConfig = cleanNullValues(config);
      const jsonString = JSON.stringify(cleanedConfig);
      // SetConfigJson validates and stages the config
      await wsManager.send({ SetConfigJson: jsonString });
      // Reload with null loads the staged config without saving to file
      await wsManager.send({ Reload: null });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.json(unitId) });
      void queryClient.invalidateQueries({ queryKey: configKeys.detail(unitId) });
    },
  });
}
