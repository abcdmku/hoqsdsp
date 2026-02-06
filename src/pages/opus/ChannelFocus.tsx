import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { ChannelNode, ChannelSide, RouteEdge } from '../../lib/signalflow';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { FILTER_UI, type FilterUiMeta } from '../../components/signal-flow/filterUi';
import { InlineLevelMeter } from '../../components/ui/InlineLevelMeter';
import { cn } from '../../lib/utils';
import type { OpusDesignProps } from './types';
import type { FilterType } from '../../types';

/**
 * Design 4: Channel Focus
 *
 * A single-channel deep-dive interface. A sidebar shows all channels
 * for selection. The main area shows a comprehensive view of the
 * selected channel: its processing chain, all routes, meters,
 * and detailed filter parameters.
 */

function ChannelListItem({
  node,
  color,
  active,
  connectionCount,
  onClick,
}: {
  node: ChannelNode;
  side: ChannelSide;
  color: string;
  selected: boolean;
  active: boolean;
  connectionCount: number;
  level?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active
          ? 'bg-dsp-accent/10 text-dsp-text ring-1 ring-dsp-accent/30'
          : 'text-dsp-text-muted hover:bg-dsp-primary/30 hover:text-dsp-text',
      )}
      onClick={onClick}
    >
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate text-xs">{node.label}</span>
      {connectionCount > 0 && (
        <span className="shrink-0 text-[9px] text-dsp-text-muted">{connectionCount}</span>
      )}
    </button>
  );
}

function FilterCard({
  name,
  meta,
  onOpen,
}: {
  name: string;
  meta: FilterUiMeta;
  filterConfig: Record<string, unknown>;
  onOpen: () => void;
}) {
  const Icon = meta.icon;
  const colorVar = `var(--color-filter-${meta.color})`;

  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-lg border border-dsp-primary/20 bg-dsp-surface px-4 py-3 text-left transition-colors hover:border-dsp-primary/40 hover:bg-dsp-primary/10"
      onClick={onOpen}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `color-mix(in oklab, ${colorVar} 15%, transparent)` }}
      >
        <Icon className="h-4 w-4" style={{ color: colorVar }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-dsp-text">{meta.label}</div>
        <div className="truncate text-[10px] text-dsp-text-muted">{name}</div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-dsp-text-muted" />
    </button>
  );
}

function RouteCard({
  route,
  label,
  color,
  direction,
  onClick,
}: {
  route: RouteEdge;
  label: string;
  color: string;
  direction: 'from' | 'to';
  onClick: () => void;
}) {
  const DirIcon = direction === 'from' ? ArrowRight : ArrowLeft;
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors',
        route.mute
          ? 'border-dsp-primary/20 bg-dsp-bg/50 opacity-50'
          : 'border-dsp-primary/20 bg-dsp-surface hover:border-dsp-primary/40',
      )}
      onClick={onClick}
    >
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <DirIcon className="h-3 w-3 shrink-0 text-dsp-text-muted" />
      <span className="min-w-0 flex-1 truncate text-xs text-dsp-text">{label}</span>
      <span
        className={cn(
          'shrink-0 font-mono text-[10px]',
          route.gain === 0 ? 'text-dsp-text-muted' : route.gain > 0 ? 'text-meter-green' : 'text-meter-red',
        )}
      >
        {route.gain > 0 ? '+' : ''}{route.gain.toFixed(1)} dB
      </span>
      {route.inverted && (
        <span className="shrink-0 rounded bg-filter-gain/15 px-1 py-0.5 text-[8px] font-bold text-filter-gain">
          INV
        </span>
      )}
    </button>
  );
}

export function ChannelFocus({ state }: OpusDesignProps) {
  const { model, selection, captureLevels, playbackLevels, windows } = state;

  const [activeChannelKey, setActiveChannelKey] = useState<string | null>(() => {
    if (model.inputs.length > 0) {
      const ch = model.inputs[0]!;
      return portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
    }
    return null;
  });

  // Find the active channel
  const { activeChannel, activeSide } = useMemo(() => {
    if (!activeChannelKey) return { activeChannel: null, activeSide: 'input' as ChannelSide };

    for (const ch of model.inputs) {
      const key = portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
      if (key === activeChannelKey) return { activeChannel: ch, activeSide: 'input' as ChannelSide };
    }
    for (const ch of model.outputs) {
      const key = portKey('output', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
      if (key === activeChannelKey) return { activeChannel: ch, activeSide: 'output' as ChannelSide };
    }
    return { activeChannel: null, activeSide: 'input' as ChannelSide };
  }, [activeChannelKey, model.inputs, model.outputs]);

  // Routes connected to this channel
  const connectedRoutes = useMemo(() => {
    if (!activeChannel) return [];
    return model.routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => {
        if (activeSide === 'input') {
          return (
            route.from.deviceId === activeChannel.deviceId &&
            route.from.channelIndex === activeChannel.channelIndex
          );
        }
        return (
          route.to.deviceId === activeChannel.deviceId &&
          route.to.channelIndex === activeChannel.channelIndex
        );
      });
  }, [activeChannel, activeSide, model.routes]);

  const onOpenFilter = useCallback(
    (type: FilterType) => {
      if (!activeChannel) return;
      windows.openFilterWindow(activeChannel, type);
    },
    [activeChannel, windows],
  );

  const activeColor = activeChannelKey ? model.channelColors[activeChannelKey] ?? '#22d3ee' : '#22d3ee';
  const activeLevels = activeSide === 'input' ? captureLevels : playbackLevels;
  const activeLevel = activeChannel ? activeLevels[activeChannel.channelIndex] : undefined;

  return (
    <div className="flex h-full bg-dsp-bg">
      {/* Channel list sidebar */}
      <div className="flex w-52 shrink-0 flex-col border-r border-dsp-primary/30 bg-dsp-surface">
        <div className="border-b border-dsp-primary/20 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
            Channels
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Inputs */}
          <div className="px-2 pt-3 pb-1">
            <span className="px-2 text-[9px] font-semibold uppercase tracking-wider text-dsp-accent">
              Inputs
            </span>
          </div>
          <div className="space-y-0.5 px-2">
            {model.inputs.map((ch) => {
              const key = portKey('input', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              return (
                <ChannelListItem
                  key={key}
                  node={ch}
                  side="input"
                  color={model.channelColors[key] ?? '#22d3ee'}
                  selected={selection.selectedChannelKey === key}
                  active={activeChannelKey === key}
                  connectionCount={model.connectionCounts[key] ?? 0}
                  level={captureLevels[ch.channelIndex]?.peak}
                  onClick={() => setActiveChannelKey(key)}
                />
              );
            })}
          </div>

          {/* Outputs */}
          <div className="px-2 pt-4 pb-1">
            <span className="px-2 text-[9px] font-semibold uppercase tracking-wider text-dsp-accent">
              Outputs
            </span>
          </div>
          <div className="space-y-0.5 px-2 pb-3">
            {model.outputs.map((ch) => {
              const key = portKey('output', { deviceId: ch.deviceId, channelIndex: ch.channelIndex });
              return (
                <ChannelListItem
                  key={key}
                  node={ch}
                  side="output"
                  color={model.channelColors[key] ?? '#22d3ee'}
                  selected={selection.selectedChannelKey === key}
                  active={activeChannelKey === key}
                  connectionCount={model.connectionCounts[key] ?? 0}
                  level={playbackLevels[ch.channelIndex]?.peak}
                  onClick={() => setActiveChannelKey(key)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {activeChannel ? (
          <div className="mx-auto max-w-3xl px-6 py-6">
            {/* Channel header */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className="h-10 w-10 rounded-lg"
                style={{ backgroundColor: `${activeColor}20`, border: `2px solid ${activeColor}` }}
              />
              <div>
                <h2 className="text-lg font-bold text-dsp-text">{activeChannel.label}</h2>
                <span className="text-xs text-dsp-text-muted">
                  {activeSide === 'input' ? 'Input' : 'Output'} Channel &middot; {activeChannel.deviceId}
                </span>
              </div>
              <div className="ml-auto">
                <InlineLevelMeter
                  level={activeLevel?.peak ?? -100}
                  peakHold={activeLevel?.peakHold}
                  minDb={-60}
                  maxDb={6}
                  showValue
                  showScale
                  scalePosition="top"
                  valuePosition="right"
                  smoothingMs={100}
                  className="w-48"
                />
              </div>
            </div>

            {/* Processing chain */}
            <section className="mb-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-dsp-text-muted">
                Processing Chain
              </h3>
              {activeChannel.processing.filters.length > 0 ? (
                <div className="space-y-2">
                  {activeChannel.processing.filters.map((filter) => {
                    const meta = FILTER_UI[filter.config.type];
                    if (!meta) return null;
                    return (
                      <FilterCard
                        key={filter.name}
                        name={filter.name}
                        meta={meta}
                        filterConfig={filter.config as unknown as Record<string, unknown>}
                        onOpen={() => onOpenFilter(filter.config.type)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-dsp-primary/30 px-4 py-8 text-center text-xs text-dsp-text-muted">
                  No filters applied to this channel.
                </div>
              )}
            </section>

            {/* Routes */}
            <section className="mb-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-dsp-text-muted">
                Routes ({connectedRoutes.length})
              </h3>
              {connectedRoutes.length > 0 ? (
                <div className="space-y-2">
                  {connectedRoutes.map(({ route, index }) => {
                    const otherEndpoint = activeSide === 'input' ? route.to : route.from;
                    const otherSide = activeSide === 'input' ? 'output' : 'input';
                    const otherChannels = otherSide === 'input' ? model.inputs : model.outputs;
                    const otherChannel = otherChannels.find(
                      (ch) => ch.deviceId === otherEndpoint.deviceId && ch.channelIndex === otherEndpoint.channelIndex,
                    );
                    const otherKey = portKey(otherSide, otherEndpoint);
                    const otherColor = model.channelColors[otherKey] ?? '#22d3ee';

                    return (
                      <RouteCard
                        key={index}
                        route={route}
                        label={otherChannel?.label ?? `${otherEndpoint.deviceId}:${otherEndpoint.channelIndex}`}
                        color={otherColor}
                        direction={activeSide === 'input' ? 'from' : 'to'}
                        onClick={() => selection.setSelectedRouteIndex(index)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-dsp-primary/30 px-4 py-8 text-center text-xs text-dsp-text-muted">
                  No routes connected to this channel.
                </div>
              )}
            </section>

            {/* Processing summary */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-dsp-text-muted">
                Summary
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  label="Biquad Stages"
                  value={String(activeChannel.processingSummary.biquadCount)}
                  active={activeChannel.processingSummary.biquadCount > 0}
                />
                <SummaryCard
                  label="Has Gain"
                  value={activeChannel.processingSummary.hasGain ? 'Yes' : 'No'}
                  active={activeChannel.processingSummary.hasGain}
                />
                <SummaryCard
                  label="Has Delay"
                  value={activeChannel.processingSummary.hasDelay ? 'Yes' : 'No'}
                  active={activeChannel.processingSummary.hasDelay}
                />
                <SummaryCard
                  label="Convolution"
                  value={activeChannel.processingSummary.hasConv ? 'Active' : 'None'}
                  active={activeChannel.processingSummary.hasConv}
                />
                <SummaryCard
                  label="Compressor"
                  value={activeChannel.processingSummary.hasCompressor ? 'Active' : 'None'}
                  active={activeChannel.processingSummary.hasCompressor}
                />
                <SummaryCard
                  label="Dither"
                  value={activeChannel.processingSummary.hasDither ? 'Active' : 'None'}
                  active={activeChannel.processingSummary.hasDither}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-dsp-text-muted">
            Select a channel from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        active ? 'border-dsp-accent/30 bg-dsp-accent/5' : 'border-dsp-primary/20 bg-dsp-surface',
      )}
    >
      <div className="text-[9px] uppercase tracking-wide text-dsp-text-muted">{label}</div>
      <div className={cn('mt-0.5 text-sm font-semibold', active ? 'text-dsp-accent' : 'text-dsp-text-muted')}>
        {value}
      </div>
    </div>
  );
}
