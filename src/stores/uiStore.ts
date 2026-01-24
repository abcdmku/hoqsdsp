import { create } from 'zustand';
import type { ViewType, ModalType, UIState } from '../types';

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: ViewType) => void;
  setSelectedChannel: (channel: number | null) => void;
  setSelectedFilter: (filter: string | null) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  selectedUnitId: null,
  activeView: 'dashboard',
  selectedChannel: null,
  selectedFilter: null,
  modalOpen: null,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setActiveView: (view) => {
    set({ activeView: view, selectedChannel: null, selectedFilter: null });
  },

  setSelectedChannel: (channel) => {
    set({ selectedChannel: channel });
  },

  setSelectedFilter: (filter) => {
    set({ selectedFilter: filter });
  },

  openModal: (modal) => {
    set({ modalOpen: modal });
  },

  closeModal: () => {
    set({ modalOpen: null });
  },
}));

// Selectors
export const selectSidebarOpen = (state: UIStore): boolean => state.sidebarOpen;
export const selectActiveView = (state: UIStore): ViewType => state.activeView;
export const selectModalOpen = (state: UIStore): ModalType | null => state.modalOpen;
