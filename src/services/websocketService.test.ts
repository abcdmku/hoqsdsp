import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/websocket/managerRegistry', () => ({
  clearWebSocketManagers: vi.fn(),
  getWebSocketManager: vi.fn(() => undefined),
  removeWebSocketManager: vi.fn(),
  setWebSocketManager: vi.fn(),
}));

vi.mock('../lib/websocket/WebSocketManager', () => ({
  WebSocketManager: vi.fn(),
}));

import { websocketService } from './websocketService';
import { WebSocketManager } from '../lib/websocket/WebSocketManager';
import { setWebSocketManager } from '../lib/websocket/managerRegistry';

describe('websocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disconnects a manager when connect fails (prevents ghost reconnect loops)', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('connect failed'));
    const disconnect = vi.fn();

    const WebSocketManagerMock = WebSocketManager as unknown as ReturnType<typeof vi.fn>;
    WebSocketManagerMock.mockImplementation(() => ({
      isConnected: false,
      connect,
      disconnect,
    }));

    await expect(websocketService.connect('unit-1', '127.0.0.1', 1234)).rejects.toThrow(/Failed to connect/);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(setWebSocketManager as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});

