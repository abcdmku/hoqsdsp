import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DSPUnit } from '../types';

interface UnitState {
  units: DSPUnit[];
}

interface UnitActions {
  addUnit: (unit: Omit<DSPUnit, 'id'>) => string;
  removeUnit: (id: string) => void;
  updateUnit: (id: string, updates: Partial<DSPUnit>) => void;
  getUnit: (id: string) => DSPUnit | undefined;
  getUnitsByZone: (zone: string) => DSPUnit[];
}

type UnitStore = UnitState & UnitActions;

const generateId = (): string => {
  return `unit_${Date.now().toString()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useUnitStore = create<UnitStore>()(
  persist(
    (set, get) => ({
      units: [],

      addUnit: (unit) => {
        const id = generateId();
        const newUnit: DSPUnit = { ...unit, id };
        set((state) => ({
          units: [...state.units, newUnit],
        }));
        return id;
      },

      removeUnit: (id) => {
        set((state) => ({
          units: state.units.filter((u) => u.id !== id),
        }));
      },

      updateUnit: (id, updates) => {
        set((state) => ({
          units: state.units.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        }));
      },

      getUnit: (id) => {
        return get().units.find((u) => u.id === id);
      },

      getUnitsByZone: (zone) => {
        return get().units.filter((u) => u.zone === zone);
      },
    }),
    {
      name: 'camilladsp-units',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selectors
export const selectUnits = (state: UnitStore): DSPUnit[] => state.units;

export const selectUnitById = (id: string) => (state: UnitStore): DSPUnit | undefined =>
  state.units.find(u => u.id === id);

let cachedZones: string[] = [];
let cachedUnitIds: (string | undefined)[] = [];

export const selectZones = (state: UnitStore): string[] => {
  const currentUnitIds = state.units.map(u => u.zone);

  if (cachedUnitIds.length !== currentUnitIds.length ||
      !cachedUnitIds.every((id, i) => id === currentUnitIds[i])) {
    const zones = new Set(currentUnitIds.filter((z): z is string => !!z));
    cachedZones = Array.from(zones);
    cachedUnitIds = currentUnitIds;
  }

  return cachedZones;
};
