import { useCallback, useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';
import type { DSPUnit } from '../types';

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_RETRY_EXPONENT = 5;

function getRetryDelayMs(attempt: number): number {
  // attempt: 1 => 1s, 2 => 2s, 3 => 4s ... capped to ~30s
  const exponent = Math.min(Math.max(0, attempt - 1), MAX_RETRY_EXPONENT);
  const delay = BASE_RETRY_DELAY_MS * 2 ** exponent;
  return Math.min(MAX_RETRY_DELAY_MS, delay);
}

/**
 * Manages WebSocket connections at the app level.
 * This hook should be called once in the App component to maintain
 * connections across route changes.
 *
 * Behavior:
 * - Automatically connects to ALL units on app startup
 * - Auto-sets the first unit as active if none is selected
 * - Maintains connection when navigating between routes
 * - Only disconnects when explicitly requested or when unit is removed
 */
export function useConnectionManager() {
  const units = useUnitStore((state) => state.units);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const connectUnit = useConnectionStore((state) => state.connectUnit);
  const connections = useConnectionStore((state) => state.connections);

  const mountedRef = useRef(true);
  const unitsByIdRef = useRef<Map<string, DSPUnit>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const retryAttemptsRef = useRef<Map<string, number>>(new Map());
  const retryTimersRef = useRef<Map<string, number>>(new Map());
  const connectNowRef = useRef<(unitId: string) => void>(() => {});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const timerId of retryTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      retryTimersRef.current.clear();
      retryAttemptsRef.current.clear();
      inFlightRef.current.clear();
      unitsByIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    unitsByIdRef.current = new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  // Auto-set active unit if none selected
  useEffect(() => {
    if (activeUnitId) return;
    const firstUnit = units[0];
    if (firstUnit) {
      setActiveUnit(firstUnit.id);
    }
  }, [activeUnitId, setActiveUnit, units]);

  const clearRetry = useCallback((unitId: string) => {
    const timerId = retryTimersRef.current.get(unitId);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      retryTimersRef.current.delete(unitId);
    }
    retryAttemptsRef.current.delete(unitId);
  }, []);

  const scheduleRetry = useCallback((unitId: string) => {
    if (!mountedRef.current) return;
    if (retryTimersRef.current.has(unitId)) return;

    const attempt = (retryAttemptsRef.current.get(unitId) ?? 0) + 1;
    retryAttemptsRef.current.set(unitId, attempt);

    const delay = getRetryDelayMs(attempt);
    const timerId = window.setTimeout(() => {
      retryTimersRef.current.delete(unitId);
      if (!mountedRef.current) return;

      const unit = unitsByIdRef.current.get(unitId);
      if (!unit) {
        clearRetry(unitId);
        return;
      }

      connectNowRef.current(unitId);
    }, delay);

    retryTimersRef.current.set(unitId, timerId);
  }, [clearRetry]);

  const connectNow = useCallback((unitId: string) => {
    if (!mountedRef.current) return;

    const unit = unitsByIdRef.current.get(unitId);
    if (!unit) return;

    if (inFlightRef.current.has(unitId)) return;
    inFlightRef.current.add(unitId);

    void connectUnit(unit.id, unit.address, unit.port)
      .then(() => {
        if (!mountedRef.current) return;
        clearRetry(unitId);
      })
      .catch((error) => {
        console.error(`Failed to connect to unit ${unit.id}:`, error);
        if (!mountedRef.current) return;
        scheduleRetry(unitId);
      })
      .finally(() => {
        inFlightRef.current.delete(unitId);
      });
  }, [clearRetry, connectUnit, scheduleRetry]);

  useEffect(() => {
    connectNowRef.current = connectNow;
  }, [connectNow]);

  // Ensure we keep trying to connect, but with backoff to avoid runaway attempts and memory leaks.
  useEffect(() => {
    for (const unit of units) {
      const status = connections.get(unit.id)?.status;
      if (status === 'connected') {
        clearRetry(unit.id);
        continue;
      }

      if (status === 'connecting') continue;
      if (inFlightRef.current.has(unit.id)) continue;
      if (retryTimersRef.current.has(unit.id)) continue;

      connectNow(unit.id);
    }

    // Clean up retry state for units that no longer exist.
    for (const unitId of Array.from(retryTimersRef.current.keys())) {
      if (!unitsByIdRef.current.has(unitId)) {
        clearRetry(unitId);
      }
    }
    for (const unitId of Array.from(retryAttemptsRef.current.keys())) {
      if (!unitsByIdRef.current.has(unitId)) {
        clearRetry(unitId);
      }
    }
  }, [clearRetry, connectNow, connections, units]);
}
