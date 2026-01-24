import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, selectSidebarOpen, selectActiveView, selectModalOpen } from './uiStore';
import type { ViewType, ModalType } from '../types';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      sidebarOpen: true,
      selectedUnitId: null,
      activeView: 'dashboard',
      selectedChannel: null,
      selectedFilter: null,
      modalOpen: null,
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();

      expect(state.sidebarOpen).toBe(true);
      expect(state.selectedUnitId).toBeNull();
      expect(state.activeView).toBe('dashboard');
      expect(state.selectedChannel).toBeNull();
      expect(state.selectedFilter).toBeNull();
      expect(state.modalOpen).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      const { toggleSidebar } = useUIStore.getState();

      toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const { setSidebarOpen, toggleSidebar } = useUIStore.getState();

      setSidebarOpen(false);
      toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should toggle multiple times', () => {
      const { toggleSidebar } = useUIStore.getState();

      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('setSidebarOpen', () => {
    it('should set sidebar to open', () => {
      const { setSidebarOpen } = useUIStore.getState();

      setSidebarOpen(true);

      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should set sidebar to closed', () => {
      const { setSidebarOpen } = useUIStore.getState();

      setSidebarOpen(false);

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('setActiveView', () => {
    it('should set the active view', () => {
      const { setActiveView } = useUIStore.getState();

      setActiveView('channels' as ViewType);

      expect(useUIStore.getState().activeView).toBe('channels');
    });

    it('should clear selectedChannel and selectedFilter when changing view', () => {
      const { setActiveView, setSelectedChannel, setSelectedFilter } = useUIStore.getState();

      setSelectedChannel(2);
      setSelectedFilter('filter1');

      setActiveView('eq' as ViewType);

      expect(useUIStore.getState().selectedChannel).toBeNull();
      expect(useUIStore.getState().selectedFilter).toBeNull();
    });

    it('should support all view types', () => {
      const { setActiveView } = useUIStore.getState();

      const views: ViewType[] = ['dashboard', 'channels', 'eq', 'routing', 'settings'];

      views.forEach(view => {
        setActiveView(view);
        expect(useUIStore.getState().activeView).toBe(view);
      });
    });
  });

  describe('setSelectedChannel', () => {
    it('should set the selected channel', () => {
      const { setSelectedChannel } = useUIStore.getState();

      setSelectedChannel(5);

      expect(useUIStore.getState().selectedChannel).toBe(5);
    });

    it('should allow setting to null', () => {
      const { setSelectedChannel } = useUIStore.getState();

      setSelectedChannel(5);
      setSelectedChannel(null);

      expect(useUIStore.getState().selectedChannel).toBeNull();
    });
  });

  describe('setSelectedFilter', () => {
    it('should set the selected filter', () => {
      const { setSelectedFilter } = useUIStore.getState();

      setSelectedFilter('highpass');

      expect(useUIStore.getState().selectedFilter).toBe('highpass');
    });

    it('should allow setting to null', () => {
      const { setSelectedFilter } = useUIStore.getState();

      setSelectedFilter('highpass');
      setSelectedFilter(null);

      expect(useUIStore.getState().selectedFilter).toBeNull();
    });
  });

  describe('openModal', () => {
    it('should open a modal', () => {
      const { openModal } = useUIStore.getState();

      openModal('addUnit' as ModalType);

      expect(useUIStore.getState().modalOpen).toBe('addUnit');
    });

    it('should support all modal types', () => {
      const { openModal } = useUIStore.getState();

      const modals: ModalType[] = ['addUnit', 'editUnit', 'filterEditor', 'config', 'about'];

      modals.forEach(modal => {
        openModal(modal);
        expect(useUIStore.getState().modalOpen).toBe(modal);
      });
    });
  });

  describe('closeModal', () => {
    it('should close an open modal', () => {
      const { openModal, closeModal } = useUIStore.getState();

      openModal('addUnit' as ModalType);
      closeModal();

      expect(useUIStore.getState().modalOpen).toBeNull();
    });

    it('should handle closing when no modal is open', () => {
      const { closeModal } = useUIStore.getState();

      closeModal();

      expect(useUIStore.getState().modalOpen).toBeNull();
    });
  });

  describe('selectors', () => {
    it('selectSidebarOpen should return sidebar state', () => {
      const { setSidebarOpen } = useUIStore.getState();

      setSidebarOpen(true);
      let state = useUIStore.getState();
      expect(selectSidebarOpen(state)).toBe(true);

      setSidebarOpen(false);
      state = useUIStore.getState();
      expect(selectSidebarOpen(state)).toBe(false);
    });

    it('selectActiveView should return active view', () => {
      const { setActiveView } = useUIStore.getState();

      setActiveView('channels' as ViewType);
      const state = useUIStore.getState();

      expect(selectActiveView(state)).toBe('channels');
    });

    it('selectModalOpen should return modal state', () => {
      const { openModal, closeModal } = useUIStore.getState();

      openModal('addUnit' as ModalType);
      let state = useUIStore.getState();
      expect(selectModalOpen(state)).toBe('addUnit');

      closeModal();
      state = useUIStore.getState();
      expect(selectModalOpen(state)).toBeNull();
    });
  });

  describe('combined operations', () => {
    it('should handle multiple state changes', () => {
      const { setSidebarOpen, setActiveView, setSelectedChannel, openModal } = useUIStore.getState();

      setSidebarOpen(false);
      setActiveView('channels' as ViewType);
      setSelectedChannel(3);
      openModal('filterEditor' as ModalType);

      const state = useUIStore.getState();

      expect(state.sidebarOpen).toBe(false);
      expect(state.activeView).toBe('channels');
      expect(state.selectedChannel).toBe(3);
      expect(state.modalOpen).toBe('filterEditor');
    });

    it('should clear selection when changing views', () => {
      const { setActiveView, setSelectedChannel, setSelectedFilter } = useUIStore.getState();

      setActiveView('channels' as ViewType);
      setSelectedChannel(2);
      setSelectedFilter('eq1');

      setActiveView('dashboard' as ViewType);

      const state = useUIStore.getState();
      expect(state.activeView).toBe('dashboard');
      expect(state.selectedChannel).toBeNull();
      expect(state.selectedFilter).toBeNull();
    });
  });
});
