import { useCallback, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { ChannelNode, ChannelProcessingFilter } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import { EQEditor } from '../../eq-editor/EQEditor';
import type { EQBand } from '../../eq-editor/types';
import { buildEqBands, mergeEqBandsIntoFilters } from '../eqUtils';

interface PeqSectionProps {
  node: ChannelNode;
  filters: ChannelProcessingFilter[];
  sampleRate: number;
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
}

export function PeqSection({ node, filters, sampleRate, onChange }: PeqSectionProps) {
  const [peqCollapsed, setPeqCollapsed] = useState(false);
  const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);
  const peqContentId = useId();

  const eqBands = useMemo(() => buildEqBands(filters), [filters]);
  const handleEqChange = useCallback(
    (nextBands: EQBand[]) => {
      onChange(mergeEqBandsIntoFilters(node, nextBands), { debounce: true });
    },
    [node, onChange],
  );

  const CollapseIcon = peqCollapsed ? ChevronRight : ChevronDown;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-dsp-bg/30 shadow-sm',
        'border-dsp-accent/30 border-l-4 border-l-dsp-accent focus-within:ring-2 focus-within:ring-dsp-accent/40',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
          'bg-dsp-surface/40 transition-colors hover:bg-dsp-surface/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/50',
        )}
        onClick={() => {
          setPeqCollapsed((prev) => !prev);
        }}
        aria-expanded={!peqCollapsed}
        aria-controls={peqContentId}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CollapseIcon className="h-4 w-4 shrink-0 text-dsp-text-muted" />
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-dsp-accent" />
          <span className="truncate text-sm font-semibold text-dsp-text">PEQ</span>
          <span className="shrink-0 rounded-full border border-dsp-accent/30 bg-dsp-accent/10 px-2 py-0.5 text-xs text-dsp-text-muted">
            {eqBands.length} band{eqBands.length === 1 ? '' : 's'}
          </span>
        </div>
        <span className="shrink-0 text-xs font-medium text-dsp-text-muted">
          {peqCollapsed ? 'Expand' : 'Collapse'}
        </span>
      </button>

      {!peqCollapsed && (
        <div id={peqContentId} className="p-3">
          <EQEditor
            bands={eqBands}
            onChange={handleEqChange}
            sampleRate={sampleRate}
            selectedBandIndex={selectedBandIndex}
            onSelectBand={setSelectedBandIndex}
            className="gap-3 rounded-none bg-transparent p-0 focus-within:ring-0"
          />
        </div>
      )}
    </section>
  );
}
