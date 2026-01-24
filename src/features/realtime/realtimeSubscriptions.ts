/**
 * Real-time subscriptions for CamillaDSP WebSocket data.
 *
 * This module provides a centralized way to manage subscriptions
 * to real-time data from CamillaDSP, handling polling intervals
 * and cleanup automatically.
 */

import type { SignalLevels } from '../../types';

export type SubscriptionType =
  | 'levels'
  | 'processingLoad'
  | 'bufferLevel'
  | 'sampleRate'
  | 'state';

export interface RealtimeData {
  levels: SignalLevels | null;
  processingLoad: number;
  bufferLevel: number;
  captureSampleRate: number;
  rateAdjust: number;
  clippedSamples: number;
}

export interface SubscriptionOptions {
  /** Types of data to subscribe to */
  types: SubscriptionType[];
  /** Polling interval in ms (default: 100 for levels, 500 for metrics) */
  pollInterval?: number;
  /** Callback when new data is received */
  onData: (data: Partial<RealtimeData>) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface WSManager {
  send: <T>(cmd: string) => Promise<T>;
  isConnected: boolean;
}

/**
 * RealtimeSubscriptionManager handles polling multiple real-time
 * data streams from CamillaDSP efficiently.
 *
 * Features:
 * - Batches requests to minimize WebSocket traffic
 * - Supports different polling rates for different data types
 * - Automatic cleanup on unsubscribe
 */
export class RealtimeSubscriptionManager {
  private wsManager: WSManager;
  private subscriptions = new Map<string, {
    options: SubscriptionOptions;
    intervalId: ReturnType<typeof setInterval> | null;
  }>();
  private nextSubscriptionId = 0;

  constructor(wsManager: WSManager) {
    this.wsManager = wsManager;
  }

  /**
   * Subscribe to real-time data updates.
   * @returns Subscription ID for unsubscribing
   */
  subscribe(options: SubscriptionOptions): string {
    const id = `sub_${this.nextSubscriptionId++}`;
    const pollInterval = options.pollInterval ?? this.getDefaultInterval(options.types);

    const poll = async () => {
      if (!this.wsManager.isConnected) {
        return;
      }

      try {
        const data: Partial<RealtimeData> = {};

        // Fetch requested data types in parallel
        const promises: Promise<void>[] = [];

        if (options.types.includes('levels')) {
          promises.push(
            this.fetchLevels().then((result) => {
              data.levels = result;
            })
          );
          promises.push(
            this.fetchClippedSamples().then((result) => {
              data.clippedSamples = result;
            })
          );
        }

        if (options.types.includes('processingLoad')) {
          promises.push(
            this.fetchProcessingLoad().then((result) => {
              data.processingLoad = result;
            })
          );
        }

        if (options.types.includes('bufferLevel')) {
          promises.push(
            this.fetchBufferLevel().then((result) => {
              data.bufferLevel = result;
            })
          );
        }

        if (options.types.includes('sampleRate')) {
          promises.push(
            this.fetchCaptureSampleRate().then((result) => {
              data.captureSampleRate = result;
            })
          );
          promises.push(
            this.fetchRateAdjust().then((result) => {
              data.rateAdjust = result;
            })
          );
        }

        await Promise.all(promises);

        options.onData(data);
      } catch (error) {
        options.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Initial poll
    void poll();

    // Set up interval
    const intervalId = setInterval(() => { void poll(); }, pollInterval);

    this.subscriptions.set(id, { options, intervalId });

    return id;
  }

  /**
   * Unsubscribe from real-time data updates.
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      if (subscription.intervalId) {
        clearInterval(subscription.intervalId);
      }
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from all subscriptions.
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription, id) => {
      if (subscription.intervalId) {
        clearInterval(subscription.intervalId);
      }
      this.subscriptions.delete(id);
    });
  }

  /**
   * Get default polling interval based on data types.
   */
  private getDefaultInterval(types: SubscriptionType[]): number {
    // Levels need faster updates (50ms = 20Hz)
    if (types.includes('levels')) {
      return 50;
    }
    // Other metrics can be slower (500ms = 2Hz)
    return 500;
  }

  private async fetchLevels(): Promise<SignalLevels | null> {
    try {
      return await this.wsManager.send<SignalLevels>('GetSignalLevelsSinceLast');
    } catch {
      return null;
    }
  }

  private async fetchClippedSamples(): Promise<number> {
    try {
      return await this.wsManager.send<number>('GetClippedSamples');
    } catch {
      return 0;
    }
  }

  private async fetchProcessingLoad(): Promise<number> {
    try {
      return await this.wsManager.send<number>('GetProcessingLoad');
    } catch {
      return 0;
    }
  }

  private async fetchBufferLevel(): Promise<number> {
    try {
      const result = await this.wsManager.send<number>('GetBufferLevel');
      return result * 100; // Convert 0-1 to percentage
    } catch {
      return 0;
    }
  }

  private async fetchCaptureSampleRate(): Promise<number> {
    try {
      return await this.wsManager.send<number>('GetCaptureSampleRate');
    } catch {
      return 0;
    }
  }

  private async fetchRateAdjust(): Promise<number> {
    try {
      return await this.wsManager.send<number>('GetRateAdjust');
    } catch {
      return 1.0;
    }
  }
}

/**
 * Factory function to create a subscription manager for a WebSocket connection.
 */
export function createRealtimeSubscriptionManager(
  wsManager: WSManager
): RealtimeSubscriptionManager {
  return new RealtimeSubscriptionManager(wsManager);
}
