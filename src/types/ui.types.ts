// UI State Types

export interface DSPUnit {
  id: string;
  name: string;
  address: string;
  port: number;
  zone?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UnitConnection {
  unitId: string;
  status: ConnectionStatus;
  version?: string;
  lastSeen?: number;
  error?: string;
}

export interface UIState {
  sidebarOpen: boolean;
  selectedUnitId: string | null;
  activeView: ViewType;
  selectedChannel: number | null;
  selectedFilter: string | null;
  modalOpen: ModalType | null;
}

export type ViewType =
  | 'dashboard'
  | 'channels'
  | 'eq'
  | 'routing'
  | 'settings';

export type ModalType =
  | 'addUnit'
  | 'editUnit'
  | 'filterEditor'
  | 'config'
  | 'about';

// EQ Editor state
export interface EQEditorState {
  selectedBand: number | null;
  isDragging: boolean;
  showAllBands: boolean;
}

// Routing Matrix state
export interface RoutingState {
  selectedCrosspoint: { input: number; output: number } | null;
}

// Theme
export type Theme = 'dark' | 'light';
