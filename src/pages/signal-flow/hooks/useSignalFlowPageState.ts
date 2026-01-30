import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { portKey } from '../../../lib/signalflow/endpointUtils';
import { useUnitLevels } from '../../../features/realtime';
import { useSignalFlowUiStore } from '../../../stores/signalFlowUiStore';
import { useSignalFlowUnits } from './useSignalFlowUnits';
import { useSignalFlowConfig } from './useSignalFlowConfig';
import { useSignalFlowWindows } from './useSignalFlowWindows';
import { useSignalFlowSelection } from './useSignalFlowSelection';
import { useSignalFlowModelState } from './useSignalFlowModelState';
import { useSignalFlowClipboard } from './useSignalFlowClipboard';
import { useSignalFlowDrag } from './useSignalFlowDrag';

export function useSignalFlowPageState() {
  const units = useSignalFlowUnits();
  const configState = useSignalFlowConfig(units.unitId);

  const clipboard = useSignalFlowUiStore((state) => state.clipboard);
  const setClipboard = useSignalFlowUiStore((state) => state.setClipboard);
  const localStoragePrefs = useSignalFlowUiStore((state) =>
    units.activeUnitId ? state.prefsByUnitId[units.activeUnitId] ?? null : null,
  );

  const { capture: captureLevels, playback: playbackLevels } = useUnitLevels(units.activeUnitId);

  const inputBankRef = useRef<HTMLElement | null>(null);
  const outputBankRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const scrollChannelIntoView = useCallback(
    (side: ChannelSide, endpoint: RouteEndpoint) => {
      const bankEl = side === 'input' ? inputBankRef.current : outputBankRef.current;
      if (!bankEl) return;

      const candidates = bankEl.querySelectorAll<HTMLElement>(
        `[data-port-side="${side}"][data-channel-index="${String(endpoint.channelIndex)}"]`,
      );
      const match = Array.from(candidates).find(
        (el) => el.getAttribute('data-device-id') === endpoint.deviceId,
      );
      match?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    [],
  );

  const windows = useSignalFlowWindows({ workspaceRef });
  const selection = useSignalFlowSelection(windows.setWindows);

  const model = useSignalFlowModelState({
    activeUnitId: units.activeUnitId,
    config: configState.config,
    flow: configState.flow,
    configRef: configState.configRef,
    flowRef: configState.flowRef,
    localStoragePrefs,
    setConfigJson: configState.setConfigJson,
    setDockedFilterEditor: windows.setDockedFilterEditor,
    setSelectedChannelKey: selection.setSelectedChannelKey,
    setSelectedRouteIndex: selection.setSelectedRouteIndex,
    setWindows: windows.setWindows,
  });

  const { copyClipboard, readClipboard } = useSignalFlowClipboard(clipboard, setClipboard);

  const drag = useSignalFlowDrag({
    canvasRef,
    addRoute: model.addRoute,
    openConnectionWindow: windows.openConnectionWindow,
  });

  const handleUpdateFilters = useCallback(
    (
      channel: ChannelNode,
      filters: ChannelNode['processing']['filters'],
      options?: { debounce?: boolean },
    ) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      selection.setSelectedChannelKey(portKey(channel.side, endpoint));
      scrollChannelIntoView(channel.side, endpoint);
      model.updateChannelFilters(channel.side, endpoint, filters, options);
    },
    [model, scrollChannelIntoView, selection],
  );

  const routeHighlightedChannelKeys = useMemo(() => {
    const activeRouteIndex = selection.selectedRouteIndex ?? selection.hoveredRouteIndex;
    if (activeRouteIndex === null) return new Set<string>();
    const route = model.routes[activeRouteIndex];
    if (!route) return new Set<string>();
    return new Set([
      portKey('input', route.from),
      portKey('output', route.to),
    ]);
  }, [model.routes, selection.hoveredRouteIndex, selection.selectedRouteIndex]);

  const [unitSelectorOpen, setUnitSelectorOpen] = useState(false);

  return {
    canvasRef,
    captureLevels,
    clipboard,
    configState,
    drag,
    handleUpdateFilters,
    inputBankRef,
    model,
    outputBankRef,
    playbackLevels,
    routeHighlightedChannelKeys,
    selection,
    setUnitSelectorOpen,
    unitSelectorOpen,
    units,
    windows,
    workspaceRef,
    copyClipboard,
    readClipboard,
    scrollChannelIntoView,
  };
}
