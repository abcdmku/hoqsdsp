import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ChannelNode, ChannelSide, RouteEdge, RouteEndpoint } from '../../../lib/signalflow';
import type { FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import type { SignalFlowClipboardPayload, SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';
import type { FilterType } from '../../../types';
import type { FloatingWindowPosition } from '../../../components/signal-flow/FloatingWindow';

export interface ConnectionWindow {
  id: string;
  kind: 'connection';
  from: RouteEndpoint;
  to: RouteEndpoint;
  position: FloatingWindowPosition;
  zIndex: number;
}

export interface FilterWindow {
  id: string;
  kind: 'filter';
  side: ChannelSide;
  deviceId: string;
  channelIndex: number;
  filterType: FilterType;
  position: FloatingWindowPosition;
  zIndex: number;
}

export interface DockedFilterEditorState {
  side: ChannelSide;
  deviceId: string;
  channelIndex: number;
  filterType: FilterType;
}

export interface ChannelWindow {
  id: string;
  kind: 'channel';
  side: ChannelSide;
  deviceId: string;
  channelIndex: number;
  position: FloatingWindowPosition;
  zIndex: number;
}

export interface ChannelConnectionsWindow {
  id: string;
  kind: 'channel-connections';
  side: ChannelSide;
  deviceId: string;
  channelIndex: number;
  position: FloatingWindowPosition;
  zIndex: number;
}

export type SignalFlowWindow =
  | ConnectionWindow
  | FilterWindow
  | ChannelWindow
  | ChannelConnectionsWindow;

export interface SignalFlowWindowsProps {
  windows: SignalFlowWindow[];
  routes: RouteEdge[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  clipboard: SignalFlowClipboardPayload | null;
  sampleRate: number;
  workspaceRef: RefObject<HTMLDivElement | null>;
  channelColors: Record<string, string>;
  mirrorGroups: SignalFlowMirrorGroups;
  firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>;
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  copyClipboard: (payload: SignalFlowClipboardPayload) => Promise<void>;
  readClipboard: () => Promise<SignalFlowClipboardPayload | null>;
  updateRoute: (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  deleteRoute: (index: number) => void;
  addRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  openConnectionWindow: (route: RouteEdge) => void;
  updateChannelFilters: (
    side: ChannelSide,
    endpoint: RouteEndpoint,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
  handleSetChannelColor: (key: string, color: string) => void;
  handleSetMirrorGroup: (side: ChannelSide, members: RouteEndpoint[]) => void;
  handlePersistFirPhaseCorrectionSettings: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>;
  setSelectedRouteIndex: Dispatch<SetStateAction<number | null>>;
  setSelectedChannelKey: Dispatch<SetStateAction<string | null>>;
  nextZIndexRef: MutableRefObject<number>;
}
