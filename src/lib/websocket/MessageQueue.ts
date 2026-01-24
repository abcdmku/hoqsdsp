import type { WSCommand, MessagePriority, QueuedMessage } from '../../types';

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  enqueue(command: WSCommand, priority: MessagePriority = 'normal'): void {
    if (this.queue.length >= this.maxSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.queue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift(); // Remove oldest
      }
    }

    this.queue.push({
      command,
      priority,
      timestamp: Date.now(),
    });

    this.sortByPriority();
  }

  dequeue(): QueuedMessage | undefined {
    return this.queue.shift();
  }

  peek(): QueuedMessage | undefined {
    return this.queue[0];
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  private sortByPriority(): void {
    const priorityOrder: Record<MessagePriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
}
