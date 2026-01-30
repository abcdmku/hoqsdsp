import { useCallback, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Filter, Pencil, Trash2 } from 'lucide-react';
import type { ChannelNode, ChannelProcessingFilter } from '../../../lib/signalflow';
import { ensureUniqueName } from '../../../lib/signalflow/filterUtils';
import { cn } from '../../../lib/utils';
import type { FilterType } from '../../../types';
import { filterRegistry } from '../../../lib/filters/registry';
import { Button } from '../../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';

interface FiltersSectionProps {
  node: ChannelNode;
  filters: ChannelProcessingFilter[];
  availableFilterTypes: FilterType[];
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
  onEditFilter: (name: string) => void;
}

function isOutputOnly(type: FilterType): boolean {
  return type === 'Conv' || type === 'Compressor' || type === 'Dither' || type === 'NoiseGate' || type === 'Loudness';
}

export function FiltersSection({
  node,
  filters,
  availableFilterTypes,
  onChange,
  onEditFilter,
}: FiltersSectionProps) {
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [pendingAddType, setPendingAddType] = useState<FilterType | null>(null);
  const filtersContentId = useId();

  const editableFilters = useMemo(() => {
    return filters.map((filter) => {
      const handler = filterRegistry.get(filter.config.type);
      return {
        ...filter,
        displayName: handler?.getDisplayName(filter.config as never) ?? filter.config.type,
        summary: handler?.getSummary(filter.config as never) ?? '',
      };
    });
  }, [filters]);

  const nonEqFilters = useMemo(
    () => editableFilters.filter((filter) => filter.config.type !== 'Biquad'),
    [editableFilters],
  );

  const addOptions = useMemo(() => {
    const types = node.side === 'output'
      ? availableFilterTypes
      : availableFilterTypes.filter((type) => !isOutputOnly(type));
    return types.filter((type) => type !== 'Biquad');
  }, [availableFilterTypes, node.side]);

  const handleAdd = useCallback(() => {
    if (!pendingAddType) return;
    const handler = filterRegistry.get(pendingAddType);
    if (!handler) return;
    const takenNames = new Set(filters.map((f) => f.name));
    const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-${pendingAddType.toLowerCase()}-${String(Date.now())}`;
    const name = ensureUniqueName(baseName, takenNames);
    const nextFilter: ChannelProcessingFilter = { name, config: handler.getDefault() };
    onChange([...filters, nextFilter]);
    setPendingAddType(null);
    onEditFilter(name);
  }, [filters, node.channelIndex, node.side, onChange, onEditFilter, pendingAddType]);

  const handleDelete = useCallback(
    (filterName: string) => {
      const nextFilters = filters.filter((filter) => filter.name !== filterName);
      onChange(nextFilters);
    },
    [filters, onChange],
  );

  const renderAddLabel = node.side === 'input' ? 'Add Input Filter' : 'Add Output Filter';
  const CollapseIcon = filtersCollapsed ? ChevronRight : ChevronDown;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-dsp-bg/30 shadow-sm',
        'border-dsp-primary/30 border-l-4 border-l-dsp-primary focus-within:ring-2 focus-within:ring-dsp-accent/40',
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
          setFiltersCollapsed((prev) => !prev);
        }}
        aria-expanded={!filtersCollapsed}
        aria-controls={filtersContentId}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CollapseIcon className="h-4 w-4 shrink-0 text-dsp-text-muted" />
          <Filter className="h-4 w-4 shrink-0 text-dsp-primary" />
          <span className="truncate text-sm font-semibold text-dsp-text">Filters</span>
          <span className="shrink-0 rounded-full border border-dsp-primary/30 bg-dsp-primary/10 px-2 py-0.5 text-xs text-dsp-text-muted">
            {nonEqFilters.length} filter{nonEqFilters.length === 1 ? '' : 's'}
          </span>
        </div>
        <span className="shrink-0 text-xs font-medium text-dsp-text-muted">
          {filtersCollapsed ? 'Expand' : 'Collapse'}
        </span>
      </button>

      {!filtersCollapsed && (
        <div id={filtersContentId} className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={pendingAddType ?? undefined}
                onValueChange={(value) => {
                  setPendingAddType(value as FilterType);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={renderAddLabel} />
                </SelectTrigger>
                <SelectContent>
                  {addOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-9"
              disabled={!pendingAddType}
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>

          {nonEqFilters.length === 0 ? (
            <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg px-3 py-4 text-xs text-dsp-text-muted">
              No filters (besides PEQ) found. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {nonEqFilters.map((filter) => (
                <div
                  key={filter.name}
                  className="flex items-center justify-between gap-3 rounded-md border border-dsp-primary/20 bg-dsp-bg px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-dsp-text">{filter.displayName}</div>
                    <div className="truncate text-xs text-dsp-text-muted">
                      {filter.summary || filter.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label={`Edit ${filter.displayName}`}
                      onClick={() => {
                        onEditFilter(filter.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-meter-red"
                      aria-label={`Delete ${filter.displayName}`}
                      onClick={() => {
                        handleDelete(filter.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
