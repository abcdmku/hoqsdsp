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

  async send<T>(
    command: WSCommand,
    priority: MessagePriority = 'normal',
    options?: { timeout?: number }
  ): Promise<T> {
    if (!this.isConnected) {
      // Queue message if not connected
      this.queueMessage(command, priority);
      throw new Error('WebSocket not connected');
    }

    const commandName = this.formatCommand(command);
    const message = this.formatMessage(command);
    const timeout = options?.timeout ?? this.requestTimeout;

    // Debug logging for config-related commands
    if (commandName === 'SetConfigJson' || commandName === 'Reload') {
      console.debug(`[WebSocket] Sending ${commandName}:`, message.slice(0, 200) + (message.length > 200 ? '...' : ''));
    }

    // Debug logging for device enumeration
    if (commandName.includes('Available') || commandName.includes('Device')) {
      console.debug(`[WebSocket] Sending device query: "${commandName}"`, message);
    }

    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: undefined as unknown as ReturnType<typeof setTimeout>,
        command,
      };

      pending.timeout = setTimeout(() => {
        this.removePendingRequest(commandName, pending);
        console.error(`[WebSocket] Request timeout for ${commandName}`);
        reject(new Error(`Request timeout: ${this.formatCommand(command)}`));
      }, timeout);

      const queue = this.pendingRequests.get(commandName) ?? [];
      queue.push(pending);
      this.pendingRequests.set(commandName, queue);

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

      // Log raw response for config-related commands to help debug errors
      if (data.includes('SetConfigJson') || data.includes('Reload')) {
        console.debug('[WebSocket] Raw response:', data);
      }

      // Debug logging for device enumeration
      if (data.includes('Available') || data.includes('Device')) {
        console.debug('[WebSocket] Device response:', data.slice(0, 500));
        console.debug('[WebSocket] Pending requests:', Array.from(this.pendingRequests.keys()));
      }

      const wrapped = this.extractWrappedResponse(parsed);
      if (!wrapped) {
        // Log unrecognized responses for debugging
        console.debug('[WebSocket] Unrecognized response format:', data.slice(0, 500));
        return;
      }

      const { commandName, ok, value, error } = wrapped;

      // Debug logging for device enumeration
      if (commandName.includes('Available') || commandName.includes('Device')) {
        console.debug(`[WebSocket] Extracted command: "${commandName}", ok: ${ok}`);
      }

      // Debug logging for config-related responses
      if (commandName === 'SetConfigJson' || commandName === 'Reload') {
        console.debug(`[WebSocket] ${commandName} response:`, ok ? 'OK' : 'Error', ok ? '' : error);
      }
      const pending = this.shiftPendingRequest(commandName);
      if (!pending) return;

      clearTimeout(pending.timeout);

      if (ok) {
        // Treat `null` as "no value" to align with `Promise<void>` calls.
        pending.resolve(value == null ? undefined : value);
        return;
      }

      // Extract a meaningful error message from the response
      let errorMessage: string;
      if (error === undefined || error === null) {
        console.error('[WebSocket] Full response with empty error:', parsed);
        errorMessage = 'Server returned an error without details';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object') {
        // Handle object errors (e.g., { message: "..." } or nested structures)
        const errorObj = error as Record<string, unknown>;
        errorMessage = errorObj.message as string
          ?? errorObj.reason as string
          ?? JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }

      console.error(`[WebSocket] ${commandName} error:`, error);
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
  ): { commandName: string; ok: boolean; value?: unknown; error?: unknown } | null {
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

    const response = inner as Record<string, unknown>;

    // CamillaDSP v3: {"Cmd": {"Ok": <value>}} or {"Cmd": {"Error": <message>}}
    if (Object.prototype.hasOwnProperty.call(response, 'Ok')) {
      return { commandName, ok: true, value: response.Ok };
    }

    if (Object.prototype.hasOwnProperty.call(response, 'Error')) {
      return { commandName, ok: false, error: response.Error };
    }

    // Handle lowercase variants (some server versions may differ)
    if (Object.prototype.hasOwnProperty.call(response, 'ok')) {
      return { commandName, ok: true, value: response.ok };
    }

    if (Object.prototype.hasOwnProperty.call(response, 'error')) {
      return { commandName, ok: false, error: response.error };
    }

    // Back-compat: {"Cmd": {"result": "Ok"|"Error", "value": ...}}
    if (response.result === 'Ok') {
      return { commandName, ok: true, value: response.value };
    }

    if (response.result === 'Error') {
      return { commandName, ok: false, error: response.value };
    }

    return null;
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
