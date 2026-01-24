import { EventEmitter } from 'eventemitter3';
import type {
  WSCommand,
  WSResponse,
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
  private pendingRequests = new Map<string, PendingRequest>();
  private messageQueue: QueuedMessage[] = [];
  private requestIdCounter = 0;
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
    const requestId = this.generateRequestId();

    if (!this.isConnected) {
      // Queue message if not connected
      this.queueMessage(command, priority);
      throw new Error('WebSocket not connected');
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${this.formatCommand(command)}`));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
        command,
      });

      const message = this.formatMessage(command, requestId);
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
      const response = JSON.parse(data) as WSResponse & { id?: string };
      this.emit('message', response);

      if (response.id && this.pendingRequests.has(response.id)) {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);

          if (response.result === 'Ok') {
            pending.resolve(response.value);
          } else {
            pending.reject(new Error(String(response.value)));
          }
        }
      }
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
    this.pendingRequests.forEach((pending, id) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    });
  }

  private generateRequestId(): string {
    const timestamp = Date.now();
    const counter = this.requestIdCounter++;
    return `req_${timestamp.toString()}_${counter.toString()}`;
  }

  private formatCommand(command: WSCommand): string {
    if (typeof command === 'string') {
      return command;
    }
    return Object.keys(command)[0] ?? 'Unknown';
  }

  private formatMessage(command: WSCommand, id: string): string {
    // CamillaDSP expects simple command format
    // No-argument: "GetVersion"
    // With arguments: {"SetVolume": -10.0}
    if (typeof command === 'string') {
      return JSON.stringify({ command, id });
    }
    return JSON.stringify({ ...command, id });
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
