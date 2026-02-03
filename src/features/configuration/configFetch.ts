import { parse as parseYaml } from 'yaml';
import type { WebSocketManager } from '../../lib/websocket/WebSocketManager';
import type { CamillaConfig } from '../../types';
import { cleanNullValues, isConfigLike } from '../../lib/config';

const DEFAULT_CONFIG_FETCH_TIMEOUT_MS = 30000;

function isMissingConfigError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no\s+config|no\s+configuration|config\s+(missing|not\s+loaded|empty|none)/i.test(message);
}

function parseConfigObject(value: unknown): CamillaConfig | null {
  if (value == null) return null;
  if (!isConfigLike(value)) {
    throw new Error('Invalid configuration structure: missing required fields (devices, pipeline)');
  }
  return cleanNullValues(value as unknown as CamillaConfig);
}

function parseConfigJsonString(jsonString: string): CamillaConfig | null {
  const trimmed = jsonString.trim();
  if (!trimmed || trimmed === 'null') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Invalid JSON');
  }

  return parseConfigObject(parsed);
}

function parseConfigYamlString(yamlString: string): CamillaConfig | null {
  const trimmed = yamlString.trim();
  if (!trimmed || trimmed === 'null') return null;

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlString);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Invalid YAML');
  }

  return parseConfigObject(parsed);
}

export async function fetchConfigFromManager(
  manager: WebSocketManager,
  options?: { timeoutMs?: number },
): Promise<CamillaConfig | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CONFIG_FETCH_TIMEOUT_MS;

  try {
    const result = await manager.send<unknown>('GetConfigJson', 'normal', { timeout: timeoutMs });
    if (typeof result === 'string') {
      return parseConfigJsonString(result);
    }
    return parseConfigObject(result);
  } catch (error) {
    if (isMissingConfigError(error)) {
      return null;
    }

    try {
      const fallback = await manager.send<unknown>('GetConfig', 'normal', { timeout: timeoutMs });
      if (typeof fallback === 'string') {
        return parseConfigYamlString(fallback);
      }
      return parseConfigObject(fallback);
    } catch (fallbackError) {
      if (isMissingConfigError(fallbackError)) {
        return null;
      }
      throw fallbackError;
    }
  }
}
