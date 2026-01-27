import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelNode, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import { cn } from '../../lib/utils';

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
  inputPortColors?: Record<string, string>;
  dragState: DragState | null;
  selectedRouteIndex: number | null;
  onSelectRoute: (index: number | null) => void;
  onRouteActivate?: (index: number, point: { x: number; y: number }) => void;
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

function getCurveMidpoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
): { x: number; y: number } {
  // Approximate midpoint of cubic bezier at t=0.5
  const tension = Math.max(80, Math.min(260, width * 0.35));
  const c1x = from.x + tension;
  const c2x = to.x - tension;
  // Cubic bezier at t=0.5: B(0.5) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
  const t = 0.5;
  const mt = 1 - t;
  const x = mt * mt * mt * from.x + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * to.x;
  const y = mt * mt * mt * from.y + 3 * mt * mt * t * from.y + 3 * mt * t * t * to.y + t * t * t * to.y;
  return { x, y };
}

function formatGain(gain: number): string {
  if (Math.abs(gain) < 0.05) return '0';
  const sign = gain > 0 ? '+' : '';
  return `${sign}${gain.toFixed(1)}`;
}

export function ConnectionsCanvas({
  canvasRef,
  inputBankRef,
  outputBankRef,
  inputs,
  outputs,
  routes,
  inputPortColors,
  dragState,
  selectedRouteIndex,
  onSelectRoute,
  onRouteActivate,
}: ConnectionsCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    let rafId: number | null = null;
    const request = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setLayoutTick((tick) => tick + 1);
      });
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            request();
          });

    const banks = [inputBankRef.current, outputBankRef.current].filter(Boolean) as HTMLElement[];
    const bankContents = banks
      .map((bank) => bank.querySelector<HTMLElement>('[data-sf-bank-content]'))
      .filter(Boolean) as HTMLElement[];

    resizeObserver?.observe(canvasEl);
    for (const content of bankContents) {
      resizeObserver?.observe(content);
    }

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
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
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
    const inset = 2;

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

  return (
    <section
      ref={canvasRef}
      className="relative min-w-40 w-40 shrink overflow-hidden bg-dsp-bg"
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
          const hovered = hoveredRouteIndex === index;
          const baseColor = inputPortColors?.[portKey('input', route.from)] ?? '#22d3ee';
          const stroke = baseColor;
          const strokeWidth = selected ? 3.5 : hovered ? 3 : 2;
          const pathD = buildCurve(from, to, layout.width);

          return (
            <g key={`${route.from.deviceId}:${route.from.channelIndex}->${route.to.deviceId}:${route.to.channelIndex}`}>
              {/* Invisible wider path for easier clicking */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => { setHoveredRouteIndex(index); }}
                onMouseLeave={() => { setHoveredRouteIndex(null); }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectRoute(index);
                  onRouteActivate?.(index, { x: event.clientX, y: event.clientY });
                }}
              />
              {/* Glow effect on hover/select */}
              {(selected || hovered) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={0.3}
                  strokeWidth={selected ? 8 : 6}
                  strokeLinecap="round"
                  className={cn(route.mute && 'opacity-25')}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Visible path */}
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeOpacity={selected || hovered ? 1 : 0.55}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className={cn('drop-shadow-sm transition-all', route.mute && 'opacity-25')}
                style={{ pointerEvents: 'none' }}
              />
              {/* Gain label - shown when route has non-zero gain or is selected/hovered */}
              {(route.gain !== 0 || selected || hovered) && (() => {
                const mid = getCurveMidpoint(from, to, layout.width);
                const showLabel = route.gain !== 0 || selected || hovered;
                if (!showLabel) return null;
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={mid.x - 18}
                      y={mid.y - 9}
                      width={36}
                      height={18}
                      rx={4}
                      fill="rgba(0,0,0,0.75)"
                      className={cn(route.mute && 'opacity-50')}
                    />
                    <text
                      x={mid.x}
                      y={mid.y + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily="monospace"
                      fill={route.gain === 0 ? '#888' : route.gain > 0 ? '#4ade80' : '#f87171'}
                      className={cn(route.mute && 'opacity-50')}
                    >
                      {formatGain(route.gain)}dB
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {dragState && (() => {
          const from = layout.inputPorts.get(portKey('input', dragState.from));
          if (!from) return null;

          const target = dragState.hoverTo
            ? layout.outputPorts.get(portKey('output', dragState.hoverTo))
            : dragState.point;
          if (!target) return null;

          const stroke = inputPortColors?.[portKey('input', dragState.from)] ?? '#22d3ee';

          return (
            <path
              d={buildCurve(from, target, layout.width)}
              fill="none"
              stroke={stroke}
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

    </section>
  );
}
