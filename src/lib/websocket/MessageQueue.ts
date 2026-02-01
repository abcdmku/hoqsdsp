import type { MessagePriority, QueuedMessage, WSCommand } from '../../types';

const PRIORITY_ORDER: Record<MessagePriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

const DEFAULT_MAX_SIZE = 100;

interface InternalQueuedMessage extends QueuedMessage {
  seq: number;
}

export class MessageQueue {
  private readonly maxSize: number;
  private queue: InternalQueuedMessage[] = [];
  private seq = 0;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
  }

  enqueue(command: WSCommand, priority: MessagePriority = 'normal'): void {
    this.queue.push({
      command,
      priority,
      timestamp: Date.now(),
      seq: this.seq++,
    });

    this.queue.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.seq - b.seq;
    });

    this.enforceMaxSize();
  }

  dequeue(): QueuedMessage | undefined {
    const msg = this.queue.shift();
    if (!msg) return undefined;
    // Strip internal seq field
    const { seq: _seq, ...queued } = msg;
    void _seq;
    return queued;
  }

  peek(): QueuedMessage | undefined {
    const msg = this.queue[0];
    if (!msg) return undefined;
    const { seq: _seq, ...queued } = msg;
    void _seq;
    return queued;
  }

  drain(handler: (message: QueuedMessage) => void): void {
    while (!this.isEmpty) {
      const message = this.dequeue();
      if (message) handler(message);
    }
  }

  get size(): number {
    return this.queue.length;
  }

  get length(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }

  peekAll(): QueuedMessage[] {
    return this.queue.map(({ seq: _seq, ...queued }) => queued);
  }

  private enforceMaxSize(): void {
    while (this.queue.length > this.maxSize) {
      // Drop oldest message from the lowest priority group first (low -> normal -> high).
      const dropOrder: MessagePriority[] = ['low', 'normal', 'high'];
      const indexToDrop = dropOrder
        .map((priority) => this.queue.findIndex((msg) => msg.priority === priority))
        .find((idx) => idx !== -1);

      if (indexToDrop === undefined) {
        return;
      }

      this.queue.splice(indexToDrop, 1);
    }
  }
}
