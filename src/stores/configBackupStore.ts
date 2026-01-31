import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CamillaConfig } from '../types';

interface ConfigBackupEntry {
  config: CamillaConfig;
  savedAt: number;
}

interface ConfigBackupState {
  byUnitId: Record<string, ConfigBackupEntry>;
}

interface ConfigBackupActions {
  saveConfig: (unitId: string, config: CamillaConfig) => void;
  getConfig: (unitId: string) => CamillaConfig | null;
  clearConfig: (unitId: string) => void;
  clearAll: () => void;
}

type ConfigBackupStore = ConfigBackupState & ConfigBackupActions;

export const useConfigBackupStore = create<ConfigBackupStore>()(
  persist(
    (set, get) => ({
      byUnitId: {},

      saveConfig: (unitId, config) => {
        set((state) => ({
          byUnitId: {
            ...state.byUnitId,
            [unitId]: { config, savedAt: Date.now() },
          },
        }));
      },

      getConfig: (unitId) => get().byUnitId[unitId]?.config ?? null,

      clearConfig: (unitId) => {
        set((state) => {
          if (!state.byUnitId[unitId]) return state;
          const next = { ...state.byUnitId };
          delete next[unitId];
          return { byUnitId: next };
        });
      },

      clearAll: () => {
        set({ byUnitId: {} });
      },
    }),
    {
      name: 'camilladsp-config-backup',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ byUnitId: state.byUnitId }),
    },
  ),
);
