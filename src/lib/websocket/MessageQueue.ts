import type { MessagePriority, QueuedMessage, WSCommand } from '../../types';

export class MessageQueue {
  private queue: QueuedMessage[] = [];

  enqueue(command: WSCommand, priority: MessagePriority): void {
    this.queue.push({ command, priority, timestamp: Date.now() });
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  drain(handler: (message: QueuedMessage) => void): void {
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message) {
        handler(message);
      }
    }
  }

  get size(): number {
    return this.queue.length;
  }

  peekAll(): QueuedMessage[] {
    return [...this.queue];
  }
}
