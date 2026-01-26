import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share2, Copy, ClipboardPaste, ChevronDown, Check, X } from 'lucide-react';
import { useConnectionStore, selectAllConnections } from '../stores/connectionStore';
import { useUnitStore } from '../stores/unitStore';
import { useSignalFlowUiStore, type SignalFlowClipboardPayload, type SignalFlowMirrorGroups } from '../stores/signalFlowUiStore';
import type { SignalFlowUiMetadata } from '../types';
import { useConfigJson } from '../features/configuration/configQueries';
import { useSetConfigJson } from '../features/configuration';
import { useUnitLevels } from '../features/realtime';
import { showToast } from '../components/feedback';
import { validateConfig } from '../lib/config';
import { fromConfig, processingSummaryFromFilters, toConfig, type RouteEdge, type RouteEndpoint } from '../lib/signalflow';
import type { ChannelNode, ChannelSide } from '../lib/signalflow';
import type { FilterType } from '../types';
import { ChannelBank } from '../components/signal-flow/ChannelBank';
import { ConnectionsCanvas, type DragState } from '../components/signal-flow/ConnectionsCanvas';
import { ConnectionEditor } from '../components/signal-flow/ConnectionEditor';
import { FloatingWindow, type FloatingWindowPosition } from '../components/signal-flow/FloatingWindow';
import { SignalFlowFilterWindowContent } from '../components/signal-flow/SignalFlowFilterWindowContent';
import { FILTER_UI } from '../components/signal-flow/filterUi';
import { Button } from '../components/ui/Button';
import { parseSignalFlowClipboard, serializeSignalFlowClipboard } from '../lib/signalflow/uiClipboard';
import { SignalFlowChannelWindowContent } from '../components/signal-flow/SignalFlowChannelWindowContent';
import { ChannelConnectionsWindowContent } from '../components/signal-flow/ChannelConnectionsWindowContent';

function portKey(side: 'input' | 'output', endpoint: RouteEndpoint): string {
  return `${side}:${endpoint.deviceId}:${endpoint.channelIndex}`;
}

function endpointFromPortElement(element: Element | null): { side: 'input' | 'output'; endpoint: RouteEndpoint } | null {
  if (!element) return null;
  const portElement = element.closest<HTMLElement>('[data-port-side][data-device-id][data-channel-index]');
  if (!portElement) return null;

  const side = portElement.getAttribute('data-port-side');
  const deviceId = portElement.getAttribute('data-device-id');
  const channelIndexRaw = portElement.getAttribute('data-channel-index');
  if (side !== 'input' && side !== 'output') return null;
  if (!deviceId || channelIndexRaw === null) return null;

  const channelIndex = Number(channelIndexRaw);
  if (!Number.isFinite(channelIndex)) return null;
  return { side, endpoint: { deviceId, channelIndex } };
}

function sameEndpoint(a: RouteEndpoint, b: RouteEndpoint): boolean {
  return a.deviceId === b.deviceId && a.channelIndex === b.channelIndex;
}

function endpointKey(endpoint: RouteEndpoint): string {
  return `${endpoint.deviceId}\u0000${String(endpoint.channelIndex)}`;
}

function ensureUniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let attempt = 1;
  while (taken.has(`${base}-${String(attempt)}`)) {
    attempt += 1;
  }
  return `${base}-${String(attempt)}`;
}

function getBiquadBlock(filters: { config: { type: string } }[]): { start: number; end: number } | null {
  const indices: number[] = [];
  for (let i = 0; i < filters.length; i++) {
    if (filters[i]?.config.type === 'Biquad') indices.push(i);
  }
  return indices.length > 0 ? { start: indices[0]!, end: indices[indices.length - 1]! } : null;
}

function replaceBiquadBlock<T extends { config: { type: string } }>(
  filters: T[],
  biquads: T[],
): T[] {
  const block = getBiquadBlock(filters);
  if (!block) return [...filters, ...biquads];
  return [...filters.slice(0, block.start), ...biquads, ...filters.slice(block.end + 1)];
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

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

export function SignalFlowPage() {
  const allConnections = useConnectionStore(selectAllConnections);
  const connectedUnits = useMemo(
    () => allConnections.filter((conn) => conn.status === 'connected'),
    [allConnections],
  );

  const selectedUnitIds = useSignalFlowUiStore((state) => state.selectedUnitIds);
  const setSelectedUnitIds = useSignalFlowUiStore((state) => state.setSelectedUnitIds);
  const toggleSelectedUnit = useSignalFlowUiStore((state) => state.toggleSelectedUnit);

  // Determine effective selected units - if none selected, default to all connected
  const effectiveSelectedIds = useMemo(() => {
    if (selectedUnitIds.length === 0) {
      return connectedUnits.map((u) => u.unitId);
    }
    // Filter to only currently connected units
    const connectedIds = new Set(connectedUnits.map((u) => u.unitId));
    return selectedUnitIds.filter((id) => connectedIds.has(id));
  }, [selectedUnitIds, connectedUnits]);

  // For now, use the first selected unit for the main display
  const activeUnitId = effectiveSelectedIds[0] ?? null;
  const unitId = activeUnitId ?? '__no-unit__';

  const [unitSelectorOpen, setUnitSelectorOpen] = useState(false);

  // Clipboard is still stored in the UI store (no need to sync to server)
  const clipboard = useSignalFlowUiStore((state) => state.clipboard);
  const setClipboard = useSignalFlowUiStore((state) => state.setClipboard);

  // Local state for UI metadata (synced to server via config.ui.signalFlow)
  const [channelColors, setChannelColors] = useState<Record<string, string>>({});
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
  const [mirrorGroups, setMirrorGroups] = useState<SignalFlowMirrorGroups>({ input: [], output: [] });

  // Track if we've already migrated from localStorage for this unit
  const migratedRef = useRef<Set<string>>(new Set());

  // Get localStorage prefs for migration (read-only, will be removed later)
  const localStoragePrefs = useSignalFlowUiStore((state) =>
    activeUnitId ? state.prefsByUnitId[activeUnitId] ?? null : null
  );

  // Get real-time signal levels for the active unit
  const { capture: captureLevels, playback: playbackLevels } = useUnitLevels(activeUnitId);

  // Get unit store for user-defined names
  const getUnit = useUnitStore((state) => state.getUnit);
  const getUnitName = useCallback((id: string): string => {
    const unit = getUnit(id);
    return unit?.name ?? id;
  }, [getUnit]);

  const {
    data: config,
    isLoading,
    error,
  } = useConfigJson(unitId);

  const flow = useMemo(() => {
    if (!config) return null;
    return fromConfig(config);
  }, [config]);

  const inputBankRef = useRef<HTMLElement | null>(null);
  const outputBankRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const scrollChannelIntoView = useCallback(
    (side: ChannelSide, endpoint: RouteEndpoint) => {
      const bankEl = side === 'input' ? inputBankRef.current : outputBankRef.current;
      if (!bankEl) return;

      const candidates = bankEl.querySelectorAll<HTMLElement>(
        `[data-port-side="${side}"][data-channel-index="${String(endpoint.channelIndex)}"]`,
      );
      const match = Array.from(candidates).find(
        (el) => el.getAttribute('data-device-id') === endpoint.deviceId,
      );
      match?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    [],
  );

  const [routes, setRoutes] = useState<RouteEdge[]>([]);
  const [inputs, setInputs] = useState<ChannelNode[]>([]);
  const [outputs, setOutputs] = useState<ChannelNode[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [selectedChannelKey, setSelectedChannelKey] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [highlightedPortKey, setHighlightedPortKey] = useState<string | null>(null);

  interface ConnectionWindow {
    id: string;
    kind: 'connection';
    from: RouteEndpoint;
    to: RouteEndpoint;
    position: FloatingWindowPosition;
    zIndex: number;
  }

  interface FilterWindow {
    id: string;
    kind: 'filter';
    side: ChannelSide;
    deviceId: string;
    channelIndex: number;
    filterType: FilterType;
    position: FloatingWindowPosition;
    zIndex: number;
  }

  interface DockedFilterEditorState {
    side: ChannelSide;
    deviceId: string;
    channelIndex: number;
    filterType: FilterType;
  }

  interface ChannelWindow {
    id: string;
    kind: 'channel';
    side: ChannelSide;
    deviceId: string;
    channelIndex: number;
    position: FloatingWindowPosition;
    zIndex: number;
  }

  interface ChannelConnectionsWindow {
    id: string;
    kind: 'channel-connections';
    side: ChannelSide;
    deviceId: string;
    channelIndex: number;
    position: FloatingWindowPosition;
    zIndex: number;
  }

  type SignalFlowWindow = ConnectionWindow | FilterWindow | ChannelWindow | ChannelConnectionsWindow;

  const [windows, setWindows] = useState<SignalFlowWindow[]>([]);
  const [dockedFilterEditor, setDockedFilterEditor] = useState<DockedFilterEditorState | null>(null);
  const nextZIndexRef = useRef(100);

  // Compute connection counts for each channel
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const route of routes) {
      const inputKey = portKey('input', route.from);
      const outputKey = portKey('output', route.to);
      counts[inputKey] = (counts[inputKey] ?? 0) + 1;
      counts[outputKey] = (counts[outputKey] ?? 0) + 1;
    }
    return counts;
  }, [routes]);

  const setConfigJson = useSetConfigJson(unitId);
  const sendTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flow) return;

    // Defer state sync to avoid cascading renders flagged by lint rules.
    queueMicrotask(() => {
      setRoutes(flow.model.routes);
      setInputs(flow.model.inputs);
      setOutputs(flow.model.outputs);
      setSelectedRouteIndex(null);
      setSelectedChannelKey(null);
      setWindows([]);
      setDockedFilterEditor(null);

      // Sync UI metadata from config
      const uiMeta = flow.uiMetadata;
      const serverColors = uiMeta?.channelColors ?? {};
      const serverNames = uiMeta?.channelNames ?? {};
      const serverMirrorGroups = uiMeta?.mirrorGroups ?? { input: [], output: [] };

      // Generate default colors for any channels that don't have colors yet
      const allKeys = [
        ...flow.model.inputs.map((node) => portKey('input', node)),
        ...flow.model.outputs.map((node) => portKey('output', node)),
      ];

      const colorsWithDefaults = { ...serverColors };
      for (const key of allKeys) {
        if (!colorsWithDefaults[key]) {
          colorsWithDefaults[key] = defaultColorForKey(`${activeUnitId ?? 'default'}:${key}`);
        }
      }

      setChannelColors(colorsWithDefaults);
      setChannelNames(serverNames);
      setMirrorGroups(serverMirrorGroups);
    });
  }, [flow, activeUnitId]);

  // One-time migration from localStorage to server config
  useEffect(() => {
    if (!activeUnitId || !config || !flow) return;
    if (migratedRef.current.has(activeUnitId)) return;

    // Check if server already has UI metadata
    const hasServerUiData =
      config.ui?.signalFlow?.channelColors ||
      config.ui?.signalFlow?.mirrorGroups;

    if (hasServerUiData) {
      // Server already has data, mark as migrated
      migratedRef.current.add(activeUnitId);
      return;
    }

    // Check if we have localStorage data to migrate
    if (!localStoragePrefs) {
      migratedRef.current.add(activeUnitId);
      return;
    }

    const hasLocalData =
      Object.keys(localStoragePrefs.channelColors ?? {}).length > 0 ||
      (localStoragePrefs.mirrorGroups?.input?.length ?? 0) > 0 ||
      (localStoragePrefs.mirrorGroups?.output?.length ?? 0) > 0;

    if (!hasLocalData) {
      migratedRef.current.add(activeUnitId);
      return;
    }

    // Migrate localStorage data to server
    migratedRef.current.add(activeUnitId);
    const migratedMetadata: SignalFlowUiMetadata = {
      channelColors: localStoragePrefs.channelColors,
      mirrorGroups: localStoragePrefs.mirrorGroups,
    };

    // Update local state
    setChannelColors((prev) => ({ ...prev, ...localStoragePrefs.channelColors }));
    setMirrorGroups(localStoragePrefs.mirrorGroups);

    // Commit to server
    const patched = toConfig(
      config,
      {
        inputGroups: flow.model.inputGroups,
        outputGroups: flow.model.outputGroups,
        inputs: flow.model.inputs,
        outputs: flow.model.outputs,
        routes: flow.model.routes,
      },
      migratedMetadata,
    );

    const validation = validateConfig(patched.config);
    if (validation.valid && validation.config) {
      void setConfigJson.mutateAsync(validation.config).then(() => {
        showToast.success('Settings migrated', 'Channel colors and groups synced to server');
      });
    }
  }, [activeUnitId, config, flow, localStoragePrefs, setConfigJson]);

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  const commitModel = useCallback(
    (
      next: {
        routes?: RouteEdge[];
        inputs?: ChannelNode[];
        outputs?: ChannelNode[];
        uiMetadata?: Partial<SignalFlowUiMetadata>;
      },
      options?: { debounce?: boolean },
    ) => {
      if (!config || !flow) return;

      const nextRoutes = next.routes ?? routes;
      const nextInputs = next.inputs ?? inputs;
      const nextOutputs = next.outputs ?? outputs;

      // Merge UI metadata updates with current state
      const nextUiMetadata: SignalFlowUiMetadata = {
        channelColors: next.uiMetadata?.channelColors ?? channelColors,
        channelNames: next.uiMetadata?.channelNames ?? channelNames,
        mirrorGroups: next.uiMetadata?.mirrorGroups ?? mirrorGroups,
      };

      const send = async () => {
        const patched = toConfig(
          config,
          {
            inputGroups: flow.model.inputGroups,
            outputGroups: flow.model.outputGroups,
            inputs: nextInputs,
            outputs: nextOutputs,
            routes: nextRoutes,
          },
          nextUiMetadata,
        );
        const validation = validateConfig(patched.config);
        if (!validation.valid || !validation.config) {
          showToast.error('Invalid config', validation.errors[0]?.message);
          return;
        }

        try {
          await setConfigJson.mutateAsync(validation.config);
        } catch (error) {
          showToast.error(
            'Failed to send config',
            error instanceof Error ? error.message : String(error),
          );
        }
      };

      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }

      if (options?.debounce) {
        sendTimeoutRef.current = window.setTimeout(() => {
          sendTimeoutRef.current = null;
          void send();
        }, 150);
        return;
      }

      void send();
    },
    [config, flow, inputs, outputs, routes, channelColors, channelNames, mirrorGroups, setConfigJson],
  );

  const addRoute = useCallback(
    (from: RouteEndpoint, to: RouteEndpoint) => {
      setRoutes((prev) => {
        const existingIndex = prev.findIndex(
          (edge) =>
            edge.from.deviceId === from.deviceId &&
            edge.from.channelIndex === from.channelIndex &&
            edge.to.deviceId === to.deviceId &&
            edge.to.channelIndex === to.channelIndex,
        );

        if (existingIndex >= 0) {
          setSelectedRouteIndex(existingIndex);
          return prev;
        }

        const next: RouteEdge[] = [
          ...prev,
          { from, to, gain: 0, inverted: false, mute: false },
        ];
        setSelectedRouteIndex(next.length - 1);
        commitModel({ routes: next });
        return next;
      });
    },
    [commitModel],
  );

  const updateRoute = useCallback(
    (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => {
      setRoutes((prev) => {
        if (!prev[index]) return prev;
        const next = prev.map((edge, idx) => (idx === index ? { ...edge, ...updates } : edge));
        commitModel({ routes: next }, options);
        return next;
      });
    },
    [commitModel],
  );

  const deleteRoute = useCallback(
    (index: number) => {
      setRoutes((prev) => {
        if (!prev[index]) return prev;
        const next = prev.filter((_, idx) => idx !== index);
        commitModel({ routes: next });
        setSelectedRouteIndex(null);
        return next;
      });
    },
    [commitModel],
  );

  // Handler for channel color changes - updates local state and syncs to server
  const handleSetChannelColor = useCallback(
    (key: string, color: string) => {
      const normalized = normalizeHexColor(color);
      setChannelColors((prev) => {
        const next = { ...prev, [key]: normalized };
        commitModel({ uiMetadata: { channelColors: next } }, { debounce: true });
        return next;
      });
    },
    [commitModel],
  );

  // Handler for channel name changes - updates local state and syncs to server
  const handleSetChannelName = useCallback(
    (side: ChannelSide, endpoint: RouteEndpoint, name: string) => {
      const key = portKey(side, endpoint);
      const trimmed = name.trim();

      // If empty, remove the custom name (revert to default)
      if (!trimmed) {
        setChannelNames((prev) => {
          const next = { ...prev };
          delete next[key];
          commitModel({ uiMetadata: { channelNames: next } });
          return next;
        });

        // Also update the local inputs/outputs state with the default label
        const defaultLabel = side === 'input' ? `In ${endpoint.channelIndex + 1}` : `Out ${endpoint.channelIndex + 1}`;
        if (side === 'input') {
          setInputs((prev) =>
            prev.map((node) =>
              node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
                ? { ...node, label: defaultLabel }
                : node,
            ),
          );
        } else {
          setOutputs((prev) =>
            prev.map((node) =>
              node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
                ? { ...node, label: defaultLabel }
                : node,
            ),
          );
        }
        return;
      }

      setChannelNames((prev) => {
        const next = { ...prev, [key]: trimmed };
        commitModel({ uiMetadata: { channelNames: next } });
        return next;
      });

      // Also update the local inputs/outputs state
      if (side === 'input') {
        setInputs((prev) =>
          prev.map((node) =>
            node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
              ? { ...node, label: trimmed }
              : node,
          ),
        );
      } else {
        setOutputs((prev) =>
          prev.map((node) =>
            node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
              ? { ...node, label: trimmed }
              : node,
          ),
        );
      }
    },
    [commitModel],
  );

  // Handler for mirror group changes - updates local state and syncs to server
  const handleSetMirrorGroup = useCallback(
    (side: ChannelSide, members: RouteEndpoint[]) => {
      const uniqueMembers = members.filter(
        (candidate, idx) => members.findIndex((m) => sameEndpoint(m, candidate)) === idx,
      );

      setMirrorGroups((prev) => {
        const existingGroups = prev[side] ?? [];
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

        const next = { ...prev, [side]: nextGroups };
        commitModel({ uiMetadata: { mirrorGroups: next } });
        return next;
      });
    },
    [commitModel],
  );

  const updateChannelFilters = useCallback(
    (
      side: ChannelSide,
      endpoint: RouteEndpoint,
      filters: ChannelNode['processing']['filters'],
      options?: { debounce?: boolean },
    ) => {
      const groups = mirrorGroups[side] ?? [];
      const mirroredGroup = groups.find((group) => group.some((member) => sameEndpoint(member, endpoint))) ?? null;
      const targets = mirroredGroup ?? [endpoint];

      const excluded = new Set(targets.map(endpointKey));
      const takenNames = new Set<string>();

      for (const node of [...inputs, ...outputs]) {
        if (node.side !== side) {
          for (const filter of node.processing.filters) takenNames.add(filter.name);
          continue;
        }

        const key = endpointKey({ deviceId: node.deviceId, channelIndex: node.channelIndex });
        if (excluded.has(key)) continue;
        for (const filter of node.processing.filters) takenNames.add(filter.name);
      }

      const sourceKey = endpointKey(endpoint);
      const orderedTargets = [...targets].sort((a, b) => {
        if (endpointKey(a) === sourceKey) return -1;
        if (endpointKey(b) === sourceKey) return 1;
        return 0;
      });

      const sideNodes = side === 'input' ? inputs : outputs;
      const nextByEndpoint = new Map<string, ChannelNode['processing']['filters']>();

      const dedupeNames = (
        target: RouteEndpoint,
        nextFilters: ChannelNode['processing']['filters'],
      ): ChannelNode['processing']['filters'] => {
        const localTaken = new Set<string>();
        const resolved: ChannelNode['processing']['filters'] = nextFilters.map((filter, index) => {
          const candidate = filter.name;
          if (!takenNames.has(candidate) && !localTaken.has(candidate)) {
            localTaken.add(candidate);
            takenNames.add(candidate);
            return filter;
          }

          const baseName = `sf-${side}-ch${String(target.channelIndex + 1)}-${filter.config.type.toLowerCase()}-${String(Date.now())}-${String(index)}`;
          const name = ensureUniqueName(baseName, new Set([...takenNames, ...localTaken]));
          localTaken.add(name);
          takenNames.add(name);
          return { ...filter, name };
        });

        return resolved;
      };

      for (const target of orderedTargets) {
        const key = endpointKey(target);

        if (key === sourceKey) {
          nextByEndpoint.set(key, dedupeNames(target, filters));
          continue;
        }

        const node = sideNodes.find(
          (candidate) => candidate.deviceId === target.deviceId && candidate.channelIndex === target.channelIndex,
        );
        if (!node) continue;

        const canReuse =
          node.processing.filters.length === filters.length &&
          node.processing.filters.every((filter, index) => filter.config.type === filters[index]?.config.type);

        if (canReuse) {
          const updated = node.processing.filters.map((filter, index) => ({
            ...filter,
            config: filters[index]!.config,
          }));
          nextByEndpoint.set(key, dedupeNames(target, updated));
          continue;
        }

        const generated: ChannelNode['processing']['filters'] = filters.map((filter, index) => {
          const baseName = `sf-${side}-ch${String(target.channelIndex + 1)}-${filter.config.type.toLowerCase()}-${String(Date.now())}-${String(index)}`;
          const name = ensureUniqueName(baseName, takenNames);
          takenNames.add(name);
          return { name, config: filter.config };
        });
        nextByEndpoint.set(key, generated);
      }

      if (side === 'input') {
        setInputs((prev) => {
          const next = prev.map((node) => {
            const key = endpointKey({ deviceId: node.deviceId, channelIndex: node.channelIndex });
            const nextFilters = nextByEndpoint.get(key);
            if (!nextFilters) return node;
            return { ...node, processing: { filters: nextFilters }, processingSummary: processingSummaryFromFilters(nextFilters) };
          });
          commitModel({ inputs: next }, options);
          return next;
        });
        return;
      }

      setOutputs((prev) => {
        const next = prev.map((node) => {
          const key = endpointKey({ deviceId: node.deviceId, channelIndex: node.channelIndex });
          const nextFilters = nextByEndpoint.get(key);
          if (!nextFilters) return node;
          return { ...node, processing: { filters: nextFilters }, processingSummary: processingSummaryFromFilters(nextFilters) };
        });
        commitModel({ outputs: next }, options);
        return next;
      });
    },
    [commitModel, inputs, mirrorGroups, outputs],
  );

  const handleUpdateFilters = useCallback(
    (
      channel: ChannelNode,
      filters: ChannelNode['processing']['filters'],
      options?: { debounce?: boolean },
    ) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      setSelectedChannelKey(portKey(channel.side, endpoint));
      scrollChannelIntoView(channel.side, endpoint);
      updateChannelFilters(channel.side, endpoint, filters, options);
    },
    [scrollChannelIntoView, updateChannelFilters],
  );

  const labelFor = useCallback((side: ChannelSide, endpoint: RouteEndpoint): string => {
    const nodes = side === 'input' ? inputs : outputs;
    const node = nodes.find((candidate) => candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex);
    return node?.label ?? `${endpoint.deviceId}:${endpoint.channelIndex + 1}`;
  }, [inputs, outputs]);

  const openConnectionWindow = useCallback(
    (route: RouteEdge, _point?: { x: number; y: number }) => {
      const workspaceEl = workspaceRef.current;
      const bounds = workspaceEl?.getBoundingClientRect() ?? null;

      const width = 420;
      const height = 200;
      const defaultPosition: FloatingWindowPosition = (() => {
        if (!bounds) return { x: 24, y: 24 };
        const x = Math.max(8, (bounds.width - width) / 2);
        const y = Math.max(8, (bounds.height - height) / 2);
        return { x, y };
      })();

      const id = `connection:${route.from.deviceId}:${route.from.channelIndex}->${route.to.deviceId}:${route.to.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) =>
            win.id === id ? { ...win, zIndex: nextZ } : win,
          );
        }

        return [
          ...prev,
          {
            id,
            kind: 'connection',
            from: route.from,
            to: route.to,
            position: defaultPosition,
            zIndex: nextZ,
          },
        ];
      });
    },
    [],
  );

  const openFilterWindow = useCallback(
    (channel: ChannelNode, filterType: FilterType, _point?: { x: number; y: number }) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      setSelectedChannelKey(portKey(channel.side, endpoint));
      scrollChannelIntoView(channel.side, endpoint);
      setDockedFilterEditor({
        side: channel.side,
        deviceId: channel.deviceId,
        channelIndex: channel.channelIndex,
        filterType,
      });
    },
    [scrollChannelIntoView],
  );

  const openChannelWindow = useCallback(
    (channel: ChannelNode, _point?: { x: number; y: number }) => {
      const workspaceEl = workspaceRef.current;
      const bounds = workspaceEl?.getBoundingClientRect() ?? null;

      const width = 460;
      const height = 300;
      const defaultPosition: FloatingWindowPosition = (() => {
        if (!bounds) return { x: 64, y: 64 };
        const x = Math.max(8, (bounds.width - width) / 2);
        const y = Math.max(8, (bounds.height - height) / 2);
        return { x, y };
      })();

      const id = `channel:${channel.side}:${channel.deviceId}:${channel.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
        }

        return [
          ...prev,
          {
            id,
            kind: 'channel',
            side: channel.side,
            deviceId: channel.deviceId,
            channelIndex: channel.channelIndex,
            position: defaultPosition,
            zIndex: nextZ,
          },
        ];
      });
    },
    [],
  );

  const openConnectionsWindow = useCallback(
    (channel: ChannelNode, _point?: { x: number; y: number }) => {
      const workspaceEl = workspaceRef.current;
      const bounds = workspaceEl?.getBoundingClientRect() ?? null;

      const width = 400;
      const height = 350;
      const defaultPosition: FloatingWindowPosition = (() => {
        if (!bounds) return { x: 80, y: 80 };
        const x = Math.max(8, (bounds.width - width) / 2);
        const y = Math.max(8, (bounds.height - height) / 2);
        return { x, y };
      })();

      const id = `channel-connections:${channel.side}:${channel.deviceId}:${channel.channelIndex}`;

      setWindows((prev) => {
        const existing = prev.find((win) => win.id === id);
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;

        if (existing) {
          return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
        }

        return [
          ...prev,
          {
            id,
            kind: 'channel-connections',
            side: channel.side,
            deviceId: channel.deviceId,
            channelIndex: channel.channelIndex,
            position: defaultPosition,
            zIndex: nextZ,
          },
        ];
      });
    },
    [],
  );

  const copyClipboard = useCallback(
    async (payload: SignalFlowClipboardPayload) => {
      setClipboard(payload);
      const text = serializeSignalFlowClipboard(payload);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
        showToast.success('Copied');
      } catch (error) {
        showToast.warning('Copied (internal)', error instanceof Error ? error.message : String(error));
      }
    },
    [setClipboard],
  );

  const readClipboard = useCallback(async (): Promise<SignalFlowClipboardPayload | null> => {
    try {
      if (!navigator.clipboard?.readText) return clipboard;
      const text = await navigator.clipboard.readText();
      const parsed = parseSignalFlowClipboard(text);
      if (parsed) {
        setClipboard(parsed);
        return parsed;
      }
    } catch {
      // Fall back to internal clipboard.
    }

    return clipboard;
  }, [clipboard, setClipboard]);

  const handlePortPointerDown = useCallback(
    (side: 'input' | 'output', endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();

      const getPoint = (clientX: number, clientY: number) => {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x, y };
      };

      // Drag direction: input→output or output→input (routes are always input→output)
      const dragFromSide = side;
      const targetSide = side === 'input' ? 'output' : 'input';

      setDragState({ from: endpoint, point: getPoint(event.clientX, event.clientY), hoverTo: null });

      const handleMove = (moveEvent: PointerEvent) => {
        const hovered = endpointFromPortElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY));
        const hoverTo = hovered?.side === targetSide ? hovered.endpoint : null;
        setHighlightedPortKey(hoverTo ? portKey(targetSide, hoverTo) : null);
        setDragState((current) => {
          if (!current) return current;
          return {
            ...current,
            point: getPoint(moveEvent.clientX, moveEvent.clientY),
            hoverTo,
          };
        });
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        setDragState((current) => {
          if (current?.hoverTo) {
            // Routes are always from input to output
            const from = dragFromSide === 'input' ? current.from : current.hoverTo;
            const to = dragFromSide === 'input' ? current.hoverTo : current.from;
            addRoute(from, to);
            openConnectionWindow({
              from,
              to,
              gain: 0,
              inverted: false,
              mute: false,
            });
          }
          return null;
        });
        setHighlightedPortKey(null);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp, { once: true });
    },
    [addRoute, openConnectionWindow],
  );

  if (connectedUnits.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <Share2 className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Units Connected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Connect to a CamillaDSP unit from the dashboard to view and edit its signal flow.
        </p>
      </div>
    );
  }

  if (!activeUnitId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <Share2 className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Unit Selected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Select a unit from the list above to view its signal flow.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-dsp-text-muted">
        Loading signal flow...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-red-400">
        Failed to load config: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-dsp-text-muted">
        No config available.
      </div>
    );
  }

  const warningCount = flow.warnings.length;
  const inputCount = flow.model.inputs.length;
  const outputCount = flow.model.outputs.length;
  const routeCount = routes.length;
  const sampleRate = config?.devices.samplerate ?? 48000;

  const activeUnitName = activeUnitId ? getUnitName(activeUnitId) : 'Unknown';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      <div className="border-b border-dsp-primary/30 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-dsp-text">Signal Flow</h1>
              <p className="text-sm text-dsp-text-muted">
                {inputCount} input{inputCount === 1 ? '' : 's'} | {outputCount} output{outputCount === 1 ? '' : 's'} | {routeCount} route{routeCount === 1 ? '' : 's'}
              </p>
            </div>

            {/* Unit Selector */}
            {connectedUnits.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-dsp-primary/30 bg-dsp-surface px-3 py-1.5 text-sm text-dsp-text hover:border-dsp-primary/50"
                  onClick={() => { setUnitSelectorOpen(!unitSelectorOpen); }}
                >
                  <span className="max-w-32 truncate">{activeUnitName}</span>
                  {effectiveSelectedIds.length > 1 && (
                    <span className="rounded bg-dsp-accent/20 px-1.5 text-xs text-dsp-accent">
                      +{effectiveSelectedIds.length - 1}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </button>

                {unitSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => { setUnitSelectorOpen(false); }}
                    />
                    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-dsp-primary/30 bg-dsp-surface py-1 shadow-lg">
                      <div className="border-b border-dsp-primary/20 px-3 py-2 text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
                        Select Units
                      </div>
                      {connectedUnits.map((unit) => {
                        const isSelected = effectiveSelectedIds.includes(unit.unitId);
                        return (
                          <button
                            key={unit.unitId}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dsp-text hover:bg-dsp-primary/10"
                            onClick={() => {
                              toggleSelectedUnit(unit.unitId);
                            }}
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-dsp-accent bg-dsp-accent' : 'border-dsp-primary/40'}`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="truncate">{getUnitName(unit.unitId)}</span>
                          </button>
                        );
                      })}
                      {connectedUnits.length > 1 && (
                        <div className="border-t border-dsp-primary/20 px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-dsp-accent hover:underline"
                            onClick={() => {
                              if (effectiveSelectedIds.length === connectedUnits.length) {
                                setSelectedUnitIds([]);
                              } else {
                                setSelectedUnitIds(connectedUnits.map((u) => u.unitId));
                              }
                            }}
                          >
                            {effectiveSelectedIds.length === connectedUnits.length ? 'Clear selection' : 'Select all'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {warningCount > 0 && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              {warningCount} warning{warningCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      <div
        ref={workspaceRef}
        className="relative flex flex-1 flex-col overflow-hidden"
        onClick={(event) => {
          // Clear selection when clicking on the workspace background (not on interactive elements)
          if (event.target === event.currentTarget) {
            setSelectedRouteIndex(null);
            setSelectedChannelKey(null);
          }
        }}
      >
        <div
          className="overflow-hidden border-b border-dsp-primary/20 bg-dsp-surface transition-[height] duration-300 ease-in-out"
          style={{ height: dockedFilterEditor ? 'calc(100% - 20vh)' : '0px' }}
        >
          {dockedFilterEditor && (() => {
            const endpoint = { deviceId: dockedFilterEditor.deviceId, channelIndex: dockedFilterEditor.channelIndex };
            const nodes = dockedFilterEditor.side === 'input' ? inputs : outputs;
            const node = nodes.find(
              (candidate) =>
                candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex,
            );
            if (!node) return null;

            const meta = FILTER_UI[dockedFilterEditor.filterType];

            return (
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-dsp-primary/20 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-dsp-text">
                      {labelFor(dockedFilterEditor.side, endpoint)} Â· {meta.label}
                    </div>
                    <div className="mt-0.5 text-xs text-dsp-text-muted">
                      {dockedFilterEditor.side === 'input' ? 'Input processing' : 'Output processing'}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Close editor"
                    onClick={() => {
                      setDockedFilterEditor(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <SignalFlowFilterWindowContent
                    node={node}
                    sampleRate={sampleRate}
                    filterType={dockedFilterEditor.filterType}
                    onClose={() => {
                      setDockedFilterEditor(null);
                    }}
                    onChange={(nextFilters, options) => {
                      updateChannelFilters(dockedFilterEditor.side, endpoint, nextFilters, options);
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        <div
          className="relative flex flex-1 overflow-hidden"
          onClick={(event) => {
            // Clear selection when clicking on the background
            if (event.target === event.currentTarget) {
              setSelectedRouteIndex(null);
              setSelectedChannelKey(null);
            }
          }}
        >
        <ChannelBank
          title="Inputs"
          side="input"
          groups={flow.model.inputGroups}
          channels={inputs}
          selectedChannelKey={selectedChannelKey}
          highlightedPortKey={highlightedPortKey}
          channelColors={channelColors}
          connectionCounts={connectionCounts}
          sampleRate={sampleRate}
          channelLevels={captureLevels}
          containerRef={inputBankRef}
          onUpdateFilters={handleUpdateFilters}
          onOpenFilter={(channel, type, point) => {
            openFilterWindow(channel, type, point);
          }}
          onOpenChannelSettings={(channel, point) => {
            openChannelWindow(channel, point);
          }}
          onColorChange={(channel, color) => {
            const key = portKey('input', channel);
            handleSetChannelColor(key, color);
          }}
          onLabelChange={(channel, label) => {
            handleSetChannelName('input', channel, label);
          }}
          onOpenConnections={(channel, point) => {
            openConnectionsWindow(channel, point);
          }}
          onSelectChannel={(channel) => {
            const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
            setSelectedChannelKey(portKey('input', endpoint));
            scrollChannelIntoView('input', endpoint);

            const route = routes.find(
              (edge) =>
                edge.from.deviceId === channel.deviceId &&
                edge.from.channelIndex === channel.channelIndex,
            );
            if (!route) {
              openConnectionsWindow(channel);
              return;
            }
            const index = routes.indexOf(route);
            if (index >= 0) setSelectedRouteIndex(index);
            openConnectionWindow(route);
          }}
          onPortPointerDown={handlePortPointerDown}
        />

        <ConnectionsCanvas
          canvasRef={canvasRef}
          inputBankRef={inputBankRef}
          outputBankRef={outputBankRef}
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
        />

        <ChannelBank
          title="Outputs"
          side="output"
          groups={flow.model.outputGroups}
          channels={outputs}
          selectedChannelKey={selectedChannelKey}
          highlightedPortKey={highlightedPortKey}
          channelColors={channelColors}
          connectionCounts={connectionCounts}
          sampleRate={sampleRate}
          channelLevels={playbackLevels}
          containerRef={outputBankRef}
          onUpdateFilters={handleUpdateFilters}
          onOpenFilter={(channel, type, point) => {
            openFilterWindow(channel, type, point);
          }}
          onOpenChannelSettings={(channel, point) => {
            openChannelWindow(channel, point);
          }}
          onColorChange={(channel, color) => {
            const key = portKey('output', channel);
            handleSetChannelColor(key, color);
          }}
          onLabelChange={(channel, label) => {
            handleSetChannelName('output', channel, label);
          }}
          onOpenConnections={(channel, point) => {
            openConnectionsWindow(channel, point);
          }}
          onSelectChannel={(channel) => {
            const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
            setSelectedChannelKey(portKey('output', endpoint));
            scrollChannelIntoView('output', endpoint);

            const route = routes.find(
              (edge) =>
                edge.to.deviceId === channel.deviceId &&
                edge.to.channelIndex === channel.channelIndex,
            );
            if (!route) {
              openConnectionsWindow(channel);
              return;
            }
            const index = routes.indexOf(route);
            if (index >= 0) setSelectedRouteIndex(index);
            openConnectionWindow(route);
          }}
          onPortPointerDown={handlePortPointerDown}
        />

        </div>

        {windows.map((win) => {
          if (win.kind === 'connection') {
            const routeIndex = routes.findIndex(
              (edge) =>
                edge.from.deviceId === win.from.deviceId &&
                edge.from.channelIndex === win.from.channelIndex &&
                edge.to.deviceId === win.to.deviceId &&
                edge.to.channelIndex === win.to.channelIndex,
            );
            const route = routeIndex >= 0 ? routes[routeIndex] ?? null : null;
            if (!route) return null;

            return (
              <FloatingWindow
                key={win.id}
                id={win.id}
                title={`Connection: ${labelFor('input', win.from)} → ${labelFor('output', win.to)}`}
                position={win.position}
                zIndex={win.zIndex}
                boundsRef={workspaceRef}
                onMove={(pos) => {
                  setWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, position: pos } : w)));
                }}
                onRequestClose={() => {
                  setWindows((prev) => prev.filter((w) => w.id !== win.id));
                }}
                onRequestFocus={() => {
                  setWindows((prev) => {
                    const nextZ = nextZIndexRef.current + 1;
                    nextZIndexRef.current = nextZ;
                    return prev.map((w) => (w.id === win.id ? { ...w, zIndex: nextZ } : w));
                  });
                }}
                headerRight={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Copy connection settings"
                      onClick={() => {
                        void copyClipboard({
                          kind: 'route',
                          data: { gain: route.gain, inverted: route.inverted, mute: route.mute },
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Paste connection settings"
                      disabled={
                        !(
                          clipboard?.kind === 'route' ||
                          (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText)
                        )
                      }
                      onClick={() => {
                        void (async () => {
                          const payload = await readClipboard();
                          if (payload?.kind !== 'route') {
                            showToast.info('Nothing to paste');
                            return;
                          }
                          updateRoute(routeIndex, payload.data);
                          showToast.success('Pasted');
                        })();
                      }}
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                  </>
                }
                className="w-[420px]"
              >
                <ConnectionEditor
                  route={route}
                  fromLabel={labelFor('input', route.from)}
                  toLabel={labelFor('output', route.to)}
                  onChange={(updates, options) => {
                    updateRoute(routeIndex, updates, options);
                  }}
                  onDelete={() => {
                    deleteRoute(routeIndex);
                    setWindows((prev) => prev.filter((w) => w.id !== win.id));
                  }}
                />
              </FloatingWindow>
            );
          }

          if (win.kind === 'filter') {
            const endpoint = { deviceId: win.deviceId, channelIndex: win.channelIndex };
            const nodes = win.side === 'input' ? inputs : outputs;
            const node = nodes.find(
              (candidate) => candidate.deviceId === win.deviceId && candidate.channelIndex === win.channelIndex,
            );
            if (!node) return null;

            const meta = FILTER_UI[win.filterType];

            return (
              <FloatingWindow
                key={win.id}
                id={win.id}
                title={`${labelFor(win.side, endpoint)} · ${meta.shortLabel}`}
                position={win.position}
                zIndex={win.zIndex}
                boundsRef={workspaceRef}
                onMove={(pos) => {
                  setWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, position: pos } : w)));
                }}
                onRequestClose={() => {
                  setWindows((prev) => prev.filter((w) => w.id !== win.id));
                }}
                onRequestFocus={() => {
                  setWindows((prev) => {
                    const nextZ = nextZIndexRef.current + 1;
                    nextZIndexRef.current = nextZ;
                    return prev.map((w) => (w.id === win.id ? { ...w, zIndex: nextZ } : w));
                  });
                }}
                headerRight={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Copy filter settings"
                      onClick={() => {
                        if (win.filterType === 'Biquad') {
                          const bands = node.processing.filters.filter((f) => f.config.type === 'Biquad');
                          if (bands.length === 0) {
                            showToast.info('Nothing to copy');
                            return;
                          }
                          void copyClipboard({ kind: 'filter', data: { filterType: 'Biquad', bands } });
                          return;
                        }

                        const current = node.processing.filters.find((f) => f.config.type === win.filterType);
                        if (!current) {
                          showToast.info('Nothing to copy');
                          return;
                        }
                        void copyClipboard({ kind: 'filter', data: { filterType: win.filterType, config: current.config } });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Paste filter settings"
                      disabled={
                        !(
                          clipboard?.kind === 'filter' ||
                          (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText)
                        )
                      }
                      onClick={() => {
                        void (async () => {
                          const payload = await readClipboard();
                          if (payload?.kind !== 'filter') {
                            showToast.info('Nothing to paste');
                            return;
                          }

                          if (win.filterType === 'Biquad') {
                            if (!('bands' in payload.data) || payload.data.filterType !== 'Biquad') {
                              showToast.warning('Clipboard does not contain EQ bands.');
                              return;
                            }

                            const biquads = payload.data.bands.filter((f) => f.config.type === 'Biquad');
                            const nextFilters = replaceBiquadBlock(node.processing.filters, biquads);
                            updateChannelFilters(win.side, endpoint, nextFilters);
                            showToast.success('Pasted');
                            return;
                          }

                          if (!('config' in payload.data) || payload.data.filterType !== win.filterType) {
                            showToast.warning('Clipboard filter type does not match.');
                            return;
                          }

                          const pastedConfig = payload.data.config;
                          const existingIndex = node.processing.filters.findIndex((f) => f.config.type === win.filterType);
                          const nextFilters =
                            existingIndex >= 0
                              ? node.processing.filters.map((f, idx) => (idx === existingIndex ? { ...f, config: pastedConfig } : f))
                              : (() => {
                                  const taken = new Set(node.processing.filters.map((f) => f.name));
                                  const baseName = `sf-${win.side}-ch${String(win.channelIndex + 1)}-${win.filterType.toLowerCase()}-${String(Date.now())}`;
                                  const name = ensureUniqueName(baseName, taken);
                                  return [...node.processing.filters, { name, config: pastedConfig }];
                                })();

                          updateChannelFilters(win.side, endpoint, nextFilters);
                          showToast.success('Pasted');
                        })();
                      }}
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                  </>
                }
                className={win.filterType === 'Biquad' ? 'w-[800px]' : 'w-[560px]'}
              >
                <SignalFlowFilterWindowContent
                  node={node}
                  sampleRate={sampleRate}
                  filterType={win.filterType}
                  onClose={() => {
                    setWindows((prev) => prev.filter((w) => w.id !== win.id));
                  }}
                  onChange={(nextFilters, options) => {
                    updateChannelFilters(win.side, endpoint, nextFilters, options);
                  }}
                />
              </FloatingWindow>
            );
          }

          if (win.kind === 'channel') {
            const endpoint = { deviceId: win.deviceId, channelIndex: win.channelIndex };
            const nodes = win.side === 'input' ? inputs : outputs;
            const node = nodes.find(
              (candidate) => candidate.deviceId === win.deviceId && candidate.channelIndex === win.channelIndex,
            );
            if (!node) return null;

            const key = portKey(win.side, endpoint);
            const color = channelColors[key] ?? '#22d3ee';
            const canPaste =
              clipboard?.kind === 'channel' ||
              (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText);

            return (
              <FloatingWindow
                key={win.id}
                id={win.id}
                title={`${labelFor(win.side, endpoint)} Settings`}
                position={win.position}
                zIndex={win.zIndex}
                boundsRef={workspaceRef}
                onMove={(pos) => {
                  setWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, position: pos } : w)));
                }}
                onRequestClose={() => {
                  setWindows((prev) => prev.filter((w) => w.id !== win.id));
                }}
                onRequestFocus={() => {
                  setWindows((prev) => {
                    const nextZ = nextZIndexRef.current + 1;
                    nextZIndexRef.current = nextZ;
                    return prev.map((w) => (w.id === win.id ? { ...w, zIndex: nextZ } : w));
                  });
                }}
                className="w-[460px]"
              >
                <SignalFlowChannelWindowContent
                  node={node}
                  side={win.side}
                  endpoint={endpoint}
                  allSideChannels={nodes}
                  color={color}
                  mirrorGroups={mirrorGroups[win.side] ?? []}
                  onSetColor={(next) => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(next)) return;
                    handleSetChannelColor(key, next);
                  }}
                  onSetMirrorMembers={(members) => {
                    handleSetMirrorGroup(win.side, members);
                  }}
                  onCopyChannel={() => {
                    void copyClipboard({ kind: 'channel', data: { filters: node.processing.filters } });
                  }}
                  canPasteChannel={canPaste}
                  onPasteChannel={() => {
                    void (async () => {
                      const payload = await readClipboard();
                      if (payload?.kind !== 'channel') {
                        showToast.info('Nothing to paste');
                        return;
                      }
                      updateChannelFilters(win.side, endpoint, payload.data.filters);
                      showToast.success('Pasted');
                    })();
                  }}
                />
              </FloatingWindow>
            );
          }

          if (win.kind === 'channel-connections') {
            const endpoint = { deviceId: win.deviceId, channelIndex: win.channelIndex };
            const nodes = win.side === 'input' ? inputs : outputs;
            const node = nodes.find(
              (candidate) => candidate.deviceId === win.deviceId && candidate.channelIndex === win.channelIndex,
            );
            if (!node) return null;

            return (
              <FloatingWindow
                key={win.id}
                id={win.id}
                title={`${labelFor(win.side, endpoint)} Connections`}
                position={win.position}
                zIndex={win.zIndex}
                boundsRef={workspaceRef}
                onMove={(pos) => {
                  setWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, position: pos } : w)));
                }}
                onRequestClose={() => {
                  setWindows((prev) => prev.filter((w) => w.id !== win.id));
                }}
                onRequestFocus={() => {
                  setWindows((prev) => {
                    const nextZ = nextZIndexRef.current + 1;
                    nextZIndexRef.current = nextZ;
                    return prev.map((w) => (w.id === win.id ? { ...w, zIndex: nextZ } : w));
                  });
                }}
                className="w-[400px]"
              >
                <ChannelConnectionsWindowContent
                  node={node}
                  side={win.side}
                  routes={routes}
                  allInputs={inputs}
                  allOutputs={outputs}
                  onAddRoute={(from, to) => {
                    addRoute(from, to);
                  }}
                  onDeleteRoute={(routeIndex) => {
                    deleteRoute(routeIndex);
                  }}
                  onEditRoute={(routeIndex) => {
                    const route = routes[routeIndex];
                    if (!route) return;
                    openConnectionWindow(route);
                  }}
                />
              </FloatingWindow>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
