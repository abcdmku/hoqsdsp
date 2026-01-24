import { WebSocketManager } from './WebSocketManager';

const managers = new Map<string, WebSocketManager>();

export function getWebSocketManager(unitId: string): WebSocketManager | undefined {
  return managers.get(unitId);
}

export function setWebSocketManager(unitId: string, manager: WebSocketManager): void {
  managers.set(unitId, manager);
}

export function removeWebSocketManager(unitId: string): void {
  managers.delete(unitId);
}

export function clearWebSocketManagers(): void {
  managers.clear();
}

