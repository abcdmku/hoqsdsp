import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys } from './configQueries';
import type { CamillaConfig } from '../../types';
import { websocketService } from '../../services/websocketService';
import { cleanNullValues } from '../../lib/config/cleanConfig';
import { stringifyConfig } from '../../lib/config/yaml';
import { validateConfig } from '../../lib/config/validation';
import { useConfigBackupStore } from '../../stores/configBackupStore';
import { useConnectionStore } from '../../stores/connectionStore';

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
  const saveConfig = useConfigBackupStore((state) => state.saveConfig);

  const mutation = useMutation({
    mutationFn: async (config: CamillaConfig): Promise<void> => {
      const wsManager = websocketService.getManager(unitId);
      if (!wsManager) throw new Error('WebSocket not connected');
      if (!wsManager.isConnected) throw new Error('WebSocket connection lost');
      // Clean null values from config before sending to CamillaDSP
      const cleanedConfig = cleanNullValues(config);
      const { ui: uiMetadata, ...cleanedWithoutUi } = cleanedConfig;

      // Preflight validation (client-side) to surface actionable errors instead of
      // relying on CamillaDSP to report a reason (it sometimes returns {result:"Error"} with no details).
      const validateTarget = (uiMetadata ? cleanedWithoutUi : cleanedConfig) as CamillaConfig;
      const validation = validateConfig(validateTarget);
      if (!validation.valid) {
        const first = validation.errors.slice(0, 6);
        const summary = first
          .map((e) => `${e.path || '(root)'}: ${e.message}`)
          .join(' | ');

        console.error('[SetConfigJson] Config validation failed:', validation.errors);
        if (validation.warnings.length > 0) {
          console.warn('[SetConfigJson] Config validation warnings:', validation.warnings);
        }

        const extra = validation.errors.length > first.length
          ? ` (+${String(validation.errors.length - first.length)} more)`
          : '';
        throw new Error(`Config validation failed: ${summary}${extra}`);
      }

      const jsonString = JSON.stringify(cleanedConfig);
      const fallbackJsonString = uiMetadata ? JSON.stringify(cleanedWithoutUi) : null;
      const yamlString = stringifyConfig(cleanedConfig);
      const fallbackYamlString = uiMetadata ? stringifyConfig(cleanedWithoutUi as CamillaConfig) : null;
      const setConfigTimeoutMs = 30000;
      const controlTimeoutMs = 15000;
      let lastAttempt = 'direct';
      let lastJsonSent = jsonString;

      try {
        // SetConfigJson validates and applies the config directly
        // (Note: Reload is not needed - SetConfigJson applies the config immediately)
        try {
          lastAttempt = 'direct';
          lastJsonSent = jsonString;
          await wsManager.send({ SetConfigJson: jsonString }, 'high', { timeout: setConfigTimeoutMs });
          saveConfig(unitId, cleanedConfig);
          return;
        } catch (directError) {
          if (fallbackJsonString) {
            try {
              lastAttempt = 'direct (without ui)';
              lastJsonSent = fallbackJsonString;
              await wsManager.send({ SetConfigJson: fallbackJsonString }, 'high', { timeout: setConfigTimeoutMs });
              saveConfig(unitId, cleanedConfig);
              return;
            } catch (fallbackError) {
              console.warn('[SetConfigJson] Direct apply failed (with and without ui), trying Stop/SetConfig/Reload:', fallbackError);
            }
          } else {
            console.warn('[SetConfigJson] Direct apply failed, trying Stop/SetConfig/Reload:', directError);
          }
        }

        // If direct apply fails (e.g., pipeline structure changed OR server doesn't support SetConfigJson),
        // try Stop -> SetConfig (YAML) -> Reload. SetConfig is supported by more CamillaDSP versions.
        const yamlForReload = fallbackYamlString ?? yamlString;
        lastAttempt = fallbackYamlString ? 'stop/setconfig/reload (without ui)' : 'stop/setconfig/reload';
        lastJsonSent = '(yaml)';
        await wsManager.send('Stop', 'high', { timeout: controlTimeoutMs });
        await wsManager.send({ SetConfig: yamlForReload }, 'high', { timeout: setConfigTimeoutMs });
        await wsManager.send({ Reload: null }, 'high', { timeout: setConfigTimeoutMs });
        saveConfig(unitId, cleanedConfig);
      } catch (error) {
        const camillaVersion = useConnectionStore.getState().connections.get(unitId)?.version;
        console.error('[SetConfigJson] Failed to apply config:', error);
        console.error('[SetConfigJson] Last attempt:', lastAttempt);
        console.error('[SetConfigJson] CamillaDSP version:', camillaVersion ?? '(unknown)');
        console.error('[SetConfigJson] Config that failed:', cleanedConfig);
        console.error('[SetConfigJson] Payload that failed:', lastJsonSent);

        const baseMessage = error instanceof Error ? error.message : String(error);
        const prefix = camillaVersion ? `CamillaDSP v${camillaVersion}` : 'CamillaDSP (version unknown)';
        throw new Error(`${prefix}: ${baseMessage} (attempt: ${lastAttempt})`);
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
