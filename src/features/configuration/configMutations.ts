import { useCallback } from 'react';
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

  const mutation = useMutation({
    mutationFn: async (config: CamillaConfig): Promise<void> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      if (!wsManager.isConnected) throw new Error('WebSocket connection lost');
      // Strip 'ui' field - it's frontend-only metadata that CamillaDSP doesn't understand
      const { ui: _ui, ...configWithoutUi } = config;
      // Clean null values from config before sending to CamillaDSP
      const cleanedConfig = cleanNullValues(configWithoutUi);
      const jsonString = JSON.stringify(cleanedConfig);

      try {
        // SetConfigJson validates and applies the config directly
        // (Note: Reload is not needed - SetConfigJson applies the config immediately)
        console.debug('[SetConfigJson] Sending JSON string:', jsonString);
        await wsManager.send({ SetConfigJson: jsonString });
      } catch (error) {
        console.error('[SetConfigJson] Failed to apply config:', error);
        console.error('[SetConfigJson] Config that failed:', cleanedConfig);
        console.error('[SetConfigJson] JSON that failed:', jsonString);
        throw error;
      }
    },
    // Note: onSuccess is NOT used here to avoid a race condition.
    // The component should call invalidate() after clearing any pending state flags.
    onError: (error) => {
      console.error(`Failed to update config for unit ${unitId}:`, error);
    },
  });

  // Expose invalidate method for components to call after clearing pending state
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: configKeys.json(unitId) });
    void queryClient.invalidateQueries({ queryKey: configKeys.detail(unitId) });
  }, [queryClient, unitId]);

  return { ...mutation, invalidate };
}
