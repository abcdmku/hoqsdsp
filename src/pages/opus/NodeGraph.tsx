import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChannelNode, ChannelSide } from '../../lib/signalflow';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { FILTER_UI } from '../../components/signal-flow/filterUi';
import type { OpusDesignProps } from './types';
import type { FilterType } from '../../types';

/**
 * Design 2: Node Graph
 *
 * Inspired by node-based audio tools (Max/MSP, Pure Data, Unreal Blueprints).
 * Each channel is a node box with input/output pins. Routes are drawn as
 * SVG connections between pins. Filter processing is shown as stacked
 * sub-nodes inside each channel node.
 */

const NODE_WIDTH = 200;
const NODE_HEADER_H = 36;
const FILTER_ROW_H = 24;
const NODE_FOOTER_H = 28;
const NODE_GAP_Y = 16;
const COLUMN_GAP = 320;
const LEFT_MARGIN = 40;
const TOP_MARGIN = 40;

interface NodePosition {
  x: number;
  y: number;
  height: number;
  pinY: number; // y position of the connection pin
}

function computeNodeHeight(filterCount: number): number {
  return NODE_HEADER_H + Math.max(1, filterCount) * FILTER_ROW_H + NODE_FOOTER_H;
}

function ChannelNodeBox({
  node,
  side,
  x,
  y,
  height,
  color,
  selected,
  connectionCount,
  onSelect,
  onOpenFilter,
}: {
  node: ChannelNode;
  side: ChannelSide;
  x: number;
  y: number;
  height: number;
  color: string;
  selected: boolean;
  connectionCount: number;
  onSelect: () => void;
  onOpenFilter: (type: FilterType) => void;
}) {
  const filters = node.processing.filters;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ cursor: 'pointer' }}
    >
      {/* Node body */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={height}
        rx={6}
        fill="var(--color-dsp-surface)"
        stroke={selected ? 'var(--color-dsp-accent)' : color}
        strokeWidth={selected ? 2 : 1}
        strokeOpacity={selected ? 0.8 : 0.4}
      />

      {/* Header bar */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={NODE_HEADER_H}
        rx={6}
        fill={color}
        fillOpacity={0.15}
      />
      {/* Square off bottom corners of header */}
      <rect
        x={0}
        y={NODE_HEADER_H - 6}
        width={NODE_WIDTH}
        height={6}
        fill={color}
        fillOpacity={0.15}
      />

      {/* Side indicator */}
      <text
        x={10}
        y={NODE_HEADER_H / 2 + 1}
        dominantBaseline="central"
        fontSize={9}
        fontWeight={700}
        letterSpacing="0.08em"
        fill={color}
        opacity={0.7}
      >
        {side === 'input' ? 'IN' : 'OUT'}
      </text>

      {/* Channel label */}
      <text
        x={32}
        y={NODE_HEADER_H / 2 + 1}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
        fill="var(--color-dsp-text)"
      >
        {node.label.length > 18 ? `${node.label.slice(0, 18)}...` : node.label}
      </text>

      {/* Connection pin */}
      <circle
        cx={side === 'input' ? NODE_WIDTH + 6 : -6}
        cy={NODE_HEADER_H / 2}
        r={5}
        fill={color}
        stroke="var(--color-dsp-bg)"
        strokeWidth={2}
      />

      {/* Filter rows */}
      {filters.length > 0 ? (
        filters.map((filter, i) => {
          const meta = FILTER_UI[filter.config.type];
          return (
            <g
              key={filter.name}
              transform={`translate(0, ${NODE_HEADER_H + i * FILTER_ROW_H})`}
              onClick={(e) => { e.stopPropagation(); onOpenFilter(filter.config.type); }}
            >
              <rect
                x={8}
                y={2}
                width={NODE_WIDTH - 16}
                height={FILTER_ROW_H - 4}
                rx={3}
                fill="var(--color-dsp-bg)"
                fillOpacity={0.6}
              />
              <circle
                cx={18}
                cy={FILTER_ROW_H / 2}
                r={3}
                fill={`var(--color-filter-${meta?.color ?? 'inactive'})`}
              />
              <text
                x={28}
                y={FILTER_ROW_H / 2 + 1}
                dominantBaseline="central"
                fontSize={10}
                fill="var(--color-dsp-text-muted)"
              >
                {meta?.shortLabel ?? filter.config.type}
              </text>
              <text
                x={NODE_WIDTH - 16}
                y={FILTER_ROW_H / 2 + 1}
                dominantBaseline="central"
                textAnchor="end"
                fontSize={9}
                fill="var(--color-dsp-text-muted)"
                opacity={0.5}
              >
                {filter.name.length > 14 ? `${filter.name.slice(0, 14)}...` : filter.name}
              </text>
            </g>
          );
        })
      ) : (
        <text
          x={NODE_WIDTH / 2}
          y={NODE_HEADER_H + FILTER_ROW_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill="var(--color-dsp-text-muted)"
          opacity={0.4}
        >
          No filters
        </text>
      )}

      {/* Footer - route count */}
      <text
        x={NODE_WIDTH / 2}
        y={height - NODE_FOOTER_H / 2 + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill="var(--color-dsp-text-muted)"
      >
        {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
      </text>
    </g>
  );
}

export function NodeGraph({ state }: OpusDesignProps) {
  const { model, selection, windows } = state;
  const svgRef = useRef<SVGSVGElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const onSelectChannel = useCallback(
    (side: ChannelSide, channel: ChannelNode) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      selection.setSelectedChannelKey(portKey(side, endpoint));
    },
    [selection],
  );

  const onOpenFilter = useCallback(
    (channel: ChannelNode, type: FilterType) => {
      windows.openFilterWindow(channel, type);
    },
    [windows],
  );

  // Compute node positions
  const { inputPositions, outputPositions, totalHeight, totalWidth } = useMemo(() => {
    const inputPos = new Map<string, NodePosition>();
    const outputPos = new Map<string, NodePosition>();

    let inputY = TOP_MARGIN;
    for (const channel of model.inputs) {
      const key = portKey('input', { deviceId: channel.deviceId, channelIndex: channel.channelIndex });
      const h = computeNodeHeight(channel.processing.filters.length);
      inputPos.set(key, { x: LEFT_MARGIN, y: inputY, height: h, pinY: inputY + NODE_HEADER_H / 2 });
      inputY += h + NODE_GAP_Y;
    }

    const outputX = LEFT_MARGIN + NODE_WIDTH + COLUMN_GAP;
    let outputY = TOP_MARGIN;
    for (const channel of model.outputs) {
      const key = portKey('output', { deviceId: channel.deviceId, channelIndex: channel.channelIndex });
      const h = computeNodeHeight(channel.processing.filters.length);
      outputPos.set(key, { x: outputX, y: outputY, height: h, pinY: outputY + NODE_HEADER_H / 2 });
      outputY += h + NODE_GAP_Y;
    }

    return {
      inputPositions: inputPos,
      outputPositions: outputPos,
      totalHeight: Math.max(inputY, outputY) + TOP_MARGIN,
      totalWidth: outputX + NODE_WIDTH + LEFT_MARGIN,
    };
  }, [model.inputs, model.outputs]);

  // Pan handlers
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 1 && !e.altKey) return; // middle-click or alt+click
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, offsetX: panOffset.x, offsetY: panOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [panOffset]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: panStartRef.current.offsetX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.offsetY + (e.clientY - panStartRef.current.y),
    });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div className="flex h-full flex-col bg-dsp-bg">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-dsp-primary/30 bg-dsp-surface px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
          Node Graph
        </span>
        <span className="text-[10px] text-dsp-text-muted">
          Alt+Drag to pan
        </span>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-dsp-text-muted">
          <span>{model.inputs.length} inputs</span>
          <span className="text-dsp-primary">|</span>
          <span>{model.outputs.length} outputs</span>
          <span className="text-dsp-primary">|</span>
          <span>{model.routes.length} routes</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto"
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <svg
          ref={svgRef}
          width={totalWidth + 200}
          height={totalHeight}
          className="select-none"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
        >
          {/* Grid background */}
          <defs>
            <pattern id="opus-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.04)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#opus-grid)" />

          {/* Route connections */}
          {model.routes.map((route, index) => {
            const fromKey = portKey('input', route.from);
            const toKey = portKey('output', route.to);
            const fromPos = inputPositions.get(fromKey);
            const toPos = outputPositions.get(toKey);
            if (!fromPos || !toPos) return null;

            const fromX = fromPos.x + NODE_WIDTH + 6;
            const fromY = fromPos.pinY;
            const toX = toPos.x - 6;
            const toY = toPos.pinY;
            const color = model.channelColors[fromKey] ?? '#22d3ee';
            const selected = state.selection.selectedRouteIndex === index;
            const tension = COLUMN_GAP * 0.35;

            return (
              <g key={`route-${index}`}>
                {/* Hit area */}
                <path
                  d={`M ${fromX} ${fromY} C ${fromX + tension} ${fromY}, ${toX - tension} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selection.setSelectedRouteIndex(index);
                  }}
                />
                {/* Visible path */}
                {selected && (
                  <path
                    d={`M ${fromX} ${fromY} C ${fromX + tension} ${fromY}, ${toX - tension} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.3}
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                )}
                <path
                  d={`M ${fromX} ${fromY} C ${fromX + tension} ${fromY}, ${toX - tension} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke={color}
                  strokeOpacity={route.mute ? 0.15 : selected ? 1 : 0.5}
                  strokeWidth={selected ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray={route.mute ? '4 4' : undefined}
                />
                {/* Gain label */}
                {(route.gain !== 0 || selected) && (() => {
                  const mx = (fromX + toX) / 2;
                  const my = (fromY + toY) / 2;
                  return (
                    <g>
                      <rect x={mx - 20} y={my - 9} width={40} height={18} rx={4} fill="rgba(0,0,0,0.85)" />
                      <text
                        x={mx}
                        y={my + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fontFamily="monospace"
                        fill={route.gain === 0 ? '#888' : route.gain > 0 ? '#4ade80' : '#f87171'}
                      >
                        {route.gain > 0 ? '+' : ''}{route.gain.toFixed(1)}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Input nodes */}
          {model.inputs.map((channel) => {
            const key = portKey('input', { deviceId: channel.deviceId, channelIndex: channel.channelIndex });
            const pos = inputPositions.get(key);
            if (!pos) return null;
            return (
              <ChannelNodeBox
                key={key}
                node={channel}
                side="input"
                x={pos.x}
                y={pos.y}
                height={pos.height}
                color={model.channelColors[key] ?? '#22d3ee'}
                selected={selection.selectedChannelKey === key}
                connectionCount={model.connectionCounts[key] ?? 0}
                onSelect={() => onSelectChannel('input', channel)}
                onOpenFilter={(type) => onOpenFilter(channel, type)}
              />
            );
          })}

          {/* Output nodes */}
          {model.outputs.map((channel) => {
            const key = portKey('output', { deviceId: channel.deviceId, channelIndex: channel.channelIndex });
            const pos = outputPositions.get(key);
            if (!pos) return null;
            return (
              <ChannelNodeBox
                key={key}
                node={channel}
                side="output"
                x={pos.x}
                y={pos.y}
                height={pos.height}
                color={model.channelColors[key] ?? '#22d3ee'}
                selected={selection.selectedChannelKey === key}
                connectionCount={model.connectionCounts[key] ?? 0}
                onSelect={() => onSelectChannel('output', channel)}
                onOpenFilter={(type) => onOpenFilter(channel, type)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
