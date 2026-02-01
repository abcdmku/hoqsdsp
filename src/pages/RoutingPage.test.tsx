import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setWebSocketManager, clearWebSocketManagers } from '../lib/websocket/managerRegistry';
import type { WebSocketManager } from '../lib/websocket/WebSocketManager';
import { useConnectionStore } from '../stores/connectionStore';
import type { CamillaConfig } from '../types';
import { RoutingPage } from './Routing';

notifyManager.setNotifyFunction((callback) => {
  act(callback);
});
notifyManager.setBatchNotifyFunction((callback) => {
  act(callback);
});

describe('RoutingPage', () => {
  beforeEach(() => {
    clearWebSocketManagers();
    useConnectionStore.setState({ connections: new Map(), activeUnitId: null });
  });

  it('persists routing changes via SetConfigJson and refetches config', async () => {
    const unitId = 'unit-1';

    useConnectionStore.getState().setConnection(unitId, { status: 'connected' });
    useConnectionStore.getState().setActiveUnit(unitId);

    let currentConfig: CamillaConfig = {
      devices: {
        samplerate: 48000,
        chunksize: 1024,
        capture: { type: 'Alsa', channels: 2, device: 'hw:0' },
        playback: { type: 'Alsa', channels: 2, device: 'hw:0' },
      },
      mixers: {
        routing: {
          channels: { in: 2, out: 2 },
          mapping: [],
        },
      },
      pipeline: [{ type: 'Mixer', name: 'routing' }],
    };

    const send = vi.fn(async (command: unknown) => {
      if (command === 'GetConfigJson') {
        return JSON.stringify(currentConfig);
      }

      if (typeof command === 'object' && command !== null && 'SetConfigJson' in command) {
        const payload = (command as { SetConfigJson: string }).SetConfigJson;
        currentConfig = JSON.parse(payload) as CamillaConfig;
        return 'Ok';
      }

      return 'Ok';
    });

    setWebSocketManager(unitId, { isConnected: true, send } as unknown as WebSocketManager);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RoutingPage />
      </QueryClientProvider>,
    );

    const grid = await screen.findByRole('grid');
    fireEvent.keyDown(grid, { key: 'Enter' });

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ SetConfigJson: expect.any(String) }),
        'high',
        expect.anything(),
      );
    });

    const setCall = send.mock.calls.find(
      ([cmd]) => typeof cmd === 'object' && cmd !== null && 'SetConfigJson' in (cmd as object),
    );
    expect(setCall).toBeTruthy();

    const sent = JSON.parse((setCall![0] as { SetConfigJson: string }).SetConfigJson) as CamillaConfig;
    expect(sent.mixers?.routing?.mapping).toEqual([{ dest: 0, sources: [{ channel: 0, gain: 0 }] }]);

    await waitFor(() => {
      const getCalls = send.mock.calls.filter(([cmd]) => cmd === 'GetConfigJson');
      expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });

    queryClient.clear();
  });
});
