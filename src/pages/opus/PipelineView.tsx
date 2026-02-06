import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Filter,
  GitBranch,
  Headphones,
  Mic,
} from 'lucide-react';
import type { ChannelNode, ChannelSide, RouteEdge } from '../../lib/signalflow';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { FILTER_UI } from '../../components/signal-flow/filterUi';
import { InlineLevelMeter } from '../../components/ui/InlineLevelMeter';
import { cn } from '../../lib/utils';
import type { OpusDesignProps } from './types';
import type { FilterType } from '../../types';

/**
 * Design 5: Pipeline / Signal Chain View
 *
 * A left-to-right horizontal pipeline showing signal flow as stages:
 *   Input Devices → Input Processing → Routing → Output Processing → Output Devices
 *
 * Each stage is an expandable column. Clicking a channel in any stage
 * highlights its path through the entire pipeline. Filters are shown
 * inline within each channel's processing block.
 */

function StageHeader({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-dsp-accent" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
        {title}
      </span>
      <span className="rounded-full bg-dsp-primary/40 px-1.5 py-0.5 text-[9px] font-medium text-dsp-text-muted">
        {count}
      </span>
    </div>
  );
}

function PipelineChannelBlock({
  node,
  color,
  level,
  peakHold,
  highlighted,
  expanded,
  onToggle,
  onSelect,
  onOpenFilter,
}: {
  node: ChannelNode;
  side: ChannelSide;
  color: string;
  level?: number;
  peakHold?: number;
  highlighted: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onOpenFilter: (type: FilterType) => void;
}) {
  const filters = node.processing.filters;
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        highlighted
          ? 'border-dsp-accent/40 bg-dsp-accent/5 ring-1 ring-dsp-accent/20'
          : 'border-dsp-primary/20 bg-dsp-surface',
      )}
    >
      {/* Channel header */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => { onSelect(); onToggle(); }}
      >
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-dsp-text">
          {node.label}
        </span>
        {filters.length > 0 && (
          <span className="shrink-0 rounded-full bg-dsp-primary/40 px-1.5 py-0.5 text-[8px] text-dsp-text-muted">
            {filters.length}
          </span>
        )}
        <ChevronIcon className="h-3 w-3 shrink-0 text-dsp-text-muted" />
      </button>

      {/* Level meter (always visible) */}
      <div className="px-3 pb-2">
        <InlineLevelMeter
          level={level ?? -100}
          peakHold={peakHold}
          minDb={-60}
          maxDb={6}
          smoothingMs={100}
          className="w-full"
          meterClassName="h-1.5"
        />
      </div>

      {/* Expanded filter details */}
      {expanded && filters.length > 0 && (
        <div className="border-t border-dsp-primary/15 px-3 py-2">
          <div className="space-y-1">
            {filters.map((filter) => {
              const meta = FILTER_UI[filter.config.type];
              if (!meta) return null;
              const colorVar = `var(--color-filter-${meta.color})`;
              return (
                <button
                  key={filter.name}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-dsp-primary/20"
                  onClick={(e) => { e.stopPropagation(); onOpenFilter(filter.config.type); }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorVar }} />
                  <span className="text-[10px] text-dsp-text">{meta.shortLabel}</span>
                  <span className="ml-auto truncate text-[9px] text-dsp-text-muted">
                    {filter.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RoutingStage({
  routes,
  inputs,
  outputs,
  channelColors,
  highlightedInputKey,
  highlightedOutputKey,
  onSelectRoute,
}: {
  routes: RouteEdge[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  channelColors: Record<string, string>;
  highlightedInputKey: string | null;
  highlightedOutputKey: string | null;
  onSelectRoute: (index: number) => void;
}) {
  if (routes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-dsp-primary/20 px-4 py-8 text-center text-xs text-dsp-text-muted">
        No routes defined.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {routes.map((route, index) => {
        const fromKey = portKey('input', route.from);
        const toKey = portKey('output', route.to);
        const color = channelColors[fromKey] ?? '#22d3ee';
        const fromChannel = inputs.find(
          (ch) => ch.deviceId === route.from.deviceId && ch.channelIndex === route.from.channelIndex,
        );
        const toChannel = outputs.find(
          (ch) => ch.deviceId === route.to.deviceId && ch.channelIndex === route.to.channelIndex,
        );

        const isHighlighted =
          (highlightedInputKey !== null && fromKey === highlightedInputKey) ||
          (highlightedOutputKey !== null && toKey === highlightedOutputKey);

        return (
          <button
            key={index}
            type="button"
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors',
              isHighlighted
                ? 'border-dsp-accent/40 bg-dsp-accent/5'
                : route.mute
                  ? 'border-dsp-primary/15 bg-dsp-bg/50 opacity-40'
                  : 'border-dsp-primary/20 bg-dsp-surface hover:border-dsp-primary/40',
            )}
            onClick={() => onSelectRoute(index)}
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="min-w-0 truncate text-[9px] text-dsp-text">
              {fromChannel?.label ?? '?'}
            </span>
            <ArrowRight className="h-2.5 w-2.5 shrink-0 text-dsp-text-muted" />
            <span className="min-w-0 truncate text-[9px] text-dsp-text">
              {toChannel?.label ?? '?'}
            </span>
            {route.gain !== 0 && (
              <span
                className={cn(
                  'ml-auto shrink-0 font-mono text-[8px]',
                  route.gain > 0 ? 'text-meter-green' : 'text-meter-red',
                )}
              >
                {route.gain > 0 ? '+' : ''}{route.gain.toFixed(1)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PipelineView({ state }: OpusDesignProps) {
  const { model, selection, captureLevels, playbackLevels, windows } = state;
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Track which channel is highlighted for pipeline path tracing
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  // Figure out highlight for route stage
  const highlightedInputKey = useMemo(() => {
    if (!highlightedKey) return null;
    // Check if it's an input
    for (const ch of model.inputs) {
      const key = portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
      if (key === highlightedKey) return key;
    }
    // If it's an output, find connected inputs via routes
    return null;
  }, [highlightedKey, model.inputs]);

  const highlightedOutputKey = useMemo(() => {
    if (!highlightedKey) return null;
    for (const ch of model.outputs) {
      const key = portKey('output', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
      if (key === highlightedKey) return key;
    }
    return null;
  }, [highlightedKey, model.outputs]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onOpenFilter = useCallback(
    (channel: ChannelNode, type: FilterType) => {
      windows.openFilterWindow(channel, type);
    },
    [windows],
  );

  return (
    <div className="flex h-full flex-col bg-dsp-bg">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-dsp-primary/30 bg-dsp-surface px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
          Signal Pipeline
        </span>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-dsp-text-muted">
          <span>Signal flows left → right</span>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        {/* Stage 1: Input Capture */}
        <div className="flex w-56 shrink-0 flex-col border-r border-dsp-primary/20 bg-dsp-bg">
          <div className="border-b border-dsp-primary/20 px-4 py-3">
            <StageHeader icon={Mic} title="Capture" count={model.inputs.length} />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {model.inputs.map((ch) => {
              const key = portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              const levelData = captureLevels[ch.channelIndex];
              return (
                <PipelineChannelBlock
                  key={key}
                  node={ch}
                  side="input"
                  color={model.channelColors[key] ?? '#22d3ee'}
                  level={levelData?.peak}
                  peakHold={levelData?.peakHold}
                  highlighted={highlightedKey === key}
                  expanded={expandedChannels.has(key)}
                  onToggle={() => toggleExpanded(key)}
                  onSelect={() => setHighlightedKey((prev) => (prev === key ? null : key))}
                  onOpenFilter={(type) => onOpenFilter(ch, type)}
                />
              );
            })}
          </div>
        </div>

        {/* Arrow connector */}
        <div className="flex w-8 shrink-0 items-center justify-center bg-dsp-bg">
          <ArrowRight className="h-4 w-4 text-dsp-primary" />
        </div>

        {/* Stage 2: Input Processing (show filters summary) */}
        <div className="flex w-52 shrink-0 flex-col border-r border-dsp-primary/20 bg-dsp-bg">
          <div className="border-b border-dsp-primary/20 px-4 py-3">
            <StageHeader
              icon={Filter}
              title="Input DSP"
              count={model.inputs.reduce((sum, ch) => sum + ch.processing.filters.length, 0)}
            />
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
            {model.inputs.map((ch) => {
              const key = portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              const color = model.channelColors[key] ?? '#22d3ee';
              const filters = ch.processing.filters;
              const isHighlighted = highlightedKey === key;

              if (filters.length === 0) return null;

              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-md border px-2 py-1.5',
                    isHighlighted
                      ? 'border-dsp-accent/30 bg-dsp-accent/5'
                      : 'border-dsp-primary/15 bg-dsp-surface',
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate text-[9px] font-medium text-dsp-text">{ch.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {filters.map((f) => {
                      const meta = FILTER_UI[f.config.type];
                      return (
                        <span
                          key={f.name}
                          className="rounded px-1 py-0.5 text-[8px] font-medium"
                          style={{
                            backgroundColor: `color-mix(in oklab, var(--color-filter-${meta?.color ?? 'inactive'}) 15%, transparent)`,
                            color: `var(--color-filter-${meta?.color ?? 'inactive'})`,
                          }}
                        >
                          {meta?.shortLabel ?? f.config.type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {model.inputs.every((ch) => ch.processing.filters.length === 0) && (
              <div className="py-8 text-center text-[10px] text-dsp-text-muted">
                No input processing
              </div>
            )}
          </div>
        </div>

        {/* Arrow connector */}
        <div className="flex w-8 shrink-0 items-center justify-center bg-dsp-bg">
          <ArrowRight className="h-4 w-4 text-dsp-primary" />
        </div>

        {/* Stage 3: Routing */}
        <div className="flex w-56 shrink-0 flex-col border-r border-dsp-primary/20 bg-dsp-bg">
          <div className="border-b border-dsp-primary/20 px-4 py-3">
            <StageHeader icon={GitBranch} title="Routing" count={model.routes.length} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <RoutingStage
              routes={model.routes}
              inputs={model.inputs}
              outputs={model.outputs}
              channelColors={model.channelColors}
              highlightedInputKey={highlightedInputKey}
              highlightedOutputKey={highlightedOutputKey}
              onSelectRoute={selection.setSelectedRouteIndex}
            />
          </div>
        </div>

        {/* Arrow connector */}
        <div className="flex w-8 shrink-0 items-center justify-center bg-dsp-bg">
          <ArrowRight className="h-4 w-4 text-dsp-primary" />
        </div>

        {/* Stage 4: Output Processing */}
        <div className="flex w-52 shrink-0 flex-col border-r border-dsp-primary/20 bg-dsp-bg">
          <div className="border-b border-dsp-primary/20 px-4 py-3">
            <StageHeader
              icon={Filter}
              title="Output DSP"
              count={model.outputs.reduce((sum, ch) => sum + ch.processing.filters.length, 0)}
            />
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
            {model.outputs.map((ch) => {
              const key = portKey('output', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              const color = model.channelColors[key] ?? '#22d3ee';
              const filters = ch.processing.filters;
              const isHighlighted = highlightedKey === key;

              if (filters.length === 0) return null;

              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-md border px-2 py-1.5',
                    isHighlighted
                      ? 'border-dsp-accent/30 bg-dsp-accent/5'
                      : 'border-dsp-primary/15 bg-dsp-surface',
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate text-[9px] font-medium text-dsp-text">{ch.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {filters.map((f) => {
                      const meta = FILTER_UI[f.config.type];
                      return (
                        <span
                          key={f.name}
                          className="rounded px-1 py-0.5 text-[8px] font-medium"
                          style={{
                            backgroundColor: `color-mix(in oklab, var(--color-filter-${meta?.color ?? 'inactive'}) 15%, transparent)`,
                            color: `var(--color-filter-${meta?.color ?? 'inactive'})`,
                          }}
                        >
                          {meta?.shortLabel ?? f.config.type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {model.outputs.every((ch) => ch.processing.filters.length === 0) && (
              <div className="py-8 text-center text-[10px] text-dsp-text-muted">
                No output processing
              </div>
            )}
          </div>
        </div>

        {/* Arrow connector */}
        <div className="flex w-8 shrink-0 items-center justify-center bg-dsp-bg">
          <ArrowRight className="h-4 w-4 text-dsp-primary" />
        </div>

        {/* Stage 5: Output Playback */}
        <div className="flex w-56 shrink-0 flex-col bg-dsp-bg">
          <div className="border-b border-dsp-primary/20 px-4 py-3">
            <StageHeader icon={Headphones} title="Playback" count={model.outputs.length} />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {model.outputs.map((ch) => {
              const key = portKey('output', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              const levelData = playbackLevels[ch.channelIndex];
              return (
                <PipelineChannelBlock
                  key={key}
                  node={ch}
                  side="output"
                  color={model.channelColors[key] ?? '#22d3ee'}
                  level={levelData?.peak}
                  peakHold={levelData?.peakHold}
                  highlighted={highlightedKey === key}
                  expanded={expandedChannels.has(key)}
                  onToggle={() => toggleExpanded(key)}
                  onSelect={() => setHighlightedKey((prev) => (prev === key ? null : key))}
                  onOpenFilter={(type) => onOpenFilter(ch, type)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
