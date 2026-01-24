import { EventEmitter } from 'eventemitter3';
import type {
  WSCommand,
  WSConnectionState,
  PendingRequest,
  MessagePriority,
  QueuedMessage
} from '../../types';

interface WebSocketManagerEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  error: (error: Error) => void;
  stateChange: (state: WSConnectionState) => void;
  message: (data: unknown) => void;
}

export class WebSocketManager extends EventEmitter<WebSocketManagerEvents> {
  private ws: WebSocket | null = null;
  private url: string;
  private pendingRequests = new Map<string, PendingRequest[]>();
  private messageQueue: QueuedMessage[] = [];
  private state: WSConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;
  private readonly requestTimeout = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  get connectionState(): WSConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === 'connected';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.url);
      } catch (error) {
        this.setState('error');
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      this.ws.onopen = () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.flushMessageQueue();
        resolve();
      };

      this.ws.onclose = (event) => {
        this.handleDisconnect(event.code, event.reason);
      };

      this.ws.onerror = () => {
        const error = new Error('WebSocket connection error');
        this.emit('error', error);
        if (this.state === 'connecting') {
          reject(error);
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };
    });
  }

  disconnect(): void {
    this.cancelReconnect();
    this.clearPendingRequests();

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection attempt
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
    this.emit('disconnected', 1000, 'Client disconnect');
  }

  async send<T>(command: WSCommand, priority: MessagePriority = 'normal'): Promise<T> {
    if (!this.isConnected) {
      // Queue message if not connected
      this.queueMessage(command, priority);
      throw new Error('WebSocket not connected');
    }

    const commandName = this.formatCommand(command);

    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: undefined as unknown as ReturnType<typeof setTimeout>,
        command,
      };

      pending.timeout = setTimeout(() => {
        this.removePendingRequest(commandName, pending);
        reject(new Error(`Request timeout: ${this.formatCommand(command)}`));
      }, this.requestTimeout);

      const queue = this.pendingRequests.get(commandName) ?? [];
      queue.push(pending);
      this.pendingRequests.set(commandName, queue);

      const message = this.formatMessage(command);
      this.ws?.send(message);
    });
  }

  private setState(state: WSConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }

  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data) as unknown;
      this.emit('message', parsed);

      const wrapped = this.extractWrappedResponse(parsed);
      if (!wrapped) return;

      const { commandName, response } = wrapped;
      const pending = this.shiftPendingRequest(commandName);
      if (!pending) return;

      clearTimeout(pending.timeout);

      if (response.result === 'Ok') {
        pending.resolve(response.value);
        return;
      }

      const errorMessage = response.value === undefined ? 'Unknown error' : String(response.value);
      pending.reject(new Error(errorMessage));
    } catch {
      // Non-JSON message or parsing error
      this.emit('message', data);
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    this.ws = null;
    this.clearPendingRequests();
    this.emit('disconnected', code, reason);

    // Don't reconnect if it was a clean disconnect
    if (code === 1000) {
      this.setState('disconnected');
      return;
    }

    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('error');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = this.calculateReconnectDelay();

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Will trigger another reconnect attempt via onclose
      });
    }, delay);
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(exponentialDelay + jitter);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private clearPendingRequests(): void {
    this.pendingRequests.forEach((queue, commandName) => {
      queue.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Connection closed'));
      });
      this.pendingRequests.delete(commandName);
    });
  }

  private formatCommand(command: WSCommand): string {
    if (typeof command === 'string') {
      return command;
    }
    return Object.keys(command)[0] ?? 'Unknown';
  }

  private formatMessage(command: WSCommand): string {
    // CamillaDSP expects the command itself as the JSON payload.
    // No-argument: "GetVersion"
    // With arguments: {"SetVolume": -10.0}
    return JSON.stringify(command);
  }

  private extractWrappedResponse(
    parsed: unknown
  ): { commandName: string; response: { result: 'Ok' | 'Error'; value?: unknown } } | null {
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
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) {
      return null;
    }

    const response = inner as { result?: unknown; value?: unknown };
    if (response.result !== 'Ok' && response.result !== 'Error') {
      return null;
    }

    return {
      commandName,
      response: { result: response.result, value: response.value },
    };
  }

  private shiftPendingRequest(commandName: string): PendingRequest | undefined {
    const queue = this.pendingRequests.get(commandName);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    const pending = queue.shift();
    if (queue.length === 0) {
      this.pendingRequests.delete(commandName);
    } else {
      this.pendingRequests.set(commandName, queue);
    }

    return pending;
  }

  private removePendingRequest(commandName: string, pending: PendingRequest): void {
    const queue = this.pendingRequests.get(commandName);
    if (!queue) return;

    const index = queue.indexOf(pending);
    if (index === -1) return;

    queue.splice(index, 1);
    if (queue.length === 0) {
      this.pendingRequests.delete(commandName);
    } else {
      this.pendingRequests.set(commandName, queue);
    }
  }

  private queueMessage(command: WSCommand, priority: MessagePriority): void {
    this.messageQueue.push({
      command,
      priority,
      timestamp: Date.now(),
    });
    // Sort by priority (high > normal > low)
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.command, message.priority).catch(() => {
          // Message failed, will be logged via error event
        });
      }
    }
  }
}
