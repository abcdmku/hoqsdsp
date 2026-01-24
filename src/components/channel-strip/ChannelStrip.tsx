import * as React from 'react';
import { Volume2, VolumeX, Headphones, GripVertical, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { ProcessingBlock } from './ProcessingBlock';
import { ChannelMeter } from './ChannelMeter';
import type { FilterConfig } from '../../types';

export interface ChannelFilter {
  id: string;
  name: string;
  config: FilterConfig;
  bypassed: boolean;
}

export interface ChannelStripProps {
  channelId: number;
  name: string;
  filters: ChannelFilter[];
  muted: boolean;
  solo: boolean;
  gain: number;
  inputLevel: number;
  outputLevel: number;
  isSelected?: boolean;
  selectedFilterId?: string | null;
  /** Whether this channel is muted because another channel is soloed */
  isMutedBySolo?: boolean;
  onSelect?: () => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  onGainChange?: (gain: number) => void;
  onFilterSelect?: (filterId: string) => void;
  onFilterBypass?: (filterId: string) => void;
  onFilterDelete?: (filterId: string) => void;
  onFilterCopy?: (filterId: string) => void;
  onFilterPaste?: (position: number) => void;
  onFilterReorder?: (fromIndex: number, toIndex: number) => void;
  onQuickAdd?: (position: number) => void;
  className?: string;
}

/**
 * Channel Strip component - displays a single channel with its processing chain.
 * Includes mute/solo controls, gain fader, level meters, and processing blocks.
 */
export const ChannelStrip = React.memo(function ChannelStrip({
  channelId,
  name,
  filters,
  muted,
  solo,
  gain,
  inputLevel,
  outputLevel,
  isSelected = false,
  selectedFilterId = null,
  isMutedBySolo = false,
  onSelect,
  onMuteToggle,
  onSoloToggle,
  onGainChange,
  onFilterSelect,
  onFilterBypass,
  onFilterDelete,
  onFilterCopy,
  onFilterPaste: _onFilterPaste,
  onFilterReorder,
  onQuickAdd,
  className,
}: ChannelStripProps) {
  const [draggedFilter, setDraggedFilter] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const isEffectivelyMuted = muted || isMutedBySolo;

  // Handle drag start
  const handleDragStart = React.useCallback((index: number) => {
    setDraggedFilter(index);
  }, []);

  // Handle drag over
  const handleDragOver = React.useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  // Handle drop
  const handleDrop = React.useCallback(
    (index: number) => {
      if (draggedFilter !== null && draggedFilter !== index && onFilterReorder) {
        onFilterReorder(draggedFilter, index);
      }
      setDraggedFilter(null);
      setDragOverIndex(null);
    },
    [draggedFilter, onFilterReorder]
  );

  // Handle drag end
  const handleDragEnd = React.useCallback(() => {
    setDraggedFilter(null);
    setDragOverIndex(null);
  }, []);

  // Handle gain slider change
  const handleGainChange = React.useCallback(
    (values: number[]) => {
      if (values[0] !== undefined && onGainChange) {
        onGainChange(values[0]);
      }
    },
    [onGainChange]
  );

  return (
    <div
      className={cn(
        'flex w-48 flex-shrink-0 flex-col rounded-lg border bg-dsp-surface transition-all',
        isSelected ? 'border-dsp-accent ring-1 ring-dsp-accent' : 'border-dsp-primary/30',
        isEffectivelyMuted && 'opacity-60',
        className
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Channel ${name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {/* Channel header */}
      <div className="flex items-center justify-between border-b border-dsp-primary/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-dsp-text-muted" />
          <span className="text-sm font-medium text-dsp-text">{name}</span>
        </div>
        <span className="text-xs text-dsp-text-muted">Ch {channelId + 1}</span>
      </div>

      {/* Processing blocks */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {/* Add filter button at start */}
          <button
            className="flex h-6 items-center justify-center rounded border border-dashed border-dsp-primary/30 text-dsp-text-muted transition-colors hover:border-dsp-accent hover:text-dsp-accent"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd?.(0);
            }}
            aria-label="Add filter at start"
          >
            <Plus className="h-3 w-3" />
          </button>

          {filters.map((filter, index) => (
            <React.Fragment key={filter.id}>
              <div
                className={cn(
                  'relative',
                  dragOverIndex === index && draggedFilter !== index && 'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:bg-dsp-accent'
                )}
                onDragOver={(e) => { handleDragOver(e, index); }}
                onDrop={() => { handleDrop(index); }}
              >
                <ProcessingBlock
                  filter={filter}
                  isSelected={selectedFilterId === filter.id}
                  isDragging={draggedFilter === index}
                  onSelect={() => { onFilterSelect?.(filter.id); }}
                  onBypass={() => { onFilterBypass?.(filter.id); }}
                  onDelete={() => { onFilterDelete?.(filter.id); }}
                  onCopy={() => { onFilterCopy?.(filter.id); }}
                  onDragStart={() => { handleDragStart(index); }}
                  onDragEnd={handleDragEnd}
                />
              </div>

              {/* Add filter button between filters */}
              <button
                className="flex h-6 items-center justify-center rounded border border-dashed border-dsp-primary/30 text-dsp-text-muted opacity-0 transition-all hover:border-dsp-accent hover:text-dsp-accent hover:opacity-100 focus:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd?.(index + 1);
                }}
                aria-label={`Add filter after ${filter.name}`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </React.Fragment>
          ))}

          {/* Empty state */}
          {filters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-xs text-dsp-text-muted">No filters</p>
              <p className="mt-1 text-[10px] text-dsp-text-muted">
                Click + to add
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Level meters and gain */}
      <div className="border-t border-dsp-primary/30 p-3">
        <div className="mb-3 flex items-center justify-center gap-2">
          <ChannelMeter
            level={inputLevel}
            label="Input"
            orientation="vertical"
            className="h-20"
          />
          <ChannelMeter
            level={outputLevel}
            label="Output"
            orientation="vertical"
            className="h-20"
          />
        </div>

        {/* Gain fader */}
        <div className="mb-3">
          <Slider
            value={[gain]}
            min={-60}
            max={12}
            step={0.5}
            orientation="vertical"
            onValueChange={handleGainChange}
            disabled={muted}
            className="mx-auto h-16"
            aria-label={`${name} gain`}
            onClick={(e) => { e.stopPropagation(); }}
          />
          <div className="mt-1 text-center font-mono text-xs text-dsp-text">
            {gain >= 0 ? '+' : ''}{gain.toFixed(1)} dB
          </div>
        </div>

        {/* Mute/Solo controls */}
        <div className="flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={muted ? 'destructive' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle?.();
                }}
                aria-label={muted ? 'Unmute' : 'Mute'}
                aria-pressed={muted}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={solo ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-8 w-8 p-0', solo && 'bg-meter-yellow text-dsp-bg hover:bg-meter-yellow/80')}
                onClick={(e) => {
                  e.stopPropagation();
                  onSoloToggle?.();
                }}
                aria-label={solo ? 'Unsolo' : 'Solo'}
                aria-pressed={solo}
              >
                <Headphones className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{solo ? 'Unsolo' : 'Solo'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
