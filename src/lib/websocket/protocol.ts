import type { WSCommand } from '../../types';

export interface WrappedResponse {
  commandName: string;
  ok: boolean;
  value?: unknown;
  error?: unknown;
}

export function formatCommand(command: WSCommand | unknown): string {
  if (typeof command === 'string') return command;
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    return 'Unknown';
  }
  return Object.keys(command as Record<string, unknown>)[0] ?? 'Unknown';
}

export function formatMessage(command: WSCommand): string {
  return JSON.stringify(command);
}

export function extractWrappedResponse(parsed: unknown): WrappedResponse | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1) {
    return null;
  }

  const commandName = keys[0] ?? '';
  const inner = record[commandName];
  if (inner === null || typeof inner !== 'object' || Array.isArray(inner)) {
    // Some CamillaDSP versions / proxies return the value directly, e.g.
    // {"GetConfigJson":"{...}"} or {"SetConfigJson":"Ok"}.
    return { commandName, ok: true, value: inner };
  }

  const response = inner as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(response, 'Ok')) {
    return { commandName, ok: true, value: response.Ok };
  }

  if (Object.prototype.hasOwnProperty.call(response, 'Err')) {
    return { commandName, ok: false, error: response.Err };
  }

  if (Object.prototype.hasOwnProperty.call(response, 'Error')) {
    return { commandName, ok: false, error: response.Error };
  }

  if (Object.prototype.hasOwnProperty.call(response, 'ok')) {
    return { commandName, ok: true, value: response.ok };
  }

  if (Object.prototype.hasOwnProperty.call(response, 'err')) {
    return { commandName, ok: false, error: response.err };
  }

  if (Object.prototype.hasOwnProperty.call(response, 'error')) {
    return { commandName, ok: false, error: response.error };
  }

  if (response.result === 'Ok') {
    return { commandName, ok: true, value: response.value };
  }

  if (response.result === 'Error') {
    return { commandName, ok: false, error: response.value };
  }

  // Some implementations return a legacy {value} wrapper without a {result} field.
  if (Object.prototype.hasOwnProperty.call(response, 'value')) {
    return { commandName, ok: true, value: response.value };
  }

  return null;
}
