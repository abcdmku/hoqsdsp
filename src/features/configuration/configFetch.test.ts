import { describe, it, expect, vi } from 'vitest';
import type { WebSocketManager } from '../../lib/websocket/WebSocketManager';
import { fetchConfigFromManager } from './configFetch';

function createManagerMock(): { manager: WebSocketManager; send: ReturnType<typeof vi.fn> } {
  const send = vi.fn();
  return { manager: { send } as unknown as WebSocketManager, send };
}

describe('fetchConfigFromManager', () => {
  it('parses JSON from GetConfigJson', async () => {
    const { manager, send } = createManagerMock();

    send.mockResolvedValueOnce(
      JSON.stringify({
        devices: {
          samplerate: 48000,
          chunksize: 1024,
          capture: { type: 'Alsa', channels: 2, device: 'hw:0', format: null },
          playback: { type: 'Alsa', channels: 2, device: 'hw:1' },
        },
        pipeline: [],
      }),
    );

    const config = await fetchConfigFromManager(manager, { timeoutMs: 12345 });

    expect(send).toHaveBeenCalledWith('GetConfigJson', 'normal', { timeout: 12345 });
    expect(config?.devices.capture.channels).toBe(2);
    // null optional fields should be stripped by cleanNullValues
    expect((config?.devices.capture as { format?: unknown }).format).toBeUndefined();
  });

  it('falls back to YAML GetConfig when GetConfigJson fails', async () => {
    const { manager, send } = createManagerMock();

    send.mockRejectedValueOnce(new Error('Unknown command: GetConfigJson'));
    send.mockResolvedValueOnce(`
devices:
  samplerate: 48000
  chunksize: 1024
  capture:
    type: Alsa
    channels: 8
    device: hw:0
  playback:
    type: Alsa
    channels: 8
    device: hw:1
pipeline: []
`);

    const config = await fetchConfigFromManager(manager, { timeoutMs: 30000 });

    expect(send).toHaveBeenNthCalledWith(1, 'GetConfigJson', 'normal', { timeout: 30000 });
    expect(send).toHaveBeenNthCalledWith(2, 'GetConfig', 'normal', { timeout: 30000 });
    expect(config?.devices.capture.channels).toBe(8);
    expect(config?.devices.playback.channels).toBe(8);
  });

  it('returns null when CamillaDSP reports no config loaded', async () => {
    const { manager, send } = createManagerMock();

    send.mockRejectedValueOnce(new Error('No config loaded'));

    await expect(fetchConfigFromManager(manager)).resolves.toBeNull();
    expect(send).toHaveBeenCalledWith('GetConfigJson', 'normal', { timeout: 30000 });
  });

  it('returns null when YAML fallback reports no configuration', async () => {
    const { manager, send } = createManagerMock();

    send.mockRejectedValueOnce(new Error('Some transient error'));
    send.mockRejectedValueOnce(new Error('No configuration loaded'));

    await expect(fetchConfigFromManager(manager)).resolves.toBeNull();
    expect(send).toHaveBeenNthCalledWith(1, 'GetConfigJson', 'normal', { timeout: 30000 });
    expect(send).toHaveBeenNthCalledWith(2, 'GetConfig', 'normal', { timeout: 30000 });
  });
});
