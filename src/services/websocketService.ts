import { WebSocketManager } from '../lib/websocket/WebSocketManager';
import {
  clearWebSocketManagers,
  getWebSocketManager,
  removeWebSocketManager,
  setWebSocketManager,
} from '../lib/websocket/managerRegistry';
import type { ProcessingState, SignalLevels } from '../types';

interface UnitWebSocketConnection {
  unitId: string;
  address: string;
  port: number;
}

class WebSocketService {
  private connections: Map<string, UnitWebSocketConnection> = new Map();

  async connect(unitId: string, address: string, port: number): Promise<void> {
    const existingMeta = this.connections.get(unitId);
    const existingManager = getWebSocketManager(unitId);
    const isSameEndpoint =
      existingMeta?.address === address && existingMeta?.port === port;

    if (existingManager?.isConnected && isSameEndpoint) return;

    // If we have a manager but it's not connected (or endpoint changed),
    // dispose it to avoid leaking listeners/sockets.
    if (existingManager) {
      existingManager.disconnect();
      removeWebSocketManager(unitId);
    }

    const url = `ws://${address}:${port}`;
    const manager = new WebSocketManager(url);

    try {
      await manager.connect();
      setWebSocketManager(unitId, manager);
      this.connections.set(unitId, { unitId, address, port });
    } catch (error) {
      throw new Error(`Failed to connect to ${address}:${port}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  disconnect(unitId: string): void {
    const manager = getWebSocketManager(unitId);
    if (manager) {
      manager.disconnect();
      removeWebSocketManager(unitId);
    }

    this.connections.delete(unitId);
  }

  disconnectAll(): void {
    Array.from(this.connections.keys()).forEach((unitId) => {
      this.disconnect(unitId);
    });
    this.connections.clear();
    clearWebSocketManagers();
  }

  getManager(unitId: string): WebSocketManager | undefined {
    return getWebSocketManager(unitId);
  }

  isConnected(unitId: string): boolean {
    return this.getManager(unitId)?.isConnected ?? false;
  }

  // Query methods
  async getVersion(unitId: string): Promise<string> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<string>('GetVersion');
  }

  async getState(unitId: string): Promise<ProcessingState> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<ProcessingState>('GetState');
  }

  async getVolume(unitId: string): Promise<number> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<number>('GetVolume');
  }

  async getMute(unitId: string): Promise<boolean> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<boolean>('GetMute');
  }

  async getProcessingLoad(unitId: string): Promise<number> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<number>('GetProcessingLoad');
  }

  async getSignalLevels(unitId: string): Promise<SignalLevels> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<SignalLevels>('GetSignalLevels');
  }

  async getBufferLevel(unitId: string): Promise<number> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    return manager.send<number>('GetBufferLevel');
  }

  // Control methods
  async setVolume(unitId: string, volume: number): Promise<void> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    await manager.send({ SetVolume: volume }, 'high');
  }

  async setMute(unitId: string, mute: boolean): Promise<void> {
    const manager = this.getManager(unitId);
    if (!manager) throw new Error(`Unit ${unitId} not connected`);
    await manager.send({ SetMute: mute }, 'high');
  }

  subscribeToStateChanges(
    unitId: string,
    callback: (state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error') => void
  ): () => void {
    const manager = this.getManager(unitId);
    if (!manager) {
      throw new Error(`Unit ${unitId} not connected`);
    }

    manager.on('stateChange', callback);
    return () => {
      manager.off('stateChange', callback);
    };
  }

  subscribeToMessages(unitId: string, callback: (data: unknown) => void): () => void {
    const manager = this.getManager(unitId);
    if (!manager) {
      throw new Error(`Unit ${unitId} not connected`);
    }

    manager.on('message', callback);
    return () => {
      manager.off('message', callback);
    };
  }
}

export const websocketService = new WebSocketService();
