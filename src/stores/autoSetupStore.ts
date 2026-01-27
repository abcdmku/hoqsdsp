import { create } from 'zustand';

interface AutoSetupState {
  /** Unit ID that has a pending auto setup request */
  pendingUnitId: string | null;
  /** Request auto setup for a unit */
  requestAutoSetup: (unitId: string) => void;
  /** Clear the pending request */
  clearPendingRequest: () => void;
}

/**
 * Store for coordinating auto setup requests between the prompt hook
 * and components that can execute the setup.
 */
export const useAutoSetupStore = create<AutoSetupState>((set) => ({
  pendingUnitId: null,

  requestAutoSetup: (unitId: string) => {
    set({ pendingUnitId: unitId });
  },

  clearPendingRequest: () => {
    set({ pendingUnitId: null });
  },
}));
