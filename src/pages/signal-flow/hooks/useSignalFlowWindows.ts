import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ChannelNode, RouteEdge } from '../../../lib/signalflow';
import type { FilterType } from '../../../types';
import type { FloatingWindowPosition } from '../../../components/signal-flow/FloatingWindow';
import type { DockedFilterEditorState, SignalFlowWindow } from '../windows/types';
import { getCenteredPosition } from '../windowUtils';

interface SignalFlowWindowsParams {
  workspaceRef: RefObject<HTMLElement | null>;
}

export function useSignalFlowWindows({ workspaceRef }: SignalFlowWindowsParams) {
  const [windows, setWindows] = useState<SignalFlowWindow[]>([]);
  const [dockedFilterEditor, setDockedFilterEditor] = useState<DockedFilterEditorState | null>(null);
  const nextZIndexRef = useRef(100);

  const raiseWindow = useCallback((id: string) => {
    const nextZ = nextZIndexRef.current + 1;
    nextZIndexRef.current = nextZ;
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win)));
  }, []);

  const openConnectionWindow = useCallback(
    (route: RouteEdge, _point?: { x: number; y: number }) => {
      const bounds = workspaceRef.current?.getBoundingClientRect() ?? null;
      const defaultPosition = getCenteredPosition(bounds, 420, 200, { x: 24, y: 24 });
      const id = `connection:${route.from.deviceId}:${route.from.channelIndex}->${route.to.deviceId}:${route.to.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
        }

        return [
          ...prev,
          { id, kind: 'connection', from: route.from, to: route.to, position: defaultPosition, zIndex: nextZ },
        ];
      });
    },
    [workspaceRef],
  );

  const openFilterWindow = useCallback(
    (channel: ChannelNode, filterType: FilterType, _point?: { x: number; y: number }) => {
      // Volume is edited inline on the channel card (no drawer/window).
      if (filterType === 'Volume') return;
      setDockedFilterEditor({
        side: channel.side,
        deviceId: channel.deviceId,
        channelIndex: channel.channelIndex,
        filterType,
      });
    },
    [],
  );

  const openChannelWindow = useCallback(
    (channel: ChannelNode, _point?: { x: number; y: number }) => {
      const bounds = workspaceRef.current?.getBoundingClientRect() ?? null;
      const defaultPosition: FloatingWindowPosition = getCenteredPosition(bounds, 460, 300, { x: 64, y: 64 });
      const id = `channel:${channel.side}:${channel.deviceId}:${channel.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
        }

        return [
          ...prev,
          {
            id,
            kind: 'channel',
            side: channel.side,
            deviceId: channel.deviceId,
            channelIndex: channel.channelIndex,
            position: defaultPosition,
            zIndex: nextZ,
          },
        ];
      });
    },
    [workspaceRef],
  );

  const openConnectionsWindow = useCallback(
    (channel: ChannelNode, _point?: { x: number; y: number }) => {
      const bounds = workspaceRef.current?.getBoundingClientRect() ?? null;
      const defaultPosition = getCenteredPosition(bounds, 400, 350, { x: 80, y: 80 });
      const id = `channel-connections:${channel.side}:${channel.deviceId}:${channel.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
        }

        return [
          ...prev,
          {
            id,
            kind: 'channel-connections',
            side: channel.side,
            deviceId: channel.deviceId,
            channelIndex: channel.channelIndex,
            position: defaultPosition,
            zIndex: nextZ,
          },
        ];
      });
    },
    [workspaceRef],
  );

  return {
    dockedFilterEditor,
    nextZIndexRef,
    openChannelWindow,
    openConnectionWindow,
    openConnectionsWindow,
    openFilterWindow,
    raiseWindow,
    setDockedFilterEditor,
    setWindows,
    windows,
  };
}
