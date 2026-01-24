import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../lib/signalflow';
import { cn } from '../../lib/utils';

export interface ChannelCardProps {
  node: ChannelNode;
  side: ChannelSide;
  portKey: string;
  selected?: boolean;
  portHighlighted?: boolean;
  portDisabled?: boolean;
  onSelect?: () => void;
  onPortPointerDown?: (endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
}

function summarize(node: ChannelNode): string {
  const parts: string[] = [];
  const summary = node.processingSummary;

  if (summary.hasGain) parts.push('Gain');
  if (summary.hasDelay) parts.push('Delay');
  if (summary.biquadCount > 0) parts.push(`PEQ×${summary.biquadCount}`);
  if (summary.hasConv) parts.push('FIR');
  if (summary.hasCompressor) parts.push('Comp');
  if (summary.hasNoiseGate) parts.push('Gate');
  if (summary.hasDither) parts.push('Dither');
  if (summary.hasLoudness) parts.push('Loud');

  return parts.length > 0 ? parts.join(' · ') : 'No processing';
}

export function ChannelCard({
  node,
  side,
  portKey,
  selected = false,
  portHighlighted = false,
  portDisabled = false,
  onSelect,
  onPortPointerDown,
}: ChannelCardProps) {
  const portSide: 'left' | 'right' = side === 'input' ? 'right' : 'left';
  const endpoint: RouteEndpoint = { deviceId: node.deviceId, channelIndex: node.channelIndex };

  return (
    <div
      className={cn(
        'relative rounded-md border bg-dsp-bg px-3 py-2',
        'text-left text-sm text-dsp-text outline-none transition-colors',
        selected
          ? 'border-dsp-accent/70 ring-2 ring-dsp-accent/30'
          : 'border-dsp-primary/20 hover:border-dsp-primary/40',
      )}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${node.label}`}
      onClick={() => {
        onSelect?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{node.label}</div>
          <div className="mt-0.5 truncate text-xs text-dsp-text-muted">{summarize(node)}</div>
        </div>

        <button
          type="button"
          className={cn(
            'mt-1 h-3 w-3 shrink-0 rounded-full transition-colors',
            portDisabled
              ? 'cursor-not-allowed bg-dsp-primary/60'
              : portHighlighted
                ? 'bg-dsp-accent ring-2 ring-dsp-accent/60'
                : 'bg-dsp-accent/80 hover:bg-dsp-accent',
            portSide === 'left' ? '-ml-1' : '-mr-1',
          )}
          aria-label={side === 'input' ? `Connect ${node.label}` : `Output ${node.label}`}
          data-port-key={portKey}
          data-port-side={side}
          data-device-id={node.deviceId}
          data-channel-index={node.channelIndex}
          disabled={portDisabled}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            if (portDisabled) return;
            event.stopPropagation();
            onPortPointerDown?.(endpoint, event);
          }}
        />
      </div>
    </div>
  );
}
