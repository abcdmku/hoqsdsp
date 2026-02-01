import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { ChannelNode, ChannelSide, DeviceGroup, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import type { FilterType } from '../../types';
import type { DragState } from '../../components/signal-flow/ConnectionsCanvas';
import { ChannelBank } from '../../components/signal-flow/ChannelBank';
import { ConnectionsCanvas } from '../../components/signal-flow/ConnectionsCanvas';
import type { ChannelLevelState } from '../../features/realtime';

interface SignalFlowBanksProps {
  canvasRef: RefObject<HTMLElement | null>;
  channelColors: Record<string, string>;
  channelLevels: {
    capture: ChannelLevelState[];
    playback: ChannelLevelState[];
  };
  connectionCounts: Record<string, number>;
  dragState: DragState | null;
  highlightedPortKey: string | null;
  inputBankRef: RefObject<HTMLElement | null>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  inputGroups: DeviceGroup[];
  inputs: ChannelNode[];
  onClearSelection: () => void;
  onColorChange: (side: ChannelSide, channel: ChannelNode, color: string) => void;
  onLabelChange: (side: ChannelSide, channel: ChannelNode, label: string) => void;
  onOpenChannelSettings: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  onOpenConnections: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  onOpenFilter: (channel: ChannelNode, filterType: FilterType, point?: { x: number; y: number }) => void;
  onPortPointerDown: (side: 'input' | 'output', endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelectChannel: (side: ChannelSide, channel: ChannelNode) => void;
  onUpdateFilters: (
    channel: ChannelNode,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
  openConnectionWindow: (route: RouteEdge, point?: { x: number; y: number }) => void;
  outputBankRef: RefObject<HTMLElement | null>;
  outputGroups: DeviceGroup[];
  outputs: ChannelNode[];
  routeHighlightedKeys: Set<string>;
  routes: RouteEdge[];
  sampleRate: number;
  selectedChannelKey: string | null;
  selectedRouteIndex: number | null;
  setHoveredRouteIndex: (index: number | null) => void;
  setSelectedChannelKey: (key: string | null) => void;
  setSelectedRouteIndex: (index: number | null) => void;
}

export function SignalFlowBanks({
  canvasRef,
  channelColors,
  channelLevels,
  connectionCounts,
  dragState,
  highlightedPortKey,
  inputBankRef,
  scrollContainerRef,
  inputGroups,
  inputs,
  onClearSelection,
  onColorChange,
  onLabelChange,
  onOpenChannelSettings,
  onOpenConnections,
  onOpenFilter,
  onPortPointerDown,
  onSelectChannel,
  onUpdateFilters,
  openConnectionWindow,
  outputBankRef,
  outputGroups,
  outputs,
  routeHighlightedKeys,
  routes,
  sampleRate,
  selectedChannelKey,
  selectedRouteIndex,
  setHoveredRouteIndex,
  setSelectedChannelKey,
  setSelectedRouteIndex,
}: SignalFlowBanksProps) {
  return (
    <div
      className="relative flex flex-1 overflow-hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClearSelection();
        }
      }}
    >
      <ChannelBank
        title="Inputs"
        side="input"
        groups={inputGroups}
        channels={inputs}
        selectedChannelKey={selectedChannelKey}
        highlightedPortKey={highlightedPortKey}
        routeHighlightedKeys={routeHighlightedKeys}
        channelColors={channelColors}
        connectionCounts={connectionCounts}
        sampleRate={sampleRate}
        channelLevels={channelLevels.capture}
        containerRef={inputBankRef}
        onUpdateFilters={onUpdateFilters}
        onOpenFilter={onOpenFilter}
        onOpenChannelSettings={onOpenChannelSettings}
        onColorChange={(channel, color) => onColorChange('input', channel, color)}
        onLabelChange={(channel, label) => onLabelChange('input', channel, label)}
        onOpenConnections={onOpenConnections}
        onSelectChannel={(channel) => onSelectChannel('input', channel)}
        onPortPointerDown={onPortPointerDown}
        onClearSelection={onClearSelection}
      />

      <ConnectionsCanvas
        canvasRef={canvasRef}
        inputBankRef={inputBankRef}
        outputBankRef={outputBankRef}
        scrollContainerRef={scrollContainerRef}
        inputs={inputs}
        outputs={outputs}
        routes={routes}
        inputPortColors={channelColors}
        dragState={dragState}
        selectedRouteIndex={selectedRouteIndex}
        onSelectRoute={setSelectedRouteIndex}
        onRouteActivate={(index, point) => {
          const route = routes[index];
          if (!route) return;
          openConnectionWindow(route, point);
        }}
        onRouteHover={setHoveredRouteIndex}
        onClearSelection={() => {
          setSelectedChannelKey(null);
        }}
      />

      <ChannelBank
        title="Outputs"
        side="output"
        groups={outputGroups}
        channels={outputs}
        selectedChannelKey={selectedChannelKey}
        highlightedPortKey={highlightedPortKey}
        routeHighlightedKeys={routeHighlightedKeys}
        channelColors={channelColors}
        connectionCounts={connectionCounts}
        sampleRate={sampleRate}
        channelLevels={channelLevels.playback}
        containerRef={outputBankRef}
        onUpdateFilters={onUpdateFilters}
        onOpenFilter={onOpenFilter}
        onOpenChannelSettings={onOpenChannelSettings}
        onColorChange={(channel, color) => onColorChange('output', channel, color)}
        onLabelChange={(channel, label) => onLabelChange('output', channel, label)}
        onOpenConnections={onOpenConnections}
        onSelectChannel={(channel) => onSelectChannel('output', channel)}
        onPortPointerDown={onPortPointerDown}
        onClearSelection={onClearSelection}
      />
    </div>
  );
}
