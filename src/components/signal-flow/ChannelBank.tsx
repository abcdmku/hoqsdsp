import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useMemo } from 'react';
import type { ChannelNode, ChannelSide, DeviceGroup, RouteEndpoint } from '../../lib/signalflow';
import { ChannelCard } from './ChannelCard';

export interface ChannelBankProps {
  title: string;
  side: ChannelSide;
  groups: DeviceGroup[];
  channels: ChannelNode[];
  selectedChannelKey?: string | null;
  highlightedPortKey?: string | null;
  containerRef?: RefObject<HTMLElement | null>;
  onSelectChannel?: (channel: ChannelNode) => void;
  onPortPointerDown?: (side: ChannelSide, endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
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
  containerRef,
  onSelectChannel,
  onPortPointerDown,
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
          ? 'w-72 shrink-0 overflow-y-auto border-r border-dsp-primary/20 bg-dsp-surface'
          : 'w-72 shrink-0 overflow-y-auto border-l border-dsp-primary/20 bg-dsp-surface'
      }
      aria-label={title}
    >
      <div className="border-b border-dsp-primary/20 px-4 py-3">
        <h2 className="text-sm font-semibold text-dsp-text">{title}</h2>
      </div>

      <div className="space-y-4 p-4">
        {groups.map((group) => {
          const groupChannels = channelsByDevice.get(group.id) ?? [];
          if (groupChannels.length === 0) return null;

          return (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
                {group.label}
              </div>
              <div className="space-y-2">
                {groupChannels.map((channel) => (
                  <ChannelCard
                    key={`${channel.deviceId}:${channel.channelIndex}`}
                    node={channel}
                    side={side}
                    portKey={portKey(side, channel)}
                    selected={selectedChannelKey === portKey(side, channel)}
                    portHighlighted={highlightedPortKey === portKey(side, channel)}
                    onSelect={() => {
                      onSelectChannel?.(channel);
                    }}
                    onPortPointerDown={(endpoint, event) => {
                      onPortPointerDown?.(side, endpoint, event);
                    }}
                  />
                ))}
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
