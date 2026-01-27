import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useMemo } from 'react';
import type { ChannelNode, ChannelSide, DeviceGroup, RouteEndpoint } from '../../lib/signalflow';
import type { FilterType } from '../../types';
import type { ChannelLevelState } from '../../features/realtime';
import { ChannelCard } from './ChannelCard';

export interface ChannelBankProps {
  title: string;
  side: ChannelSide;
  groups: DeviceGroup[];
  channels: ChannelNode[];
  selectedChannelKey?: string | null;
  /** Single highlighted port (e.g., during drag) */
  highlightedPortKey?: string | null;
  /** Set of highlighted channel keys (e.g., when route is selected/hovered) */
  routeHighlightedKeys?: Set<string>;
  channelColors?: Record<string, string>;
  connectionCounts?: Record<string, number>;
  sampleRate?: number;
  /** Level data for each channel, indexed by channel index */
  channelLevels?: ChannelLevelState[];
  containerRef?: RefObject<HTMLElement | null>;
  onSelectChannel?: (channel: ChannelNode) => void;
  onPortPointerDown?: (side: ChannelSide, endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenFilter?: (channel: ChannelNode, type: FilterType, point?: { x: number; y: number }) => void;
  onOpenChannelSettings?: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  onColorChange?: (channel: ChannelNode, color: string) => void;
  onLabelChange?: (channel: ChannelNode, label: string) => void;
  onOpenConnections?: (channel: ChannelNode, point?: { x: number; y: number }) => void;
  onUpdateFilters?: (
    channel: ChannelNode,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
}

function portKey(side: ChannelSide, node: ChannelNode): string {
  return `${side}:${node.deviceId}:${node.channelIndex}`;
}

export function ChannelBank({
  title,
  side,
  groups,
  channels,
  selectedChannelKey,
  highlightedPortKey,
  routeHighlightedKeys,
  channelColors,
  connectionCounts,
  sampleRate,
  channelLevels,
  containerRef,
  onSelectChannel,
  onPortPointerDown,
  onOpenFilter,
  onOpenChannelSettings,
  onColorChange,
  onLabelChange,
  onOpenConnections,
  onUpdateFilters,
}: ChannelBankProps) {
  const channelsByDevice = useMemo(() => {
    const map = new Map<string, ChannelNode[]>();
    for (const channel of channels) {
      const existing = map.get(channel.deviceId);
      if (existing) {
        existing.push(channel);
      } else {
        map.set(channel.deviceId, [channel]);
      }
    }
    return map;
  }, [channels]);

  return (
    <section
      ref={containerRef}
      className={
        side === 'input'
          ? 'flex-1 min-w-50 overflow-y-auto border-r border-dsp-primary/20 bg-dsp-surface'
          : 'flex-1 min-w-50 overflow-y-auto border-l border-dsp-primary/20 bg-dsp-surface'
      }
      aria-label={title}
    >
      <div className="border-b border-dsp-primary/20 px-4 py-3">
        <h2 className="text-sm font-semibold text-dsp-text">{title}</h2>
      </div>

      <div
        data-sf-bank-content
        className={
          side === 'input'
            ? 'space-y-4 py-4 pl-4 pr-2'
            : 'space-y-4 py-4 pl-2 pr-4'
        }
      >
        {groups.map((group) => {
          const groupChannels = channelsByDevice.get(group.id) ?? [];
          if (groupChannels.length === 0) return null;

          return (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
                {group.label}
              </div>
              <div className="space-y-2">
                {groupChannels.map((channel) => {
                  const key = portKey(side, channel);
                  const levelData = channelLevels?.[channel.channelIndex];
                  return (
                    <ChannelCard
                      key={`${channel.deviceId}:${channel.channelIndex}`}
                      node={channel}
                      side={side}
                      portKey={key}
                      channelColor={channelColors?.[key]}
                      connectionCount={connectionCounts?.[key] ?? 0}
                      sampleRate={sampleRate}
                      level={levelData?.peak}
                      peakHold={levelData?.peakHold}
                      selected={selectedChannelKey === key}
                      portHighlighted={highlightedPortKey === key}
                      routeHighlighted={routeHighlightedKeys?.has(key) ?? false}
                      onSelect={() => {
                        onSelectChannel?.(channel);
                      }}
                      onPortPointerDown={(endpoint, event) => {
                        onPortPointerDown?.(side, endpoint, event);
                      }}
                      onOpenFilter={(type, point) => {
                        onOpenFilter?.(channel, type, point);
                      }}
                      onOpenChannelSettings={(point) => {
                        onOpenChannelSettings?.(channel, point);
                      }}
                      onColorChange={(color) => {
                        onColorChange?.(channel, color);
                      }}
                      onLabelChange={(label) => {
                        onLabelChange?.(channel, label);
                      }}
                      onOpenConnections={(point) => {
                        onOpenConnections?.(channel, point);
                      }}
                      onUpdateFilters={(filters, options) => {
                        onUpdateFilters?.(channel, filters, options);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg px-3 py-4 text-center text-xs text-dsp-text-muted">
            No channels detected.
          </div>
        )}
      </div>
    </section>
  );
}
