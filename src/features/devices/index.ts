import { useQuery } from '@tanstack/react-query';
import type { DeviceInfo } from '../../types';
import { websocketService } from '../../services/websocketService';
import { useConnectionStore } from '../../stores/connectionStore';

export const deviceKeys = {
  all: ['devices'] as const,
  supportedTypes: (unitId: string) => [...deviceKeys.all, 'types', unitId] as const,
  captureDevices: (unitId: string, backend: string) =>
    [...deviceKeys.all, 'capture', unitId, backend] as const,
  playbackDevices: (unitId: string, backend: string) =>
    [...deviceKeys.all, 'playback', unitId, backend] as const,
};

export function useSupportedDeviceTypes(unitId: string) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );

  return useQuery({
    queryKey: deviceKeys.supportedTypes(unitId),
    queryFn: async (): Promise<string[]> => {
      const result = await websocketService.getSupportedDeviceTypes(unitId);

      // If it's already an array of strings, return as-is
      if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
        return result;
      }

      // Handle nested array structure - flatten if needed
      if (Array.isArray(result)) {
        // Check if it's an array of arrays (nested structure)
        if (result.length > 0 && Array.isArray(result[0])) {
          // Flatten and deduplicate
          const flattened = result.flat();
          const unique = [...new Set(flattened.filter((item): item is string => typeof item === 'string'))];
          return unique;
        }
      }

      return [];
    },
    enabled: status === 'connected',
    staleTime: 60000,
  });
}

// Parse device info from CamillaDSP response
// CamillaDSP returns devices as arrays: [device_id, description]
// We convert to our DeviceInfo format: { device: string, name: string | null }
export function parseDeviceList(rawDevices: unknown): DeviceInfo[] {
  if (!Array.isArray(rawDevices)) return [];

  return rawDevices.map((item): DeviceInfo => {
    // Handle array format: [device_id, description]
    if (Array.isArray(item) && item.length >= 2) {
      return {
        device: String(item[0]),
        name: String(item[1]),
      };
    }
    // Handle object format: { device: string, name: string }
    if (item && typeof item === 'object' && 'device' in item) {
      return item as DeviceInfo;
    }
    // Fallback for string format
    if (typeof item === 'string') {
      return { device: item, name: null };
    }
    // Unknown format
    return { device: String(item), name: null };
  });
}

export function useAvailableCaptureDevices(unitId: string, backend: string | null) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );

  // Ensure backend is a valid string (not an array or object)
  const safeBackend = typeof backend === 'string' && backend.length > 0 ? backend : null;

  return useQuery({
    queryKey: deviceKeys.captureDevices(unitId, safeBackend ?? ''),
    queryFn: async (): Promise<DeviceInfo[]> => {
      if (!safeBackend) return [];
      const rawResult = await websocketService.getAvailableCaptureDevices(unitId, safeBackend);
      const parsed = parseDeviceList(rawResult);
      return parsed;
    },
    enabled: status === 'connected' && !!safeBackend,
    staleTime: 30000,
  });
}

export function useAvailablePlaybackDevices(unitId: string, backend: string | null) {
  const status = useConnectionStore(
    (state) => state.connections.get(unitId)?.status,
  );

  // Ensure backend is a valid string (not an array or object)
  const safeBackend = typeof backend === 'string' && backend.length > 0 ? backend : null;

  return useQuery({
    queryKey: deviceKeys.playbackDevices(unitId, safeBackend ?? ''),
    queryFn: async (): Promise<DeviceInfo[]> => {
      if (!safeBackend) return [];
      const rawResult = await websocketService.getAvailablePlaybackDevices(unitId, safeBackend);
      const parsed = parseDeviceList(rawResult);
      return parsed;
    },
    enabled: status === 'connected' && !!safeBackend,
    staleTime: 30000,
  });
}
