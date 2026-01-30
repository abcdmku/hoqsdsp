import { useCallback, useMemo, useState } from 'react';
import type { ChannelNode, ChannelProcessingFilter } from '../../../lib/signalflow';
import type { FilterConfig, FilterType } from '../../../types';
import { cn } from '../../../lib/utils';
import { ChannelEditorHeader } from './ChannelEditorHeader';
import { ChannelFilterEditorModal } from './ChannelFilterEditorModal';
import { FiltersSection } from './FiltersSection';
import { PeqSection } from './PeqSection';

export interface ChannelEditorDrawerProps {
  open: boolean;
  node: ChannelNode;
  sampleRate: number;
  availableFilterTypes: FilterType[];
  onClose: () => void;
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
}

export function ChannelEditorDrawer({
  open,
  node,
  sampleRate,
  availableFilterTypes,
  onClose,
  onChange,
}: ChannelEditorDrawerProps) {
  const [editingFilterName, setEditingFilterName] = useState<string | null>(null);
  const processingFilters = node.processing.filters;

  const editingFilter = useMemo(() => {
    if (!editingFilterName) return null;
    return processingFilters.find((filter) => filter.name === editingFilterName) ?? null;
  }, [editingFilterName, processingFilters]);

  const commitFilterUpdate = useCallback(
    (filterName: string, updatedConfig: FilterConfig, options?: { debounce?: boolean }) => {
      const nextFilters = processingFilters.map((filter) =>
        filter.name === filterName ? { ...filter, config: updatedConfig } : filter,
      );
      onChange(nextFilters, options);
    },
    [onChange, processingFilters],
  );

  if (!open) return null;

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 z-40 h-screen w-[520px] max-w-[90vw]',
        'flex flex-col border-l border-dsp-primary/30 bg-dsp-surface',
      )}
      aria-label={`${node.label} processing editor`}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
      tabIndex={-1}
    >
      <ChannelEditorHeader node={node} onClose={onClose} />

      <div className="flex-1 space-y-4 overflow-auto px-6 py-4">
        <PeqSection
          node={node}
          filters={processingFilters}
          sampleRate={sampleRate}
          onChange={onChange}
        />

        <FiltersSection
          node={node}
          filters={processingFilters}
          availableFilterTypes={availableFilterTypes}
          onChange={onChange}
          onEditFilter={setEditingFilterName}
        />
      </div>

      <ChannelFilterEditorModal
        filter={editingFilter}
        sampleRate={sampleRate}
        processingFilters={processingFilters}
        onClose={() => {
          setEditingFilterName(null);
        }}
        onUpdate={commitFilterUpdate}
      />
    </aside>
  );
}
