import { useCallback, useMemo, useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import type { ChannelNode, ChannelProcessingFilter } from '../../lib/signalflow';
import type {
  BiquadFilter,
  CompressorFilter,
  ConvolutionFilter,
  DelayFilter,
  DiffEqFilter,
  DitherFilter,
  FilterConfig,
  FilterType,
  GainFilter,
  LoudnessFilter,
  NoiseGateFilter,
  VolumeFilter,
} from '../../types';
import { filterRegistry } from '../../lib/filters/registry';
import { EQEditor } from '../eq-editor/EQEditor';
import type { EQBand } from '../eq-editor/types';
import {
  BiquadEditor,
  CompressorEditor,
  ConvolutionEditor,
  DelayEditor,
  DiffEqEditor,
  DitherEditor,
  GainEditor,
  LoudnessEditor,
  NoiseGateEditor,
  VolumeEditor,
} from '../filters';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { cn } from '../../lib/utils';

export interface ChannelEditorDrawerProps {
  open: boolean;
  node: ChannelNode;
  sampleRate: number;
  availableFilterTypes: FilterType[];
  onClose: () => void;
  onChange: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
}

function isOutputOnly(type: FilterType): boolean {
  return type === 'Conv' || type === 'Compressor' || type === 'Dither' || type === 'NoiseGate' || type === 'Loudness';
}

function ensureUniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let attempt = 1;
  while (taken.has(`${base}-${String(attempt)}`)) {
    attempt += 1;
  }
  return `${base}-${String(attempt)}`;
}

export function ChannelEditorDrawer({
  open,
  node,
  sampleRate,
  availableFilterTypes,
  onClose,
  onChange,
}: ChannelEditorDrawerProps) {
  if (!open) return null;

  const [editingFilterName, setEditingFilterName] = useState<string | null>(null);
  const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);
  const [pendingAddType, setPendingAddType] = useState<FilterType | null>(null);

  const processingFilters = node.processing.filters;

  const biquadBlock = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < processingFilters.length; i++) {
      if (processingFilters[i]?.config.type === 'Biquad') {
        indices.push(i);
      }
    }
    return indices.length > 0 ? { start: indices[0]!, end: indices[indices.length - 1]! } : null;
  }, [processingFilters]);

  const eqBands = useMemo((): EQBand[] => {
    const bands: EQBand[] = [];
    for (const filter of processingFilters) {
      if (filter.config.type !== 'Biquad') continue;
      bands.push({
        id: filter.name,
        enabled: true,
        parameters: filter.config.parameters,
      });
    }
    return bands;
  }, [processingFilters]);

  const handleEqChange = useCallback(
    (nextBands: EQBand[]) => {
      const takenNames = new Set(processingFilters.map((f) => f.name));
      const usedNames = new Set<string>();

      const normalizedBands: EQBand[] = nextBands.map((band, index) => {
        if (takenNames.has(band.id)) {
          usedNames.add(band.id);
          return band;
        }

        const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-biquad-${String(Date.now())}-${String(index)}`;
        const nextName = ensureUniqueName(baseName, new Set([...takenNames, ...usedNames]));
        usedNames.add(nextName);
        return { ...band, id: nextName };
      });

      const nextBiquadFilters: ChannelProcessingFilter[] = normalizedBands.map((band) => ({
        name: band.id,
        config: { type: 'Biquad', parameters: band.parameters },
      }));

      const current = processingFilters;
      const nextFilters: ChannelProcessingFilter[] = [];

      if (!biquadBlock) {
        nextFilters.push(...current, ...nextBiquadFilters);
      } else {
        nextFilters.push(...current.slice(0, biquadBlock.start));
        nextFilters.push(...nextBiquadFilters);
        nextFilters.push(...current.slice(biquadBlock.end + 1));
      }

      onChange(nextFilters, { debounce: true });
    },
    [biquadBlock, node.channelIndex, node.side, onChange, processingFilters],
  );

  const editableFilters = useMemo(() => {
    return processingFilters.map((filter) => {
      const handler = filterRegistry.get(filter.config.type);
      return {
        ...filter,
        displayName: handler?.getDisplayName(filter.config as never) ?? filter.config.type,
        summary: handler?.getSummary(filter.config as never) ?? '',
      };
    });
  }, [processingFilters]);

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

  const handleDelete = useCallback(
    (filterName: string) => {
      const nextFilters = processingFilters.filter((filter) => filter.name !== filterName);
      onChange(nextFilters);
    },
    [onChange, processingFilters],
  );

  const handleAdd = useCallback(() => {
    if (!pendingAddType) return;

    const handler = filterRegistry.get(pendingAddType);
    if (!handler) return;

    const takenNames = new Set(processingFilters.map((f) => f.name));
    const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-${pendingAddType.toLowerCase()}`;
    const name = ensureUniqueName(`${baseName}-${String(Date.now())}`, takenNames);
    const nextFilter: ChannelProcessingFilter = { name, config: handler.getDefault() };
    onChange([...processingFilters, nextFilter]);
    setPendingAddType(null);
    setEditingFilterName(name);
  }, [node.channelIndex, node.side, onChange, pendingAddType, processingFilters]);

  const addOptions = useMemo(() => {
    if (node.side === 'output') return availableFilterTypes;
    return availableFilterTypes.filter((type) => !isOutputOnly(type));
  }, [availableFilterTypes, node.side]);

  const renderAddLabel = node.side === 'input'
    ? 'Add Input Filter'
    : 'Add Output Filter';

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 z-40 h-screen w-[520px] max-w-[90vw]',
        'flex flex-col border-l border-dsp-primary/30 bg-dsp-surface',
      )}
      aria-label={`${node.label} processing editor`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      tabIndex={-1}
    >
      <div className="border-b border-dsp-primary/20 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-dsp-text">{node.label} Processing</h2>
            <div className="mt-1 text-xs text-dsp-text-muted">
              {node.side === 'input' ? 'Input channel' : 'Output channel'} · Device {node.deviceId}
            </div>
          </div>
          <Button type="button" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
            <span className="sr-only">Close</span>
            <span aria-hidden>×</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-dsp-text">PEQ</h3>
              <div className="text-xs text-dsp-text-muted">{eqBands.length} band{eqBands.length === 1 ? '' : 's'}</div>
            </div>
            <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg p-3">
              <EQEditor
                bands={eqBands}
                onChange={handleEqChange}
                sampleRate={sampleRate}
                selectedBandIndex={selectedBandIndex}
                onSelectBand={setSelectedBandIndex}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-dsp-text">Filters</h3>

              <div className="flex items-center gap-2">
                <div className="w-44">
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
            </div>

            {editableFilters.length === 0 ? (
              <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg px-3 py-4 text-xs text-dsp-text-muted">
                No per-channel filter steps found. Use PEQ or add filters above.
              </div>
            ) : (
              <div className="space-y-2">
                {editableFilters.map((filter) => (
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
                          setEditingFilterName(filter.name);
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
          </section>
      </div>

      {editingFilter?.config.type === 'Biquad' && (
        <BiquadEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as BiquadFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
          sampleRate={sampleRate}
        />
      )}

      {editingFilter?.config.type === 'Gain' && (
        <GainEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as GainFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Delay' && (
        <DelayEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as DelayFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'DiffEq' && (
        <DiffEqEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as DiffEqFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Volume' && (
        <VolumeEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as VolumeFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Conv' && (
        <ConvolutionEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as ConvolutionFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Compressor' && (
        <CompressorEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as CompressorFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Dither' && (
        <DitherEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as DitherFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'NoiseGate' && (
        <NoiseGateEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as NoiseGateFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}

      {editingFilter?.config.type === 'Loudness' && (
        <LoudnessEditor
          open={true}
          onClose={() => {
            setEditingFilterName(null);
          }}
          filter={editingFilter.config as LoudnessFilter}
          onSave={(updated) => {
            commitFilterUpdate(editingFilter.name, updated);
          }}
          onApply={(updated) => {
            commitFilterUpdate(editingFilter.name, updated, { debounce: true });
          }}
        />
      )}
    </aside>
  );
}
