import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChannelSide, ChannelProcessingFilter, RouteEndpoint, RouteEdge } from '../lib/signalflow';
import type { FilterConfig, FilterType } from '../types';

export type SignalFlowClipboardPayload =
  | {
      kind: 'route';
      data: Pick<RouteEdge, 'gain' | 'inverted' | 'mute'>;
    }
  | {
      kind: 'filter';
      data: { filterType: FilterType; config: FilterConfig } | { filterType: 'Biquad'; bands: ChannelProcessingFilter[] };
    }
  | {
      kind: 'channel';
      data: { filters: ChannelProcessingFilter[] };
    };

export interface SignalFlowMirrorGroups {
  input: RouteEndpoint[][];
  output: RouteEndpoint[][];
}

/**
 * @deprecated UI preferences are now stored in the server config.ui.signalFlow.
 * This type is kept for localStorage migration only.
 */
export interface UnitSignalFlowPrefs {
  channelColors: Record<string, string>;
  mirrorGroups: SignalFlowMirrorGroups;
}

interface SignalFlowUiState {
  /**
   * @deprecated UI preferences are now stored in config.ui.signalFlow.
   * This field is kept for localStorage migration only.
   */
  prefsByUnitId: Record<string, UnitSignalFlowPrefs>;
  clipboard: SignalFlowClipboardPayload | null;
  selectedUnitIds: string[];
}

interface SignalFlowUiActions {
  /** @deprecated Use local state in SignalFlow.tsx instead */
  ensureUnit: (unitId: string) => void;
  /** @deprecated Use local state in SignalFlow.tsx instead */
  ensureChannelColors: (unitId: string, keys: string[]) => void;
  /** @deprecated Use handleSetChannelColor in SignalFlow.tsx instead */
  setChannelColor: (unitId: string, key: string, color: string) => void;
  /** @deprecated Use handleSetMirrorGroup in SignalFlow.tsx instead */
  setMirrorGroup: (unitId: string, side: ChannelSide, members: RouteEndpoint[]) => void;
  setClipboard: (payload: SignalFlowClipboardPayload | null) => void;
  setSelectedUnitIds: (unitIds: string[]) => void;
  toggleSelectedUnit: (unitId: string) => void;
}

type SignalFlowUiStore = SignalFlowUiState & SignalFlowUiActions;

function defaultPrefs(): UnitSignalFlowPrefs {
  return {
    channelColors: {},
    mirrorGroups: { input: [], output: [] },
  };
}

function sameEndpoint(a: RouteEndpoint, b: RouteEndpoint): boolean {
  return a.deviceId === b.deviceId && a.channelIndex === b.channelIndex;
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number): string => {
    const v = Math.round((n + m) * 255);
    return v.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function defaultColorForKey(key: string): string {
  const hue = hashString(key) % 360;
  return hslToHex(hue, 75, 55);
}

export const useSignalFlowUiStore = create<SignalFlowUiStore>()(
  persist(
    (set) => ({
      prefsByUnitId: {},
      clipboard: null,
      selectedUnitIds: [],

      ensureUnit: (unitId) => {
        set((state) => {
          if (state.prefsByUnitId[unitId]) return state;
          return {
            ...state,
            prefsByUnitId: { ...state.prefsByUnitId, [unitId]: defaultPrefs() },
          };
        });
      },

      ensureChannelColors: (unitId, keys) => {
        set((state) => {
          const prefs = state.prefsByUnitId[unitId] ?? defaultPrefs();
          const nextColors = { ...prefs.channelColors };
          let changed = false;

          for (const key of keys) {
            if (!nextColors[key]) {
              nextColors[key] = defaultColorForKey(`${unitId}:${key}`);
              changed = true;
            }
          }

          if (!changed) return state;
          return {
            ...state,
            prefsByUnitId: {
              ...state.prefsByUnitId,
              [unitId]: { ...prefs, channelColors: nextColors },
            },
          };
        });
      },

      setChannelColor: (unitId, key, color) => {
        set((state) => {
          const prefs = state.prefsByUnitId[unitId] ?? defaultPrefs();
          return {
            ...state,
            prefsByUnitId: {
              ...state.prefsByUnitId,
              [unitId]: {
                ...prefs,
                channelColors: {
                  ...prefs.channelColors,
                  [key]: normalizeHexColor(color),
                },
              },
            },
          };
        });
      },

      setMirrorGroup: (unitId, side, members) => {
        set((state) => {
          const prefs = state.prefsByUnitId[unitId] ?? defaultPrefs();
          const uniqueMembers = members.filter(
            (candidate, idx) => members.findIndex((m) => sameEndpoint(m, candidate)) === idx,
          );

          const existingGroups = prefs.mirrorGroups[side] ?? [];
          const nextGroups: RouteEndpoint[][] = [];

          // Remove these members from any existing groups
          for (const group of existingGroups) {
            const remaining = group.filter(
              (member) => !uniqueMembers.some((m) => sameEndpoint(m, member)),
            );
            if (remaining.length >= 2) nextGroups.push(remaining);
          }

          // Add new group if needed
          if (uniqueMembers.length >= 2) {
            nextGroups.push(uniqueMembers);
          }

          return {
            ...state,
            prefsByUnitId: {
              ...state.prefsByUnitId,
              [unitId]: {
                ...prefs,
                mirrorGroups: { ...prefs.mirrorGroups, [side]: nextGroups },
              },
            },
          };
        });
      },

      setClipboard: (payload) => {
        set({ clipboard: payload });
      },

      setSelectedUnitIds: (unitIds) => {
        set({ selectedUnitIds: unitIds });
      },

      toggleSelectedUnit: (unitId) => {
        set((state) => {
          const isSelected = state.selectedUnitIds.includes(unitId);
          if (isSelected) {
            return { selectedUnitIds: state.selectedUnitIds.filter((id) => id !== unitId) };
          }
          return { selectedUnitIds: [...state.selectedUnitIds, unitId] };
        });
      },
    }),
    {
      name: 'camilladsp-signalflow-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ prefsByUnitId: state.prefsByUnitId, selectedUnitIds: state.selectedUnitIds }),
    },
  ),
);
