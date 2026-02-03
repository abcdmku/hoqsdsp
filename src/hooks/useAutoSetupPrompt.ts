import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';
import { useAutoSetupStore } from '../stores/autoSetupStore';
import { websocketService } from '../services/websocketService';
import { fetchConfigFromManager } from '../features/configuration';
import { showToast } from '../components/feedback';
import type { ConnectionStatus } from '../types';

/**
 * Hook that watches for newly connected units without configuration
 * and prompts the user to run auto setup.
 *
 * Should be used once at the app level.
 */
export function useAutoSetupPrompt(): void {
  const connections = useConnectionStore((state) => state.connections);
  const getUnit = useUnitStore((state) => state.getUnit);
  const requestAutoSetup = useAutoSetupStore((state) => state.requestAutoSetup);

  // Track previous statuses to detect new connections
  const prevStatusesRef = useRef<Map<string, ConnectionStatus>>(new Map());
  // Track units we've already prompted for to avoid duplicate prompts
  const promptedUnitsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef<boolean>(true);
  const timersRef = useRef<Map<string, number>>(new Map());
  const retryCountsRef = useRef<Map<string, number>>(new Map());
  const errorNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const retryCounts = retryCountsRef.current;
    const errorNotified = errorNotifiedRef.current;
    const prevStatuses = prevStatusesRef.current;
    const promptedUnits = promptedUnitsRef.current;

    return () => {
      mountedRef.current = false;
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
      retryCounts.clear();
      errorNotified.clear();
      prevStatuses.clear();
      promptedUnits.clear();
    };
  }, []);

  useEffect(() => {
    const isMounted = () => mountedRef.current;

    const checkAndPrompt = async (unitId: string) => {
      if (!isMounted()) return;
      // Don't prompt again for units we've already prompted
      if (promptedUnitsRef.current.has(unitId)) {
        return;
      }

      try {
        const manager = websocketService.getManager(unitId);
        if (!manager?.isConnected) return;

        const config = await fetchConfigFromManager(manager, { timeoutMs: 30000 });
        if (!isMounted()) return;

        if (!config) {
          // Mark as prompted so we don't show again
          promptedUnitsRef.current.add(unitId);

          const unit = getUnit(unitId);
          const unitName = unit?.name ?? unitId;

          // Show toast with action to run auto setup
          showToast.action(`${unitName} needs configuration`, {
            description: 'No audio device configuration found. Run Auto Setup?',
            actionLabel: 'Auto Setup',
            duration: 15000,
            onAction: () => {
              requestAutoSetup(unitId);
            },
          });
        }
      } catch {
        if (!isMounted()) return;

        // Don't auto-prompt setup on transient config load failures; retry a few times.
        const attempt = (retryCountsRef.current.get(unitId) ?? 0) + 1;
        retryCountsRef.current.set(unitId, attempt);

        const status = useConnectionStore.getState().connections.get(unitId)?.status;
        const stillConnected = status === 'connected' && websocketService.getManager(unitId)?.isConnected;

        if (stillConnected && attempt <= 3) {
          const delayMs = Math.min(5000, 500 * 2 ** (attempt - 1));
          const existingTimer = timersRef.current.get(unitId);
          if (existingTimer !== undefined) {
            window.clearTimeout(existingTimer);
          }
          const timerId = window.setTimeout(() => {
            timersRef.current.delete(unitId);
            void checkAndPrompt(unitId);
          }, delayMs);
          timersRef.current.set(unitId, timerId);
          return;
        }

        // Avoid spamming the user; show a single non-actionable warning toast.
        if (!errorNotifiedRef.current.has(unitId)) {
          errorNotifiedRef.current.add(unitId);
          const unit = getUnit(unitId);
          const unitName = unit?.name ?? unitId;
          showToast.warning(
            `${unitName}: could not load configuration`,
            'Not prompting Auto Setup to avoid overwriting existing config.',
          );
        }
      }
    };

    // Check for status changes
    connections.forEach((connection, unitId) => {
      const prevStatus = prevStatusesRef.current.get(unitId);
      const currentStatus = connection.status;

      // If unit just connected (was not connected before, now connected)
      if (currentStatus === 'connected' && prevStatus !== 'connected') {
        // Small delay to let the connection stabilize
        const existingTimer = timersRef.current.get(unitId);
        if (existingTimer !== undefined) {
          window.clearTimeout(existingTimer);
          timersRef.current.delete(unitId);
        }
        retryCountsRef.current.delete(unitId);
        errorNotifiedRef.current.delete(unitId);

        const timerId = window.setTimeout(() => {
          timersRef.current.delete(unitId);
          void checkAndPrompt(unitId);
        }, 500);
        timersRef.current.set(unitId, timerId);
      }

      // Update tracked status
      prevStatusesRef.current.set(unitId, currentStatus);
    });

    // Clean up removed connections from tracking
    prevStatusesRef.current.forEach((_, unitId) => {
      if (!connections.has(unitId)) {
        const timerId = timersRef.current.get(unitId);
        if (timerId !== undefined) {
          window.clearTimeout(timerId);
          timersRef.current.delete(unitId);
        }
        retryCountsRef.current.delete(unitId);
        errorNotifiedRef.current.delete(unitId);
        prevStatusesRef.current.delete(unitId);
        // Also clear from prompted set so reconnecting shows prompt again
        promptedUnitsRef.current.delete(unitId);
      }
    });
  }, [connections, getUnit, requestAutoSetup]);
}
