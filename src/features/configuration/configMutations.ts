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

const DEFAULT_VOLUME_FADER = 'Aux1' as const;

function hasValidVolumeFader(value: unknown): boolean {
  return value === 'Aux1' || value === 'Aux2' || value === 'Aux3' || value === 'Aux4';
}

function ensureVolumeFilterFaders(config: CamillaConfig): CamillaConfig {
  if (!config.filters) return config;

  let nextFilters: CamillaConfig['filters'] | undefined;
  for (const [name, filter] of Object.entries(config.filters)) {
    if (filter.type !== 'Volume') continue;

    const currentFader = (filter.parameters as { fader?: unknown }).fader;
    if (hasValidVolumeFader(currentFader)) continue;

    if (!nextFilters) {
      nextFilters = { ...config.filters };
    }

    nextFilters[name] = {
      ...filter,
      parameters: {
        ...(filter.parameters as unknown as Record<string, unknown>),
        fader: DEFAULT_VOLUME_FADER,
      },
    };
  }

  if (!nextFilters) return config;

  return {
    ...config,
    filters: nextFilters,
  };
}

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

      const normalizedConfig = ensureVolumeFilterFaders(config);
      if (normalizedConfig !== config) {
        console.warn('[SetConfigJson] Added missing Volume.fader values (default: Aux1) for compatibility.');
      }

      // Clean null values from config before sending to CamillaDSP
      const cleanedConfig = cleanNullValues(normalizedConfig);
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
              console.warn('[SetConfigJson] Direct apply failed (with and without ui), trying Stop/SetConfig:', fallbackError);
            }
          } else {
            console.warn('[SetConfigJson] Direct apply failed, trying Stop/SetConfig:', directError);
          }
        }

        // If direct apply fails (e.g., proxy/server quirks with SetConfigJson), fall back to YAML SetConfig.
        // Per CamillaDSP websocket API, SetConfig applies immediately; Reload is only for SetConfigFilePath.
        const yamlForSetConfig = fallbackYamlString ?? yamlString;
        lastAttempt = fallbackYamlString ? 'stop/setconfig (without ui)' : 'stop/setconfig';
        lastJsonSent = yamlForSetConfig;
        try {
          await wsManager.send('Stop', 'high', { timeout: controlTimeoutMs });
        } catch (stopError) {
          // Stop may fail if the engine is already inactive; continue with SetConfig.
          console.warn('[SetConfigJson] Stop failed before SetConfig, continuing:', stopError);
        }
        await wsManager.send({ SetConfig: yamlForSetConfig }, 'high', { timeout: setConfigTimeoutMs });
        saveConfig(unitId, cleanedConfig);
      } catch (error) {
        const camillaVersion = useConnectionStore.getState().connections.get(unitId)?.version;
        console.error('[SetConfigJson] Failed to apply config:', error);
        console.error('[SetConfigJson] Last attempt:', lastAttempt);
        console.error('[SetConfigJson] CamillaDSP version:', camillaVersion ?? '(unknown)');
        console.error('[SetConfigJson] Config that failed:', cleanedConfig);
        console.error('[SetConfigJson] Payload that failed:', lastJsonSent);

        const yamlForValidation = fallbackYamlString ?? yamlString;
        let validateConfigMessage: string | null = null;
        try {
          await wsManager.send({ ValidateConfig: yamlForValidation }, 'high', { timeout: setConfigTimeoutMs });
        } catch (validateError) {
          validateConfigMessage = validateError instanceof Error ? validateError.message : String(validateError);
          console.error('[SetConfigJson] ValidateConfig details:', validateConfigMessage);
        }

        const baseMessage = error instanceof Error ? error.message : String(error);
        const prefix = camillaVersion ? `CamillaDSP v${camillaVersion}` : 'CamillaDSP (version unknown)';
        const validationSuffix = validateConfigMessage ? ` | ValidateConfig: ${validateConfigMessage}` : '';
        throw new Error(`${prefix}: ${baseMessage} (attempt: ${lastAttempt})${validationSuffix}`);
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
