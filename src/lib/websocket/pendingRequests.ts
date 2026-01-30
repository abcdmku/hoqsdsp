import type { PendingRequest } from '../../types';

export class PendingRequestStore {
  private pendingRequests = new Map<string, PendingRequest[]>();

  add(commandName: string, pending: PendingRequest): void {
    const queue = this.pendingRequests.get(commandName) ?? [];
    queue.push(pending);
    this.pendingRequests.set(commandName, queue);
  }

  shift(commandName: string): PendingRequest | undefined {
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

  remove(commandName: string, pending: PendingRequest): void {
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

  clear(onPending: (pending: PendingRequest, commandName: string) => void): void {
    this.pendingRequests.forEach((queue, commandName) => {
      queue.forEach((pending) => {
        onPending(pending, commandName);
      });
      this.pendingRequests.delete(commandName);
    });
  }

  get size(): number {
    return this.pendingRequests.size;
  }
}
