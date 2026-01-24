import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { useConfigJson } from '../features/configuration/configQueries';
import { useSetConfigJson } from '../features/configuration';
import { showToast } from '../components/feedback';
import { validateConfig } from '../lib/config';
import { fromConfig, processingSummaryFromFilters, toConfig, type RouteEdge, type RouteEndpoint } from '../lib/signalflow';
import type { ChannelNode, ChannelSide } from '../lib/signalflow';
import { filterRegistry } from '../lib/filters/registry';
import { ChannelBank } from '../components/signal-flow/ChannelBank';
import { ConnectionsCanvas, type DragState } from '../components/signal-flow/ConnectionsCanvas';
import { ChannelEditorDrawer } from '../components/signal-flow/ChannelEditorDrawer';

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

export function SignalFlowPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

  if (!activeUnitId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <Share2 className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Unit Selected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Select a CamillaDSP unit from the dashboard to view and edit its signal flow.
        </p>
      </div>
    );
  }

  const {
    data: config,
    isLoading,
    error,
  } = useConfigJson(activeUnitId);

  const flow = useMemo(() => {
    if (!config) return null;
    return fromConfig(config);
  }, [config]);

  const inputBankRef = useRef<HTMLElement | null>(null);
  const outputBankRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);

  const [routes, setRoutes] = useState<RouteEdge[]>([]);
  const [inputs, setInputs] = useState<ChannelNode[]>([]);
  const [outputs, setOutputs] = useState<ChannelNode[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [highlightedPortKey, setHighlightedPortKey] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<{ side: ChannelSide; deviceId: string; channelIndex: number } | null>(null);

  const setConfigJson = useSetConfigJson(activeUnitId);
  const sendTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flow) return;
    setRoutes(flow.model.routes);
    setInputs(flow.model.inputs);
    setOutputs(flow.model.outputs);
    setSelectedRouteIndex(null);
    setSelectedChannel(null);
  }, [flow]);

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  const commitModel = useCallback(
    (
      next: { routes?: RouteEdge[]; inputs?: ChannelNode[]; outputs?: ChannelNode[] },
      options?: { debounce?: boolean },
    ) => {
      if (!config || !flow) return;

      const nextRoutes = next.routes ?? routes;
      const nextInputs = next.inputs ?? inputs;
      const nextOutputs = next.outputs ?? outputs;

      const send = async () => {
        const patched = toConfig(config, {
          inputGroups: flow.model.inputGroups,
          outputGroups: flow.model.outputGroups,
          inputs: nextInputs,
          outputs: nextOutputs,
          routes: nextRoutes,
        });
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
    [config, flow, inputs, outputs, routes, setConfigJson],
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

  const selectedNode = useMemo(() => {
    if (!selectedChannel) return null;
    const list = selectedChannel.side === 'input' ? inputs : outputs;
    return (
      list.find(
        (node) => node.deviceId === selectedChannel.deviceId && node.channelIndex === selectedChannel.channelIndex,
      ) ?? null
    );
  }, [inputs, outputs, selectedChannel]);

  const handleChannelProcessingChange = useCallback(
    (filters: ChannelNode['processing']['filters'], options?: { debounce?: boolean }) => {
      if (!selectedChannel) return;

      if (selectedChannel.side === 'input') {
        setInputs((prev) => {
          const next = prev.map((node) =>
            node.deviceId === selectedChannel.deviceId && node.channelIndex === selectedChannel.channelIndex
              ? { ...node, processing: { filters }, processingSummary: processingSummaryFromFilters(filters) }
              : node,
          );
          commitModel({ inputs: next }, options);
          return next;
        });
        return;
      }

      setOutputs((prev) => {
        const next = prev.map((node) =>
          node.deviceId === selectedChannel.deviceId && node.channelIndex === selectedChannel.channelIndex
            ? { ...node, processing: { filters }, processingSummary: processingSummaryFromFilters(filters) }
            : node,
        );
        commitModel({ outputs: next }, options);
        return next;
      });
    },
    [commitModel, selectedChannel],
  );

  const handlePortPointerDown = useCallback(
    (side: 'input' | 'output', endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (side !== 'input') return;
      event.preventDefault();

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();

      const getPoint = (clientX: number, clientY: number) => {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x, y };
      };

      setDragState({ from: endpoint, point: getPoint(event.clientX, event.clientY), hoverTo: null });

      const handleMove = (moveEvent: PointerEvent) => {
        const hovered = endpointFromPortElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY));
        const hoverTo = hovered?.side === 'output' ? hovered.endpoint : null;
        setHighlightedPortKey(hoverTo ? portKey('output', hoverTo) : null);
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
            addRoute(current.from, current.hoverTo);
          }
          return null;
        });
        setHighlightedPortKey(null);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp, { once: true });
    },
    [addRoute],
  );

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      <div className="border-b border-dsp-primary/30 px-6 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-dsp-text">Signal Flow</h1>
            <p className="text-sm text-dsp-text-muted">
              {inputCount} input{inputCount === 1 ? '' : 's'} | {outputCount} output{outputCount === 1 ? '' : 's'} | {routeCount} route{routeCount === 1 ? '' : 's'}
            </p>
          </div>

          {warningCount > 0 && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              {warningCount} warning{warningCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ChannelBank
          title="Inputs"
          side="input"
          groups={flow.model.inputGroups}
          channels={inputs}
          selectedChannelKey={
            selectedChannel?.side === 'input' ? portKey('input', selectedChannel) : null
          }
          highlightedPortKey={highlightedPortKey}
          containerRef={inputBankRef}
          onSelectChannel={(channel) => {
            setSelectedChannel({ side: 'input', deviceId: channel.deviceId, channelIndex: channel.channelIndex });
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
          dragState={dragState}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          onUpdateRoute={updateRoute}
          onDeleteRoute={deleteRoute}
        />

        <ChannelBank
          title="Outputs"
          side="output"
          groups={flow.model.outputGroups}
          channels={outputs}
          selectedChannelKey={
            selectedChannel?.side === 'output' ? portKey('output', selectedChannel) : null
          }
          highlightedPortKey={highlightedPortKey}
          containerRef={outputBankRef}
          onSelectChannel={(channel) => {
            setSelectedChannel({ side: 'output', deviceId: channel.deviceId, channelIndex: channel.channelIndex });
          }}
          onPortPointerDown={handlePortPointerDown}
        />

        {selectedNode && (
          <ChannelEditorDrawer
            open={!!selectedNode}
            node={selectedNode}
            sampleRate={config?.devices.samplerate ?? 48000}
            availableFilterTypes={filterRegistry.getAllTypes()}
            onClose={() => {
              setSelectedChannel(null);
            }}
            onChange={handleChannelProcessingChange}
          />
        )}
      </div>
    </div>
  );
}
