import { useCallback, useMemo, useState } from 'react';
import { AudioLines, SlidersHorizontal, Volume2 } from 'lucide-react';
import type { ChannelNode, ChannelSide } from '../../lib/signalflow';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { InlineLevelMeter } from '../../components/ui/InlineLevelMeter';
import { cn } from '../../lib/utils';
import type { OpusDesignProps } from './types';
import type { FilterType } from '../../types';

/**
 * Design 1: Mixer Console
 *
 * Inspired by physical mixing consoles and DAW mixer views.
 * Channels are displayed as vertical strips arranged horizontally,
 * with VU-style meters, faders, and a sends/routing section.
 * Inputs on the left half, outputs on the right half, with a
 * master bus section in the center.
 */

function MixerStrip({
  node,
  side,
  color,
  level,
  peakHold,
  connectionCount,
  selected,
  onSelect,
  onOpenFilter,
  gainDb,
  hasEq,
  hasDelay,
  hasCompressor,
}: {
  node: ChannelNode;
  side: ChannelSide;
  color: string;
  level?: number;
  peakHold?: number;
  connectionCount: number;
  selected: boolean;
  onSelect: () => void;
  onOpenFilter: (type: FilterType) => void;
  gainDb: number;
  hasEq: boolean;
  hasDelay: boolean;
  hasCompressor: boolean;
}) {
  const [faderValue, setFaderValue] = useState(gainDb);

  // Sync faderValue to gainDb when it changes externally
  useMemo(() => {
    setFaderValue(gainDb);
  }, [gainDb]);

  return (
    <div
      className={cn(
        'flex h-full w-20 shrink-0 flex-col border-r border-dsp-primary/20 bg-dsp-surface transition-colors',
        selected && 'bg-dsp-accent/5 ring-1 ring-inset ring-dsp-accent/30',
      )}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
    >
      {/* Channel label */}
      <div
        className="flex items-center justify-center border-b border-dsp-primary/20 px-1 py-2"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-dsp-text">
          {node.label}
        </span>
      </div>

      {/* Filter quick-access buttons */}
      <div className="flex flex-wrap justify-center gap-1 border-b border-dsp-primary/20 px-1 py-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenFilter('Biquad'); }}
          className={cn(
            'rounded px-1 py-0.5 text-[9px] font-bold transition-colors',
            hasEq ? 'bg-filter-eq/20 text-filter-eq' : 'text-dsp-text-muted hover:text-dsp-text',
          )}
          title="Parametric EQ"
        >
          EQ
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenFilter('Delay'); }}
          className={cn(
            'rounded px-1 py-0.5 text-[9px] font-bold transition-colors',
            hasDelay ? 'bg-filter-delay/20 text-filter-delay' : 'text-dsp-text-muted hover:text-dsp-text',
          )}
          title="Delay"
        >
          DLY
        </button>
        {side === 'output' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenFilter('Compressor'); }}
            className={cn(
              'rounded px-1 py-0.5 text-[9px] font-bold transition-colors',
              hasCompressor ? 'bg-filter-dynamics/20 text-filter-dynamics' : 'text-dsp-text-muted hover:text-dsp-text',
            )}
            title="Compressor"
          >
            CMP
          </button>
        )}
      </div>

      {/* Meter + fader section */}
      <div className="flex flex-1 flex-col items-center justify-end gap-1 px-2 py-2">
        {/* Vertical meter */}
        <div className="flex w-full flex-1 items-stretch justify-center">
          <InlineLevelMeter
            level={level ?? -100}
            peakHold={peakHold}
            minDb={-60}
            maxDb={6}
            orientation="vertical"
            smoothingMs={100}
            className="h-full w-4"
          />
        </div>

        {/* Gain readout */}
        <div className="mt-1 text-center font-mono text-[10px] text-dsp-text-muted">
          {faderValue > 0 ? '+' : ''}{faderValue.toFixed(1)}
        </div>
      </div>

      {/* Route count indicator */}
      <div className="flex items-center justify-center border-t border-dsp-primary/20 py-1.5">
        {connectionCount > 0 ? (
          <span className="rounded-full bg-dsp-accent/15 px-2 py-0.5 text-[9px] font-medium text-dsp-accent">
            {connectionCount} {connectionCount === 1 ? 'route' : 'routes'}
          </span>
        ) : (
          <span className="text-[9px] text-dsp-text-muted">no routes</span>
        )}
      </div>

      {/* Solo / Mute strip */}
      <div
        className="flex items-center justify-center py-1"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

function MixerSection({
  title,
  side,
  channels,
  channelColors,
  channelLevels,
  connectionCounts,
  selectedChannelKey,
  onSelectChannel,
  onOpenFilter,
}: {
  title: string;
  side: ChannelSide;
  channels: ChannelNode[];
  channelColors: Record<string, string>;
  channelLevels: Array<{ peak: number; peakHold?: number }>;
  connectionCounts: Record<string, number>;
  selectedChannelKey: string | null;
  onSelectChannel: (side: ChannelSide, channel: ChannelNode) => void;
  onOpenFilter: (channel: ChannelNode, type: FilterType) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-dsp-primary/30 bg-dsp-bg px-3 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
          {title}
        </h3>
      </div>
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        {channels.map((channel) => {
          const key = portKey(side, { deviceId: channel.deviceId, channelIndex: channel.channelIndex });
          const color = channelColors[key] ?? '#22d3ee';
          const levelData = channelLevels[channel.channelIndex];
          const gainFilter = channel.processing.filters.find((f) => f.config.type === 'Gain');
          const gainDb = gainFilter?.config.type === 'Gain' ? gainFilter.config.parameters.gain : 0;
          const hasEq = channel.processing.filters.some((f) => f.config.type === 'Biquad');
          const hasDelay = channel.processing.filters.some((f) => f.config.type === 'Delay');
          const hasCompressor = channel.processingSummary.hasCompressor;

          return (
            <MixerStrip
              key={key}
              node={channel}
              side={side}
              color={color}
              level={levelData?.peak}
              peakHold={levelData?.peakHold}
              connectionCount={connectionCounts[key] ?? 0}
              selected={selectedChannelKey === key}
              onSelect={() => onSelectChannel(side, channel)}
              onOpenFilter={(type) => onOpenFilter(channel, type)}
              gainDb={gainDb}
              hasEq={hasEq}
              hasDelay={hasDelay}
              hasCompressor={hasCompressor}
            />
          );
        })}
        {channels.length === 0 && (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-dsp-text-muted">
            No channels
          </div>
        )}
      </div>
    </div>
  );
}

export function MixerConsole({ state }: OpusDesignProps) {
  const { model, selection, captureLevels, playbackLevels, windows } = state;

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

  return (
    <div className="flex h-full flex-col bg-dsp-bg">
      {/* Master info bar */}
      <div className="flex items-center gap-6 border-b border-dsp-primary/30 bg-dsp-primary/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-dsp-accent" />
          <span className="text-xs text-dsp-text">
            {model.inputs.length} in / {model.outputs.length} out
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AudioLines className="h-3.5 w-3.5 text-filter-gain" />
          <span className="text-xs text-dsp-text">
            {model.routes.length} routes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-filter-eq" />
          <span className="text-xs text-dsp-text">
            {state.configState.sampleRate} Hz
          </span>
        </div>
      </div>

      {/* Console strips */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input strips */}
        <div className="flex-1 border-r-2 border-dsp-accent/20">
          <MixerSection
            title="Inputs"
            side="input"
            channels={model.inputs}
            channelColors={model.channelColors}
            channelLevels={captureLevels}
            connectionCounts={model.connectionCounts}
            selectedChannelKey={selection.selectedChannelKey}
            onSelectChannel={onSelectChannel}
            onOpenFilter={onOpenFilter}
          />
        </div>

        {/* Center bus section */}
        <div className="flex w-24 flex-col items-center justify-center border-r-2 border-dsp-accent/20 bg-dsp-primary/10">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-dsp-accent">
            Bus
          </div>
          <div className="flex flex-col items-center gap-2">
            {model.routes.length > 0 ? (
              model.routes.slice(0, 8).map((route, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    route.mute ? 'w-4 bg-dsp-text-muted/30' : 'w-8 bg-dsp-accent/60',
                  )}
                />
              ))
            ) : (
              <span className="text-[9px] text-dsp-text-muted">Empty</span>
            )}
            {model.routes.length > 8 && (
              <span className="text-[9px] text-dsp-text-muted">
                +{model.routes.length - 8} more
              </span>
            )}
          </div>
        </div>

        {/* Output strips */}
        <div className="flex-1">
          <MixerSection
            title="Outputs"
            side="output"
            channels={model.outputs}
            channelColors={model.channelColors}
            channelLevels={playbackLevels}
            connectionCounts={model.connectionCounts}
            selectedChannelKey={selection.selectedChannelKey}
            onSelectChannel={onSelectChannel}
            onOpenFilter={onOpenFilter}
          />
        </div>
      </div>
    </div>
  );
}
