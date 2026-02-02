import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageQueue } from './MessageQueue';
import type { WSCommand, MessagePriority } from '../../types';

describe('MessageQueue', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue();
  });

  describe('Basic Operations', () => {
    it('should initialize empty', () => {
      expect(queue.isEmpty).toBe(true);
      expect(queue.length).toBe(0);
    });

    it('should enqueue and dequeue a single message', () => {
      const command: WSCommand = 'GetVersion';
      queue.enqueue(command, 'normal');

      expect(queue.isEmpty).toBe(false);
      expect(queue.length).toBe(1);

      const dequeued = queue.dequeue();
      expect(dequeued).toBeDefined();
      expect(dequeued?.command).toBe('GetVersion');
      expect(dequeued?.priority).toBe('normal');
      expect(queue.isEmpty).toBe(true);
    });

    it('should return undefined when dequeueing from empty queue', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('should peek without removing', () => {
      queue.enqueue('GetVersion', 'normal');

      expect(queue.peek()).toBeDefined();
      expect(queue.peek()?.command).toBe('GetVersion');
      expect(queue.length).toBe(1); // Still in queue
    });

    it('should return undefined when peeking empty queue', () => {
      expect(queue.peek()).toBeUndefined();
    });

    it('should clear all messages', () => {
      queue.enqueue('GetVersion', 'normal');
      queue.enqueue('GetState', 'high');
      queue.enqueue('GetConfig', 'low');

      expect(queue.length).toBe(3);

      queue.clear();

      expect(queue.isEmpty).toBe(true);
      expect(queue.length).toBe(0);
    });
  });

  describe('Priority Handling', () => {
    it('should sort messages by priority (high > normal > low)', () => {
      queue.enqueue('LowPriority' as WSCommand, 'low');
      queue.enqueue('HighPriority' as WSCommand, 'high');
      queue.enqueue('NormalPriority' as WSCommand, 'normal');

      expect(queue.dequeue()?.command).toBe('HighPriority');
      expect(queue.dequeue()?.command).toBe('NormalPriority');
      expect(queue.dequeue()?.command).toBe('LowPriority');
    });

    it('should maintain FIFO within same priority', () => {
      queue.enqueue('First' as WSCommand, 'normal');
      queue.enqueue('Second' as WSCommand, 'normal');
      queue.enqueue('Third' as WSCommand, 'normal');

      expect(queue.dequeue()?.command).toBe('First');
      expect(queue.dequeue()?.command).toBe('Second');
      expect(queue.dequeue()?.command).toBe('Third');
    });

    it('should handle mixed priority insertion order', () => {
      queue.enqueue('Low1' as WSCommand, 'low');
      queue.enqueue('Normal1' as WSCommand, 'normal');
      queue.enqueue('High1' as WSCommand, 'high');
      queue.enqueue('High2' as WSCommand, 'high');
      queue.enqueue('Low2' as WSCommand, 'low');
      queue.enqueue('Normal2' as WSCommand, 'normal');

      // All high priority first, then normal, then low
      expect(queue.dequeue()?.command).toBe('High1');
      expect(queue.dequeue()?.command).toBe('High2');
      expect(queue.dequeue()?.command).toBe('Normal1');
      expect(queue.dequeue()?.command).toBe('Normal2');
      expect(queue.dequeue()?.command).toBe('Low1');
      expect(queue.dequeue()?.command).toBe('Low2');
    });

    it('should use normal priority by default', () => {
      queue.enqueue('DefaultPriority' as WSCommand);
      const msg = queue.dequeue();
      expect(msg?.priority).toBe('normal');
    });
  });

  describe('Max Size Handling', () => {
    it('should respect max size and remove low-priority messages first', () => {
      const smallQueue = new MessageQueue(3);

      smallQueue.enqueue('Cmd1' as WSCommand, 'low');
      smallQueue.enqueue('Cmd2' as WSCommand, 'normal');
      smallQueue.enqueue('Cmd3' as WSCommand, 'high');

      expect(smallQueue.length).toBe(3);

      // Adding 4th message should remove oldest low-priority
      smallQueue.enqueue('Cmd4' as WSCommand, 'normal');

      expect(smallQueue.length).toBe(3);

      // Low priority message should be gone
      const messages: string[] = [];
      while (!smallQueue.isEmpty) {
        const msg = smallQueue.dequeue();
        if (msg) messages.push(msg.command as string);
      }

      expect(messages).not.toContain('Cmd1');
      expect(messages).toContain('Cmd3'); // High priority kept
      expect(messages).toContain('Cmd2'); // Normal kept
      expect(messages).toContain('Cmd4'); // New message added
    });

    it('should remove oldest message if no low-priority available', () => {
      const smallQueue = new MessageQueue(3);

      smallQueue.enqueue('Cmd1' as WSCommand, 'high');
      smallQueue.enqueue('Cmd2' as WSCommand, 'high');
      smallQueue.enqueue('Cmd3' as WSCommand, 'high');

      expect(smallQueue.length).toBe(3);

      // Adding 4th high-priority message should remove oldest
      smallQueue.enqueue('Cmd4' as WSCommand, 'high');

      expect(smallQueue.length).toBe(3);

      // Oldest high-priority message should be gone
      const messages: string[] = [];
      while (!smallQueue.isEmpty) {
        const msg = smallQueue.dequeue();
        if (msg) messages.push(msg.command as string);
      }

      expect(messages).not.toContain('Cmd1');
      expect(messages).toContain('Cmd2');
      expect(messages).toContain('Cmd3');
      expect(messages).toContain('Cmd4');
    });

    it('should handle default max size of 100', () => {
      const defaultQueue = new MessageQueue();

      for (let i = 0; i < 100; i++) {
        defaultQueue.enqueue(`Cmd${i}` as WSCommand, 'normal');
      }

      expect(defaultQueue.length).toBe(100);

      // Adding 101st message should maintain size at 100
      defaultQueue.enqueue('Overflow' as WSCommand, 'normal');
      expect(defaultQueue.length).toBe(100);
    });
  });

  describe('Object Commands', () => {
    it('should handle object command types', () => {
      const objCommand: WSCommand = { SetVolume: -10.5 };
      queue.enqueue(objCommand, 'high');

      const dequeued = queue.dequeue();
      expect(dequeued?.command).toEqual({ SetVolume: -10.5 });
    });

    it('should handle complex nested object commands', () => {
      const complexCommand: WSCommand = {
        SetConfig: JSON.stringify({
          devices: { capture: 'hw:0' },
          filters: [],
        }),
      };
      queue.enqueue(complexCommand, 'normal');

      const dequeued = queue.dequeue();
      expect(dequeued?.command).toEqual(complexCommand);
    });
  });

  describe('Coalescing', () => {
    it('should coalesce SetVolume commands to the latest value', () => {
      queue.enqueue({ SetVolume: -10.5 }, 'high');
      queue.enqueue({ SetVolume: -20.0 }, 'high');

      expect(queue.length).toBe(1);
      expect(queue.dequeue()?.command).toEqual({ SetVolume: -20.0 });
    });

    it('should coalesce SetFaderVolume commands per fader', () => {
      queue.enqueue({ SetFaderVolume: { fader: 0, vol: -10 } }, 'high');
      queue.enqueue({ SetFaderVolume: { fader: 1, vol: -12 } }, 'high');
      queue.enqueue({ SetFaderVolume: { fader: 0, vol: -30 } }, 'high');

      expect(queue.length).toBe(2);

      const cmds = [queue.dequeue()?.command, queue.dequeue()?.command];
      expect(cmds).toContainEqual({ SetFaderVolume: { fader: 1, vol: -12 } });
      expect(cmds).toContainEqual({ SetFaderVolume: { fader: 0, vol: -30 } });
    });
  });

  describe('Timestamp', () => {
    it('should add timestamp to queued messages', () => {
      const before = Date.now();
      queue.enqueue('GetVersion', 'normal');
      const after = Date.now();

      const msg = queue.dequeue();
      expect(msg?.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should have increasing timestamps for sequential enqueues', async () => {
      vi.useFakeTimers();

      queue.enqueue('First' as WSCommand, 'low');
      vi.advanceTimersByTime(100);
      queue.enqueue('Second' as WSCommand, 'low');

      const first = queue.dequeue();
      const second = queue.dequeue();

      expect(second!.timestamp).toBeGreaterThan(first!.timestamp);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string command', () => {
      queue.enqueue('' as WSCommand, 'normal');
      expect(queue.length).toBe(1);
      expect(queue.dequeue()?.command).toBe('');
    });

    it('should handle rapid enqueue/dequeue cycles', () => {
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(`Cmd${i}` as WSCommand, 'normal');
        queue.dequeue();
      }

      expect(queue.isEmpty).toBe(true);
    });

    it('should handle many messages with mixed priorities', () => {
      const priorities: MessagePriority[] = ['high', 'normal', 'low'];

      for (let i = 0; i < 50; i++) {
        const priority = priorities[i % 3];
        queue.enqueue(`Cmd${i}` as WSCommand, priority);
      }

      expect(queue.length).toBe(50);

      // Verify priority order maintained
      let lastPriority: MessagePriority = 'high';
      const priorityOrder: Record<MessagePriority, number> = {
        high: 0,
        normal: 1,
        low: 2,
      };

      while (!queue.isEmpty) {
        const msg = queue.dequeue();
        if (msg) {
          expect(priorityOrder[msg.priority]).toBeGreaterThanOrEqual(
            priorityOrder[lastPriority]
          );
          lastPriority = msg.priority;
        }
      }
    });

    it('should handle max size of 1', () => {
      const tinyQueue = new MessageQueue(1);

      tinyQueue.enqueue('First' as WSCommand, 'low');
      tinyQueue.enqueue('Second' as WSCommand, 'high');

      expect(tinyQueue.length).toBe(1);
      expect(tinyQueue.dequeue()?.command).toBe('Second');
    });
  });
});
