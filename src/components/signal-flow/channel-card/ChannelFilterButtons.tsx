import { Link2 } from 'lucide-react';
import type { ChannelNode } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import type { FilterType } from '../../../types';
import { FILTER_UI, filterColorClasses } from '../filterUi';

interface ChannelFilterButtonsProps {
  node: ChannelNode;
  visibleFilterTypes: FilterType[];
  activeCounts: Map<FilterType, number>;
  connectionCount: number;
  onOpenFilter?: (type: FilterType, point?: { x: number; y: number }) => void;
  onOpenConnections?: (point?: { x: number; y: number }) => void;
}

function getFilterShortLabel(type: FilterType): string {
  switch (type) {
    case 'Biquad':
      return 'PEQ';
    case 'Compressor':
      return 'COMP';
    case 'NoiseGate':
      return 'GATE';
    case 'Loudness':
      return 'LOUD';
    default:
      return FILTER_UI[type].shortLabel.toUpperCase().slice(0, 4);
  }
}

export function ChannelFilterButtons({
  node,
  visibleFilterTypes,
  activeCounts,
  connectionCount,
  onOpenFilter,
  onOpenConnections,
}: ChannelFilterButtonsProps) {
  return (
    <>
      {visibleFilterTypes.map((type) => {
        const meta = FILTER_UI[type];
        const count = activeCounts.get(type) ?? 0;
        const active = count > 0;
        const colors = filterColorClasses(meta.color);
        const label = getFilterShortLabel(type);

        return (
          <button
            key={type}
            type="button"
            className={cn(
              'relative inline-flex h-7 items-center justify-center rounded-md border px-2 text-[10px] font-semibold tracking-wide transition-colors',
              active ? colors.active : colors.inactive,
              'hover:border-dsp-accent/50 hover:text-dsp-text focus-visible:ring-2 focus-visible:ring-dsp-accent/50',
            )}
            aria-label={`${meta.label} (${node.side} ${node.channelIndex + 1})`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenFilter?.(type, { x: event.clientX, y: event.clientY });
            }}
          >
            <span>{label}</span>
            {type === 'Biquad' && count > 0 && (
              <span className="absolute -right-1 -top-1 min-w-3 rounded bg-dsp-accent px-0.5 text-[9px] font-semibold text-white">
                {count > 9 ? '9+' : String(count)}
              </span>
            )}
          </button>
        );
      })}

      <button
        type="button"
        className={cn(
          'flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-xs transition-colors',
          connectionCount > 0
            ? 'border-dsp-accent/40 bg-dsp-accent/20 text-dsp-accent hover:bg-dsp-accent/30'
            : 'border-dsp-primary/30 bg-dsp-surface text-dsp-text-muted hover:border-dsp-primary/50 hover:text-dsp-text',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onOpenConnections?.({ x: e.clientX, y: e.clientY });
        }}
        title={`${connectionCount} connection${connectionCount === 1 ? '' : 's'} - Click to manage`}
        aria-label={`${node.label} connections`}
      >
        <Link2 className="h-3 w-3" />
        <span>{connectionCount}</span>
      </button>
    </>
  );
}
