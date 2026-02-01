import type { RefObject } from 'react';
import type { ChannelNode, ChannelSide, RouteEdge, RouteEndpoint } from '../../../lib/signalflow';
import { FloatingWindow } from '../../../components/signal-flow/FloatingWindow';
import { ChannelConnectionsWindowContent } from '../../../components/signal-flow/ChannelConnectionsWindowContent';
import type { ChannelConnectionsWindow as ChannelConnectionsWindowType } from './types';

interface SignalFlowChannelConnectionsWindowProps {
  window: ChannelConnectionsWindowType;
  routes: RouteEdge[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  workspaceRef: RefObject<HTMLDivElement | null>;
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  addRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  updateRoute: (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  deleteRoute: (routeIndex: number) => void;
  onMove: (position: ChannelConnectionsWindowType['position']) => void;
  onRequestClose: () => void;
  onRequestFocus: () => void;
}

export function SignalFlowChannelConnectionsWindow({
  window,
  routes,
  inputs,
  outputs,
  workspaceRef,
  labelFor,
  addRoute,
  updateRoute,
  deleteRoute,
  onMove,
  onRequestClose,
  onRequestFocus,
}: SignalFlowChannelConnectionsWindowProps) {
  const endpoint = { deviceId: window.deviceId, channelIndex: window.channelIndex };
  const nodes = window.side === 'input' ? inputs : outputs;
  const node = nodes.find(
    (candidate) => candidate.deviceId === window.deviceId && candidate.channelIndex === window.channelIndex,
  );
  if (!node) return null;

  return (
    <FloatingWindow
      id={window.id}
      title={`${labelFor(window.side, endpoint)} Connections`}
      position={window.position}
      zIndex={window.zIndex}
      boundsRef={workspaceRef}
      onMove={onMove}
      onRequestClose={onRequestClose}
      onRequestFocus={onRequestFocus}
      className="w-[400px]"
    >
      <ChannelConnectionsWindowContent
        node={node}
        side={window.side}
        routes={routes}
        allInputs={inputs}
        allOutputs={outputs}
        onAddRoute={(from, to) => {
          addRoute(from, to);
        }}
        onUpdateRoute={(routeIndex, updates, options) => {
          updateRoute(routeIndex, updates, options);
        }}
        onDeleteRoute={(routeIndex) => {
          deleteRoute(routeIndex);
        }}
      />
    </FloatingWindow>
  );
}
