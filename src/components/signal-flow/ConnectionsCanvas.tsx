import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelNode, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import { cn } from '../../lib/utils';
import { ConnectionEditor } from './ConnectionEditor';

export interface DragState {
  from: RouteEndpoint;
  point: { x: number; y: number };
  hoverTo: RouteEndpoint | null;
}

export interface ConnectionsCanvasProps {
  canvasRef: RefObject<HTMLElement | null>;
  inputBankRef: RefObject<HTMLElement | null>;
  outputBankRef: RefObject<HTMLElement | null>;
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  routes: RouteEdge[];
  dragState: DragState | null;
  selectedRouteIndex: number | null;
  onSelectRoute: (index: number | null) => void;
  onUpdateRoute: (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  onDeleteRoute: (index: number) => void;
}

function portKey(side: 'input' | 'output', endpoint: RouteEndpoint): string {
  return `${side}:${endpoint.deviceId}:${endpoint.channelIndex}`;
}

function buildCurve(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
): string {
  const tension = Math.max(80, Math.min(260, width * 0.35));
  const c1x = from.x + tension;
  const c2x = to.x - tension;
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}

function labelFor(nodes: ChannelNode[], endpoint: RouteEndpoint): string {
  const node = nodes.find(
    (candidate) =>
      candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex,
  );
  return node?.label ?? `${endpoint.deviceId}:${endpoint.channelIndex + 1}`;
}

export function ConnectionsCanvas({
  canvasRef,
  inputBankRef,
  outputBankRef,
  inputs,
  outputs,
  routes,
  dragState,
  selectedRouteIndex,
  onSelectRoute,
  onUpdateRoute,
  onDeleteRoute,
}: ConnectionsCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const request = () => {
      setLayoutTick((tick) => tick + 1);
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            request();
          });
    resizeObserver?.observe(canvasEl);

    const banks = [inputBankRef.current, outputBankRef.current].filter(Boolean) as HTMLElement[];
    for (const bank of banks) {
      bank.addEventListener('scroll', request, { passive: true });
    }

    window.addEventListener('resize', request);
    request();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', request);
      for (const bank of banks) {
        bank.removeEventListener('scroll', request);
      }
    };
  }, [canvasRef, inputBankRef, outputBankRef]);

  const layout = useMemo(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      return {
        width: 0,
        height: 0,
        inputPorts: new Map<string, { x: number; y: number }>(),
        outputPorts: new Map<string, { x: number; y: number }>(),
      };
    }

    const canvasRect = canvasEl.getBoundingClientRect();
    const width = Math.max(1, canvasRect.width);
    const height = Math.max(1, canvasRect.height);
    const inset = 16;

    const portElements = Array.from(document.querySelectorAll<HTMLElement>('[data-port-key]'));
    const byKey = new Map<string, HTMLElement>();
    for (const element of portElements) {
      const key = element.getAttribute('data-port-key');
      if (!key) continue;
      byKey.set(key, element);
    }

    const inputPorts = new Map<string, { x: number; y: number }>();
    for (const node of inputs) {
      const key = portKey('input', { deviceId: node.deviceId, channelIndex: node.channelIndex });
      const el = byKey.get(key);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      inputPorts.set(key, { x: inset, y: rect.top + rect.height / 2 - canvasRect.top });
    }

    const outputPorts = new Map<string, { x: number; y: number }>();
    for (const node of outputs) {
      const key = portKey('output', { deviceId: node.deviceId, channelIndex: node.channelIndex });
      const el = byKey.get(key);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      outputPorts.set(key, { x: width - inset, y: rect.top + rect.height / 2 - canvasRect.top });
    }

    return { width, height, inputPorts, outputPorts };
  }, [canvasRef, inputs, outputs, layoutTick]);

  const selectedRoute = selectedRouteIndex !== null ? routes[selectedRouteIndex] ?? null : null;
  const selectedFromLabel = selectedRoute ? labelFor(inputs, selectedRoute.from) : '';
  const selectedToLabel = selectedRoute ? labelFor(outputs, selectedRoute.to) : '';

  return (
    <section
      ref={canvasRef}
      className="relative flex-1 overflow-hidden bg-dsp-bg"
      aria-label="Connections"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:24px_24px]" />

      <svg
        ref={svgRef}
        width={layout.width}
        height={layout.height}
        className="absolute inset-0"
        onPointerDown={(event) => {
          if (event.target === svgRef.current || event.target instanceof SVGRectElement) {
            onSelectRoute(null);
          }
        }}
      >
        <rect x={0} y={0} width={layout.width} height={layout.height} fill="transparent" />

        {routes.map((route, index) => {
          const from = layout.inputPorts.get(portKey('input', route.from));
          const to = layout.outputPorts.get(portKey('output', route.to));
          if (!from || !to) return null;

          const selected = selectedRouteIndex === index;
          const stroke = selected ? '#22d3ee' : 'rgba(34,211,238,0.55)';
          const strokeWidth = selected ? 3 : 2;

          return (
            <path
              key={`${route.from.deviceId}:${route.from.channelIndex}->${route.to.deviceId}:${route.to.channelIndex}`}
              d={buildCurve(from, to, layout.width)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={cn('drop-shadow-sm', route.mute && 'opacity-25')}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectRoute(index);
              }}
            />
          );
        })}

        {dragState && (() => {
          const from = layout.inputPorts.get(portKey('input', dragState.from));
          if (!from) return null;

          const target = dragState.hoverTo
            ? layout.outputPorts.get(portKey('output', dragState.hoverTo))
            : dragState.point;
          if (!target) return null;

          return (
            <path
              d={buildCurve(from, target, layout.width)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })()}
      </svg>

      <div className="relative flex h-full flex-col items-center justify-center p-6">
        {routes.length === 0 && !dragState && (
          <div className="text-center">
            <div className="text-sm font-medium text-dsp-text">No connections</div>
            <div className="mt-1 max-w-sm text-xs text-dsp-text-muted">
              Drag from an input port to an output port to create a route.
            </div>
          </div>
        )}
      </div>

      {selectedRoute && (
        <ConnectionEditor
          className="absolute bottom-6 left-1/2 w-[360px] -translate-x-1/2"
          route={selectedRoute}
          fromLabel={selectedFromLabel}
          toLabel={selectedToLabel}
          onChange={(updates, options) => {
            if (selectedRouteIndex === null) return;
            onUpdateRoute(selectedRouteIndex, updates, options);
          }}
          onDelete={() => {
            if (selectedRouteIndex === null) return;
            onDeleteRoute(selectedRouteIndex);
          }}
        />
      )}
    </section>
  );
}
