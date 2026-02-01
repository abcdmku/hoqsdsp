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
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveInFlight = false;
  private lastSentAt = 0;
  private lastReceivedAt = 0;
  private intentionalClose = false;
  private readonly heartbeatInterval = 15000;
  private readonly staleTimeout = 45000;

  constructor(url: string) {
    super();
    this.url = url;
  }

  get connectionState(): WSConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.ws?.readyState === WebSocket.CONNECTING) {
        const onConnected = () => {
          cleanup();
          resolve();
        };
        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };
        const cleanup = () => {
          this.off('connected', onConnected);
          this.off('error', onError);
        };

        this.on('connected', onConnected);
        this.on('error', onError);
        return;
      }

      this.setState('connecting');
      this.intentionalClose = false;

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
        const now = Date.now();
        this.lastSentAt = now;
        this.lastReceivedAt = now;
        this.startHeartbeat();
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
    this.stopHeartbeat();
    this.clearPendingRequests();
    this.intentionalClose = true;

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

    this.lastSentAt = Date.now();
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
    this.lastReceivedAt = Date.now();
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
        // Include the raw response shape to make debugging "silent" server errors possible.
        let raw = '';
        try {
          raw = JSON.stringify(parsed);
        } catch {
          raw = String(parsed);
        }
        if (raw.length > 800) raw = `${raw.slice(0, 800)}...`;
        errorMessage = `Server returned an error without details for ${commandName}${raw ? `: ${raw}` : ''}`;
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
    this.stopHeartbeat();
    this.clearPendingRequests();
    this.emit('disconnected', code, reason);

    if (this.intentionalClose || reason === 'Client disconnect') {
      this.intentionalClose = false;
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
      this.reconnectTimer = null;
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

  private startHeartbeat(): void {
    if (this.heartbeatInterval <= 0 || this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected || !this.ws) {
        return;
      }

      const now = Date.now();
      const lastActivity = Math.max(this.lastSentAt, this.lastReceivedAt);

      if (this.lastReceivedAt > 0 && now - this.lastReceivedAt > this.staleTimeout) {
        this.ws.close(4000, 'Heartbeat timeout');
        return;
      }

      if (now - lastActivity >= this.heartbeatInterval && !this.keepAliveInFlight) {
        this.keepAliveInFlight = true;
        this.send('GetState', 'low', { timeout: Math.min(this.requestTimeout, 3000) })
          .catch(() => {})
          .finally(() => {
            this.keepAliveInFlight = false;
          });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.keepAliveInFlight = false;
  }
}
