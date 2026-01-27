import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';
import { useAutoSetupStore } from '../stores/autoSetupStore';
import { websocketService } from '../services/websocketService';
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

  useEffect(() => {
    const checkAndPrompt = async (unitId: string) => {
      // Don't prompt again for units we've already prompted
      if (promptedUnitsRef.current.has(unitId)) {
        return;
      }

      try {
        // Check if unit has a config by trying to get config JSON
        const manager = websocketService.getManager(unitId);
        if (!manager?.isConnected) return;

        // Try to get the config - if it fails or returns empty, offer auto setup
        const configResult = await manager.send<string>('GetConfigJson');

        // Parse to check if it's a valid config
        let hasValidConfig = false;
        if (configResult) {
          try {
            const parsed: unknown = JSON.parse(configResult);
            // Check if it has the minimum required structure
            if (
              typeof parsed === 'object' &&
              parsed !== null &&
              'devices' in parsed &&
              typeof (parsed as { devices: unknown }).devices === 'object'
            ) {
              const devices = (parsed as { devices: { capture?: unknown; playback?: unknown } }).devices;
              hasValidConfig = !!(devices.capture && devices.playback);
            }
          } catch {
            hasValidConfig = false;
          }
        }

        if (!hasValidConfig) {
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
        // If we can't get config, it might mean there is no config
        // Mark as prompted and offer auto setup
        if (!promptedUnitsRef.current.has(unitId)) {
          promptedUnitsRef.current.add(unitId);

          const unit = getUnit(unitId);
          const unitName = unit?.name ?? unitId;

          showToast.action(`${unitName} needs configuration`, {
            description: 'Could not load configuration. Run Auto Setup?',
            actionLabel: 'Auto Setup',
            duration: 15000,
            onAction: () => {
              requestAutoSetup(unitId);
            },
          });
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
        setTimeout(() => {
          void checkAndPrompt(unitId);
        }, 500);
      }

      // Update tracked status
      prevStatusesRef.current.set(unitId, currentStatus);
    });

    // Clean up removed connections from tracking
    prevStatusesRef.current.forEach((_, unitId) => {
      if (!connections.has(unitId)) {
        prevStatusesRef.current.delete(unitId);
        // Also clear from prompted set so reconnecting shows prompt again
        promptedUnitsRef.current.delete(unitId);
      }
    });
  }, [connections, getUnit, requestAutoSetup]);
}
