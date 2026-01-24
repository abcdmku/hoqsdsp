import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys } from './configQueries';
import {
  parseConfigAuto,
  stringifyConfig,
  stringifyConfigJson,
  type ParseResult,
} from '../../lib/config';
import type { CamillaConfig } from '../../types';

interface UseConfigImportExportOptions {
  unitId: string;
  wsManager?: { send: <T>(cmd: unknown) => Promise<T> };
  onImportSuccess?: (config: CamillaConfig) => void;
  onImportError?: (error: Error) => void;
  onExportSuccess?: () => void;
}

export interface ImportConfigResult {
  success: boolean;
  config?: CamillaConfig;
  errors?: string[];
  warnings?: string[];
}

/**
 * Hook for importing and exporting CamillaDSP configurations.
 * Handles file reading, parsing, validation, and WebSocket communication.
 */
export function useConfigImportExport({
  unitId,
  wsManager,
  onImportSuccess,
  onImportError,
}: UseConfigImportExportOptions) {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Mutation for applying imported config to CamillaDSP
  const applyConfigMutation = useMutation({
    mutationFn: async (config: CamillaConfig): Promise<void> => {
      if (!wsManager) {
        throw new Error('WebSocket not connected');
      }
      const jsonString = JSON.stringify(config);
      await wsManager.send({ SetConfigJson: jsonString });
    },
    onSuccess: (_data, config) => {
      // Invalidate config queries to refetch
      void queryClient.invalidateQueries({
        queryKey: configKeys.detail(unitId),
      });
      void queryClient.invalidateQueries({ queryKey: configKeys.json(unitId) });
      onImportSuccess?.(config);
    },
    onError: (error: Error) => {
      onImportError?.(error);
    },
  });

  /**
   * Parse and validate a configuration file/string
   */
  const parseConfig = useCallback((content: string): ParseResult => {
    return parseConfigAuto(content);
  }, []);

  /**
   * Import configuration from a File object
   */
  const importFromFile = useCallback(
    async (file: File): Promise<ImportConfigResult> => {
      setIsImporting(true);

      try {
        const content = await file.text();
        const result = parseConfigAuto(content);

        if (!result.success || !result.config) {
          const errors: string[] = [];

          if (result.yamlError) {
            errors.push(result.yamlError);
          }

          if (result.validation?.errors) {
            errors.push(
              ...result.validation.errors.map((e) => `${e.path}: ${e.message}`),
            );
          }

          return {
            success: false,
            errors: errors.length > 0 ? errors : ['Unknown validation error'],
          };
        }

        return {
          success: true,
          config: result.config,
          warnings: result.validation?.warnings?.map(
            (w) => `${w.path}: ${w.message}`,
          ),
        };
      } catch (error) {
        return {
          success: false,
          errors: [
            error instanceof Error ? error.message : 'Failed to read file',
          ],
        };
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  /**
   * Import configuration from a string (e.g., clipboard paste)
   */
  const importFromString = useCallback(
    (content: string): ImportConfigResult => {
      const result = parseConfigAuto(content);

      if (!result.success || !result.config) {
        const errors: string[] = [];

        if (result.yamlError) {
          errors.push(result.yamlError);
        }

        if (result.validation?.errors) {
          errors.push(
            ...result.validation.errors.map((e) => `${e.path}: ${e.message}`),
          );
        }

        return {
          success: false,
          errors: errors.length > 0 ? errors : ['Unknown validation error'],
        };
      }

      return {
        success: true,
        config: result.config,
        warnings: result.validation?.warnings?.map(
          (w) => `${w.path}: ${w.message}`,
        ),
      };
    },
    [],
  );

  /**
   * Apply a validated configuration to CamillaDSP
   */
  const applyConfig = useCallback(
    async (config: CamillaConfig): Promise<void> => {
      await applyConfigMutation.mutateAsync(config);
    },
    [applyConfigMutation],
  );

  /**
   * Export configuration to a downloadable file
   */
  const exportToFile = useCallback(
    (
      config: CamillaConfig,
      filename: string,
      format: 'yaml' | 'json' = 'yaml',
    ): void => {
      setIsExporting(true);

      try {
        const content =
          format === 'yaml'
            ? stringifyConfig(config)
            : stringifyConfigJson(config);
        const extension = format === 'yaml' ? '.yml' : '.json';
        const mimeType =
          format === 'yaml' ? 'application/x-yaml' : 'application/json';

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  /**
   * Export configuration to clipboard
   */
  const exportToClipboard = useCallback(
    async (
      config: CamillaConfig,
      format: 'yaml' | 'json' = 'yaml',
    ): Promise<boolean> => {
      try {
        const content =
          format === 'yaml'
            ? stringifyConfig(config)
            : stringifyConfigJson(config);
        await navigator.clipboard.writeText(content);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  /**
   * Get configuration as string
   */
  const stringifyForExport = useCallback(
    (config: CamillaConfig, format: 'yaml' | 'json' = 'yaml'): string => {
      return format === 'yaml'
        ? stringifyConfig(config)
        : stringifyConfigJson(config);
    },
    [],
  );

  return {
    // State
    isImporting,
    isExporting,
    isApplying: applyConfigMutation.isPending,
    applyError: applyConfigMutation.error,

    // Import functions
    parseConfig,
    importFromFile,
    importFromString,
    applyConfig,

    // Export functions
    exportToFile,
    exportToClipboard,
    stringifyForExport,
  };
}
