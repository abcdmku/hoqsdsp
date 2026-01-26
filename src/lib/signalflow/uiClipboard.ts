import type { SignalFlowClipboardPayload } from '../../stores/signalFlowUiStore';

const CLIPBOARD_APP = 'camilladsp-signalflow';
const CLIPBOARD_VERSION = 1;

export function serializeSignalFlowClipboard(payload: SignalFlowClipboardPayload): string {
  return JSON.stringify({
    app: CLIPBOARD_APP,
    version: CLIPBOARD_VERSION,
    payload,
  });
}

export function parseSignalFlowClipboard(text: string): SignalFlowClipboardPayload | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as { app?: unknown; version?: unknown; payload?: unknown };
    if (obj.app !== CLIPBOARD_APP) return null;
    if (obj.version !== CLIPBOARD_VERSION) return null;
    const payload = obj.payload as { kind?: unknown; data?: unknown } | undefined;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.kind !== 'route' && payload.kind !== 'filter' && payload.kind !== 'channel') return null;

    const data = payload.data;
    if (!data || typeof data !== 'object') return null;

    if (payload.kind === 'route') {
      const route = data as { gain?: unknown; inverted?: unknown; mute?: unknown };
      if (typeof route.gain !== 'number') return null;
      if (typeof route.inverted !== 'boolean') return null;
      if (typeof route.mute !== 'boolean') return null;
      return payload as SignalFlowClipboardPayload;
    }

    if (payload.kind === 'channel') {
      const channel = data as { filters?: unknown };
      if (!Array.isArray(channel.filters)) return null;
      for (const entry of channel.filters) {
        if (!entry || typeof entry !== 'object') return null;
        const filter = entry as { name?: unknown; config?: unknown };
        if (typeof filter.name !== 'string') return null;
        if (!filter.config || typeof filter.config !== 'object') return null;
        const config = filter.config as { type?: unknown };
        if (typeof config.type !== 'string') return null;
      }
      return payload as SignalFlowClipboardPayload;
    }

    const filterData = data as { filterType?: unknown; config?: unknown; bands?: unknown };
    if (typeof filterData.filterType !== 'string') return null;
    if (filterData.filterType === 'Biquad' && Array.isArray(filterData.bands)) {
      for (const entry of filterData.bands) {
        if (!entry || typeof entry !== 'object') return null;
        const band = entry as { name?: unknown; config?: unknown };
        if (typeof band.name !== 'string') return null;
        if (!band.config || typeof band.config !== 'object') return null;
        const config = band.config as { type?: unknown };
        if (config.type !== 'Biquad') return null;
      }
      return payload as SignalFlowClipboardPayload;
    }

    if (!filterData.config || typeof filterData.config !== 'object') return null;
    const config = filterData.config as { type?: unknown };
    if (typeof config.type !== 'string') return null;
    return payload as SignalFlowClipboardPayload;
  } catch {
    return null;
  }
}
