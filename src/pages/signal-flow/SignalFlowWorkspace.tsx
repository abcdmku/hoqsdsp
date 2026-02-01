import type { Dispatch, MutableRefObject, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from 'react';
import type { ChannelNode, ChannelSide, DeviceGroup, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import type { DragState } from '../../components/signal-flow/ConnectionsCanvas';
import type { SignalFlowClipboardPayload, SignalFlowMirrorGroups } from '../../stores/signalFlowUiStore';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1 } from '../../types';
import type { FilterType } from '../../types';
import type { ChannelLevelState } from '../../features/realtime';
import { SignalFlowWindows } from './windows/SignalFlowWindows';
import type { SignalFlowWindow } from './windows/types';
import { SignalFlowBanks } from './SignalFlowBanks';

interface SignalFlowWorkspaceProps {
  addRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  canvasRef: RefObject<HTMLElement | null>;
  channelColors: Record<string, string>;
  clipboard: SignalFlowClipboardPayload | null;
  copyClipboard: (payload: SignalFlowClipboardPayload) => Promise<void>;
  connectionCounts: Record<string, number>;
  dragState: DragState | null;
  firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>;
  deq: Record<string, DeqBandUiSettingsV1>;
  handleSetChannelColor: (key: string, color: string) => void;
  handleSetMirrorGroup: (side: ChannelSide, members: RouteEndpoint[]) => void;
  handlePersistFirPhaseCorrectionSettings: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  handlePersistDeqSettings: (filterName: string, settings: DeqBandUiSettingsV1 | null) => void;
  highlightedPortKey: string | null;
  inputBankRef: RefObject<HTMLElement | null>;
  inputGroups: DeviceGroup[];
  inputs: ChannelNode[];
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  mirrorGroups: SignalFlowMirrorGroups;
  onClearSelection: () => void;
  onPortPointerDown: (side: 'input' | 'output', endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelectChannel: (side: ChannelSide, channel: ChannelNode) => void;
  onUpdateFilters: (
    channel: ChannelNode,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
  openChannelWindow: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  openConnectionWindow: (route: RouteEdge, point?: { x: number; y: number }) => void;
  openConnectionsWindow: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  openFilterWindow: (channel: ChannelNode, filterType: FilterType, point?: { x: number; y: number }) => void;
  outputBankRef: RefObject<HTMLElement | null>;
  outputGroups: DeviceGroup[];
  outputs: ChannelNode[];
  readClipboard: () => Promise<SignalFlowClipboardPayload | null>;
  routeHighlightedKeys: Set<string>;
  routes: RouteEdge[];
  sampleRate: number;
  selectedChannelKey: string | null;
  selectedRouteIndex: number | null;
  setHoveredRouteIndex: (index: number | null) => void;
  setSelectedChannelKey: (key: string | null) => void;
  setSelectedRouteIndex: (index: number | null) => void;
  setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>;
  updateChannelFilters: (
    side: ChannelSide,
    endpoint: RouteEndpoint,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
  updateRoute: (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  deleteRoute: (index: number) => void;
  windows: SignalFlowWindow[];
  workspaceRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  nextZIndexRef: MutableRefObject<number>;
  channelLevels: {
    capture: ChannelLevelState[];
    playback: ChannelLevelState[];
  };
  onColorChange: (side: ChannelSide, channel: ChannelNode, color: string) => void;
  onLabelChange: (side: ChannelSide, channel: ChannelNode, label: string) => void;
}

export function SignalFlowWorkspace({
  addRoute,
  canvasRef,
  channelColors,
  clipboard,
  connectionCounts,
  dragState,
  firPhaseCorrection,
  deq,
  handleSetChannelColor,
  handleSetMirrorGroup,
  handlePersistFirPhaseCorrectionSettings,
  handlePersistDeqSettings,
  highlightedPortKey,
  inputBankRef,
  inputGroups,
  inputs,
  labelFor,
  mirrorGroups,
  onClearSelection,
  onPortPointerDown,
  onSelectChannel,
  onUpdateFilters,
  openChannelWindow,
  openConnectionWindow,
  openConnectionsWindow,
  openFilterWindow,
  outputBankRef,
  outputGroups,
  outputs,
  copyClipboard,
  readClipboard,
  routeHighlightedKeys,
  routes,
  sampleRate,
  selectedChannelKey,
  selectedRouteIndex,
  setHoveredRouteIndex,
  setSelectedChannelKey,
  setSelectedRouteIndex,
  setWindows,
  updateChannelFilters,
  updateRoute,
  deleteRoute,
  windows,
  workspaceRef,
  scrollContainerRef,
  nextZIndexRef,
  channelLevels,
  onColorChange,
  onLabelChange,
}: SignalFlowWorkspaceProps) {
  return (
    <div ref={workspaceRef} className="relative flex flex-1 flex-col overflow-hidden">
      <SignalFlowBanks
        canvasRef={canvasRef}
        channelColors={channelColors}
        channelLevels={channelLevels}
        connectionCounts={connectionCounts}
        dragState={dragState}
        highlightedPortKey={highlightedPortKey}
        inputBankRef={inputBankRef}
        scrollContainerRef={scrollContainerRef}
        inputGroups={inputGroups}
        inputs={inputs}
        onClearSelection={onClearSelection}
        onColorChange={onColorChange}
        onLabelChange={onLabelChange}
        onOpenChannelSettings={openChannelWindow}
        onOpenConnections={openConnectionsWindow}
        onOpenFilter={openFilterWindow}
        onPortPointerDown={onPortPointerDown}
        onSelectChannel={onSelectChannel}
        onUpdateFilters={onUpdateFilters}
        openConnectionWindow={openConnectionWindow}
        outputBankRef={outputBankRef}
        outputGroups={outputGroups}
        outputs={outputs}
        routeHighlightedKeys={routeHighlightedKeys}
        routes={routes}
        sampleRate={sampleRate}
        selectedChannelKey={selectedChannelKey}
        selectedRouteIndex={selectedRouteIndex}
        setHoveredRouteIndex={setHoveredRouteIndex}
        setSelectedChannelKey={setSelectedChannelKey}
        setSelectedRouteIndex={setSelectedRouteIndex}
      />

      <SignalFlowWindows
        windows={windows}
        routes={routes}
        inputs={inputs}
        outputs={outputs}
        clipboard={clipboard}
        sampleRate={sampleRate}
        workspaceRef={workspaceRef}
        channelColors={channelColors}
        mirrorGroups={mirrorGroups}
        firPhaseCorrection={firPhaseCorrection}
        deq={deq}
        labelFor={labelFor}
        copyClipboard={copyClipboard}
        readClipboard={readClipboard}
        updateRoute={updateRoute}
        deleteRoute={deleteRoute}
        addRoute={addRoute}
        updateChannelFilters={updateChannelFilters}
        handleSetChannelColor={handleSetChannelColor}
        handleSetMirrorGroup={handleSetMirrorGroup}
        handlePersistFirPhaseCorrectionSettings={handlePersistFirPhaseCorrectionSettings}
        handlePersistDeqSettings={handlePersistDeqSettings}
        setWindows={setWindows}
        setSelectedRouteIndex={setSelectedRouteIndex}
        setSelectedChannelKey={setSelectedChannelKey}
        nextZIndexRef={nextZIndexRef}
      />
    </div>
  );
}
