import { EventEmitter } from 'eventemitter3';
import type { MessagePriority, PendingRequest, WSCommand, WSConnectionState } from '../../types';
import { MessageQueue } from './messageQueue';
import { PendingRequestStore } from './pendingRequests';
import { extractWrappedResponse, formatCommand, formatMessage } from './protocol';
import { calculateReconnectDelay } from './reconnectUtils';

interface WebSocketManagerEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  error: (error: Error) => void;
  stateChange: (state: WSConnectionState) => void;
  message: (data: unknown) => void;
}

export class WebSocketManager extends EventEmitter<WebSocketManagerEvents> {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly pendingRequests = new PendingRequestStore();
  private readonly messageQueue = new MessageQueue();
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
      this.ws.onclose = null;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
    this.emit('disconnected', 1000, 'Client disconnect');
  }

  async send<T>(
    command: WSCommand,
    priority: MessagePriority = 'normal',
    options?: { timeout?: number },
  ): Promise<T> {
    if (!this.isConnected) {
      this.messageQueue.enqueue(command, priority);
      throw new Error('WebSocket not connected');
    }

    const commandName = formatCommand(command);
    const message = formatMessage(command);
    const timeout = options?.timeout ?? this.requestTimeout;

    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: undefined as unknown as ReturnType<typeof setTimeout>,
        command,
      };

      pending.timeout = setTimeout(() => {
        this.pendingRequests.remove(commandName, pending);
        reject(new Error(`Request timeout: ${formatCommand(command)}`));
      }, timeout);

      this.pendingRequests.add(commandName, pending);
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

      const wrapped = extractWrappedResponse(parsed);
      if (!wrapped) {
        return;
      }

      const { commandName, ok, value, error } = wrapped;
      const pending = this.pendingRequests.shift(commandName);
      if (!pending) return;

      clearTimeout(pending.timeout);

      if (ok) {
        pending.resolve(value == null ? undefined : value);
        return;
      }

      let errorMessage: string;
      if (error === undefined || error === null) {
        errorMessage = 'Server returned an error without details';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        errorMessage = (errorObj.message as string)
          ?? (errorObj.reason as string)
          ?? JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }

      pending.reject(new Error(errorMessage));
    } catch {
      this.emit('message', data);
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    this.ws = null;
    this.clearPendingRequests();
    this.emit('disconnected', code, reason);

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
    this.reconnectAttempts += 1;

    const delay = calculateReconnectDelay(
      this.reconnectAttempts,
      this.baseReconnectDelay,
      this.maxReconnectDelay,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Will trigger another reconnect attempt via onclose
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private clearPendingRequests(): void {
    this.pendingRequests.clear((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    });
  }

  private flushMessageQueue(): void {
    this.messageQueue.drain((message) => {
      this.send(message.command, message.priority).catch(() => {
        // Message failed, will be logged via error event
      });
    });
  }
}
