import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { RouteEdge, RouteEndpoint } from '../../../lib/signalflow';

interface SignalFlowRoutesParams {
  commitModel: (next: { routes?: RouteEdge[] }, options?: { debounce?: boolean }) => void;
  setRoutes: Dispatch<SetStateAction<RouteEdge[]>>;
  setSelectedRouteIndex: Dispatch<SetStateAction<number | null>>;
}

export function useSignalFlowRoutes({
  commitModel,
  setRoutes,
  setSelectedRouteIndex,
}: SignalFlowRoutesParams) {
  const addRoute = useCallback(
    (from: RouteEndpoint, to: RouteEndpoint) => {
      setRoutes((prev) => {
        const existingIndex = prev.findIndex(
          (edge) =>
            edge.from.deviceId === from.deviceId &&
            edge.from.channelIndex === from.channelIndex &&
            edge.to.deviceId === to.deviceId &&
            edge.to.channelIndex === to.channelIndex,
        );

        if (existingIndex >= 0) {
          setSelectedRouteIndex(existingIndex);
          return prev;
        }

        const next: RouteEdge[] = [...prev, { from, to, gain: 0, inverted: false, mute: false }];
        setSelectedRouteIndex(next.length - 1);
        commitModel({ routes: next });
        return next;
      });
    },
    [commitModel, setRoutes, setSelectedRouteIndex],
  );

  const updateRoute = useCallback(
    (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => {
      setRoutes((prev) => {
        if (!prev[index]) return prev;
        const next = prev.map((edge, idx) => (idx === index ? { ...edge, ...updates } : edge));
        commitModel({ routes: next }, options);
        return next;
      });
    },
    [commitModel, setRoutes],
  );

  const deleteRoute = useCallback(
    (index: number) => {
      setRoutes((prev) => {
        if (!prev[index]) return prev;
        const next = prev.filter((_, idx) => idx !== index);
        commitModel({ routes: next });
        setSelectedRouteIndex(null);
        return next;
      });
    },
    [commitModel, setRoutes, setSelectedRouteIndex],
  );

  return { addRoute, deleteRoute, updateRoute };
}
