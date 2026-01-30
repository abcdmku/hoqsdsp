import { useMemo } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../lib/signalflow';
import { sameEndpoint } from '../../lib/signalflow/endpointUtils';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface SignalFlowChannelWindowContentProps {
  node: ChannelNode;
  side: ChannelSide;
  endpoint: RouteEndpoint;
  allSideChannels: ChannelNode[];
  color: string;
  mirrorGroups: RouteEndpoint[][];
  onSetColor: (color: string) => void;
  onSetMirrorMembers: (members: RouteEndpoint[]) => void;
  onCopyChannel: () => void;
  onPasteChannel: () => void;
  canPasteChannel: boolean;
}

export function SignalFlowChannelWindowContent({
  node,
  side,
  endpoint,
  allSideChannels,
  color,
  mirrorGroups,
  onSetColor,
  onSetMirrorMembers,
  onCopyChannel,
  onPasteChannel,
  canPasteChannel,
}: SignalFlowChannelWindowContentProps) {
  const currentGroup = useMemo(() => {
    const group = mirrorGroups.find((members) => members.some((m) => sameEndpoint(m, endpoint))) ?? null;
    return group ? group.filter((m) => !sameEndpoint(m, endpoint)) : [];
  }, [endpoint, mirrorGroups]);

  const otherChannels = useMemo(
    () =>
      allSideChannels.filter(
        (candidate) =>
          !(candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex),
      ),
    [allSideChannels, endpoint.channelIndex, endpoint.deviceId],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
          Channel
        </div>
        <div className="mt-1 text-sm text-dsp-text">{node.label}</div>
        <div className="mt-0.5 text-xs text-dsp-text-muted">
          {side === 'input' ? 'Input processing' : 'Output processing'}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
          Color
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => { onSetColor(e.target.value); }}
            className="h-10 w-12 cursor-pointer rounded border border-dsp-primary/40 bg-transparent p-1"
            aria-label="Channel color"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => { onSetColor(e.target.value); }}
            className={cn(
              'h-10 w-full rounded-md border border-dsp-primary/40 bg-dsp-bg px-3',
              'font-mono text-sm text-dsp-text placeholder:text-dsp-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-dsp-accent/50',
            )}
            placeholder="#rrggbb"
            aria-label="Channel color hex"
          />
        </div>
        <div className="text-xs text-dsp-text-muted">
          This only affects the UI (ports and lines).
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
          Mirror Settings
        </div>
        <div className="text-xs text-dsp-text-muted">
          Mirror processing settings with other {side === 'input' ? 'inputs' : 'outputs'}.
          Changes apply both directions.
        </div>

        <div className="space-y-1">
          {otherChannels.length === 0 && (
            <div className="text-xs text-dsp-text-muted">No other channels.</div>
          )}

          {otherChannels.map((ch) => {
            const checked = currentGroup.some(
              (m) => m.deviceId === ch.deviceId && m.channelIndex === ch.channelIndex,
            );

            return (
              <label key={`${ch.deviceId}:${String(ch.channelIndex)}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...currentGroup, { deviceId: ch.deviceId, channelIndex: ch.channelIndex }]
                      : currentGroup.filter((m) => !sameEndpoint(m, { deviceId: ch.deviceId, channelIndex: ch.channelIndex }));

                    onSetMirrorMembers([endpoint, ...next]);
                  }}
                />
                <span className="text-dsp-text">{ch.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
          Copy / Paste
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCopyChannel}>
            Copy Channel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPasteChannel}
            onClick={onPasteChannel}
          >
            Paste Channel
          </Button>
        </div>
        <div className="text-xs text-dsp-text-muted">
          Copies the full processing chain for this channel.
        </div>
      </div>
    </div>
  );
}

