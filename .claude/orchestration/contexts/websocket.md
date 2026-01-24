# Agent Context: WebSocket Communication Layer

## Your Role
You are implementing the WebSocket communication layer that connects the frontend to CamillaDSP units. This is a critical infrastructure component.

## CamillaDSP WebSocket Protocol

### Connection
- Default port: 1234 (configurable)
- Protocol: `ws://` (or `wss://` if compiled with secure-websocket feature)
- Messages: JSON format

### Command Format
**No-argument commands:** Send as quoted string
```json
"GetVersion"
```

**Commands with arguments:** Send as key-value object
```json
{"SetVolume": -10.0}
```

### Response Format
```json
{
  "result": "Ok",
  "value": <return_value>
}
```
or
```json
{
  "result": "Error",
  "value": "Error message"
}
```

## Task 2.1.1: WebSocketManager Class

Create `src/lib/websocket/WebSocketManager.ts`:

```typescript
import { EventEmitter } from 'eventemitter3';
import type { WSCommand, WSResponse } from '@/types/websocket.types';

export interface WebSocketManagerOptions {
  address: string;
  port: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  constructor(private options: WebSocketManagerOptions) {
    super();
  }

  async connect(): Promise<void> {
    // Implementation
  }

  async send<T>(command: WSCommand): Promise<T> {
    // Add correlation ID, send, await response
  }

  disconnect(): void {
    // Clean disconnection
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

## Task 2.1.2: Connection Lifecycle

Handle these states:
- `connecting` - WebSocket opening
- `connected` - Ready for commands
- `disconnected` - Clean close
- `error` - Connection error

Emit events:
- `connected`
- `disconnected`
- `error`
- `message`
- `stateChange`

## Task 2.1.3: Exponential Backoff Reconnection

```typescript
// src/lib/websocket/ReconnectionStrategy.ts
export class ReconnectionStrategy {
  private attempts = 0;
  private maxAttempts: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(options: ReconnectionOptions) {
    this.maxAttempts = options.maxAttempts ?? 10;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30000;
  }

  getNextDelay(): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    this.attempts++;
    return delay + jitter;
  }

  reset(): void {
    this.attempts = 0;
  }

  canRetry(): boolean {
    return this.attempts < this.maxAttempts;
  }
}
```

## Task 2.1.4: Message Queue

```typescript
// src/lib/websocket/MessageQueue.ts
interface QueuedMessage {
  id: string;
  command: WSCommand;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;

  enqueue(command: WSCommand, priority: 'high' | 'normal' | 'low' = 'normal'): string {
    // Add to queue with priority ordering
  }

  async flush(sender: (cmd: WSCommand) => Promise<void>): Promise<void> {
    // Process queue in priority order
  }
}
```

## Task 2.1.5: Request/Response Correlation

Each request needs a unique ID to match with its response:
- Generate unique IDs (use `crypto.randomUUID()`)
- Store pending requests with timeout
- Match responses to requests
- Handle timeouts (default 5 seconds)

## Important Implementation Notes

1. **Thread Safety**: JavaScript is single-threaded, but handle race conditions in async code
2. **Error Handling**: Always catch WebSocket errors and emit them
3. **Cleanup**: Clear timeouts and pending requests on disconnect
4. **Backpressure**: Don't send commands if queue is full

## Testing
Create mock WebSocket for testing:
```typescript
// src/test/mocks/MockWebSocket.ts
export class MockWebSocket {
  // Implement WebSocket interface for testing
}
```

## Quality Requirements
- 100% TypeScript strict mode
- All public methods documented
- Unit tests for all edge cases
- Memory leak prevention (cleanup timers)
