import { useEffect } from 'react';

export interface UseDevPerformanceEntryCleanupOptions {
  intervalMs?: number;
}

export function useDevPerformanceEntryCleanup(options: UseDevPerformanceEntryCleanupOptions = {}): void {
  const intervalMs = options.intervalMs ?? 1000;

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const perf = globalThis.performance;
    if (!perf) return;

    if (typeof perf.clearMeasures !== 'function') return;

    let alive = true;

    const id = window.setInterval(() => {
      if (!alive) return;
      try {
        perf.clearMeasures();
        perf.clearMarks?.();
      } catch {
        return;
      }
    }, intervalMs);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);
}
