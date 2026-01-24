import { WebSocketManager } from '../lib/websocket/WebSocketManager';
import type { WSCommand, ProcessingState, SignalLevels } from '../types';

interface UnitWebSocketConnection {
  manager: WebSocketManager;
  unitId: string;
  address: string;
  port: number;
}

class WebSocketService {
  private connections: Map<string, UnitWebSocketConnection> = new Map();

  async connect(unitId: string, address: string, port: number): Promise<void> {
    const existing = this.connections.get(unitId);
    if (existing?.manager.isConnected) {
      return; // Already connected
    }

    const url = `ws://${address}:${port}`;
    const manager = new WebSocketManager(url);

    try {
      await manager.connect();
      this.connections.set(unitId, { manager, unitId, address, port });
    } catch (error) {
      throw new Error(`Failed to connect to ${address}:${port}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  disconnect(unitId: string): void {
    const connection = this.connections.get(unitId);
    if (connection) {
      connection.manager.disconnect();
      this.connections.delete(unitId);
    }
  }

  disconnectAll(): void {
    this.connections.forEach(conn => {
      conn.manager.disconnect();
    });
    this.connections.clear();
  }

  getManager(unitId: string): WebSocketManager | undefined {
    return this.connections.get(unitId)?.manager;
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
