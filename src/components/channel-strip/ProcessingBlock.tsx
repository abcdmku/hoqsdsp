import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GripVertical, Copy, Trash2, ToggleLeft, ToggleRight, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { filterRegistry } from '../../lib/filters/registry';
import type { FilterConfig, FilterType } from '../../types';

export interface ProcessingBlockFilter {
  id: string;
  name: string;
  config: FilterConfig;
  bypassed: boolean;
}

export interface ProcessingBlockProps {
  filter: ProcessingBlockFilter;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onBypass?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

// Default color scheme for unknown filter types
const DEFAULT_COLORS = {
  bg: 'bg-filter-inactive/20',
  border: 'border-filter-inactive/50',
  text: 'text-filter-inactive',
} as const;

// Filter type to color mapping
const FILTER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // EQ types - Cyan
  eq: {
    bg: 'bg-filter-eq/20',
    border: 'border-filter-eq/50',
    text: 'text-filter-eq',
  },
  // Dynamics - Orange
  dynamics: {
    bg: 'bg-filter-dynamics/20',
    border: 'border-filter-dynamics/50',
    text: 'text-filter-dynamics',
  },
  // FIR/Convolution - Purple
  fir: {
    bg: 'bg-filter-fir/20',
    border: 'border-filter-fir/50',
    text: 'text-filter-fir',
  },
  // Delay - Blue
  delay: {
    bg: 'bg-filter-delay/20',
    border: 'border-filter-delay/50',
    text: 'text-filter-delay',
  },
  // Limiter - Red
  limiter: {
    bg: 'bg-filter-limiter/20',
    border: 'border-filter-limiter/50',
    text: 'text-filter-limiter',
  },
  // Gain - Green
  gain: {
    bg: 'bg-filter-gain/20',
    border: 'border-filter-gain/50',
    text: 'text-filter-gain',
  },
  // Dither - Pink
  dither: {
    bg: 'bg-filter-dither/20',
    border: 'border-filter-dither/50',
    text: 'text-filter-dither',
  },
  // Bypassed - Yellow
  bypassed: {
    bg: 'bg-filter-bypassed/10',
    border: 'border-filter-bypassed/30',
    text: 'text-filter-bypassed',
  },
  // Default/inactive - Gray
  inactive: {
    bg: 'bg-filter-inactive/20',
    border: 'border-filter-inactive/50',
    text: 'text-filter-inactive',
  },
};

// Map filter types to color categories
function getFilterColorCategory(filterType: FilterType): keyof typeof FILTER_COLORS {
  switch (filterType) {
    case 'Biquad':
      return 'eq';
    case 'Compressor':
    case 'NoiseGate':
    case 'Loudness':
      return 'dynamics';
    case 'Conv':
      return 'fir';
    case 'Delay':
      return 'delay';
    case 'Gain':
    case 'Volume':
      return 'gain';
    case 'Dither':
      return 'dither';
    case 'DiffEq':
      return 'eq';
    default:
      return 'inactive';
  }
}

// Get short label for filter type
function getFilterShortLabel(config: FilterConfig): string {
  switch (config.type) {
    case 'Biquad': {
      const params = config.parameters;
      switch (params.type) {
        case 'Highpass':
        case 'HighpassFO':
        case 'ButterworthHighpass':
        case 'LinkwitzRileyHighpass':
          return 'HP';
        case 'Lowpass':
        case 'LowpassFO':
        case 'ButterworthLowpass':
        case 'LinkwitzRileyLowpass':
          return 'LP';
        case 'Peaking':
          return 'PEQ';
        case 'Lowshelf':
        case 'LowshelfFO':
          return 'LS';
        case 'Highshelf':
        case 'HighshelfFO':
          return 'HS';
        case 'Notch':
          return 'NCH';
        case 'Bandpass':
          return 'BP';
        case 'Allpass':
        case 'AllpassFO':
          return 'AP';
        case 'LinkwitzTransform':
          return 'LT';
        default:
          return 'EQ';
      }
    }
    case 'Compressor':
      return 'CMP';
    case 'NoiseGate':
      return 'GATE';
    case 'Conv':
      return 'FIR';
    case 'Delay':
      return 'DLY';
    case 'Gain':
      return 'GAIN';
    case 'Volume':
      return 'VOL';
    case 'Dither':
      return 'DTH';
    case 'Loudness':
      return 'LOUD';
    case 'DiffEq':
      return 'DEQ';
    default:
      return '?';
  }
}

// Get summary info for display
function getFilterSummary(config: FilterConfig): string {
  const handler = filterRegistry.get(config.type);
  if (handler) {
    return handler.getSummary(config);
  }

  // Fallback for unknown types
  switch (config.type) {
    case 'Biquad': {
      const params = config.parameters;
      if ('freq' in params) {
        return `${String(params.freq)}Hz`;
      }
      return '';
    }
    case 'Delay': {
      const params = config.parameters;
      return `${String(params.delay)}${params.unit}`;
    }
    case 'Gain': {
      const params = config.parameters;
      return `${params.gain >= 0 ? '+' : ''}${String(params.gain)}dB`;
    }
    default:
      return '';
  }
}

/**
 * Processing Block component - represents a single filter in the channel strip.
 * Shows filter type with color coding and compact info display.
 * Supports drag-and-drop reordering and right-click context menu.
 */
export const ProcessingBlock = React.memo(function ProcessingBlock({
  filter,
  isSelected = false,
  isDragging = false,
  onSelect,
  onBypass,
  onDelete,
  onCopy,
  onDragStart,
  onDragEnd,
  className,
}: ProcessingBlockProps) {
  const colorCategory = filter.bypassed ? 'bypassed' : getFilterColorCategory(filter.config.type);
  const colors = FILTER_COLORS[colorCategory] ?? DEFAULT_COLORS;
  const shortLabel = getFilterShortLabel(filter.config);
  const summary = getFilterSummary(filter.config);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.();
    },
    [onSelect]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        e.stopPropagation();
        onBypass?.();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.();
      }
    },
    [onSelect, onBypass, onDelete]
  );

  const handleDragStart = React.useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', filter.id);
      onDragStart?.();
    },
    [filter.id, onDragStart]
  );

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 transition-all',
        colors.bg,
        colors.border,
        isSelected && 'ring-1 ring-dsp-accent',
        isDragging && 'opacity-50',
        filter.bypassed && 'opacity-60',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${filter.name}${filter.bypassed ? ' (bypassed)' : ''}`}
      aria-pressed={isSelected}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <GripVertical className="h-3 w-3 cursor-grab text-dsp-text-muted opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Filter type label */}
      <span className={cn('min-w-8 text-xs font-bold', colors.text)}>
        {shortLabel}
      </span>

      {/* Summary info */}
      <span className="flex-1 truncate text-[10px] text-dsp-text-muted">
        {summary}
      </span>

      {/* Bypass indicator */}
      {filter.bypassed && (
        <span className="text-[10px] font-medium text-filter-bypassed">OFF</span>
      )}

      {/* Context menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="ml-auto rounded p-0.5 text-dsp-text-muted opacity-0 transition-opacity hover:bg-dsp-primary/50 hover:text-dsp-text group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); }}
          aria-label="Filter options"
        >
          <MoreVertical className="h-3 w-3" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[160px] rounded-md border border-dsp-primary/50 bg-dsp-surface p-1 shadow-lg"
            sideOffset={5}
            align="end"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-dsp-text outline-none transition-colors hover:bg-dsp-primary/50"
              onSelect={() => { onBypass?.(); }}
            >
              {filter.bypassed ? (
                <>
                  <ToggleRight className="h-4 w-4" />
                  Enable
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4" />
                  Bypass
                </>
              )}
              <span className="ml-auto text-xs text-dsp-text-muted">B</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-dsp-text outline-none transition-colors hover:bg-dsp-primary/50"
              onSelect={() => { onCopy?.(); }}
            >
              <Copy className="h-4 w-4" />
              Copy
              <span className="ml-auto text-xs text-dsp-text-muted">Ctrl+C</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-dsp-primary/30" />

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-meter-red outline-none transition-colors hover:bg-meter-red/20"
              onSelect={() => { onDelete?.(); }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
              <span className="ml-auto text-xs text-dsp-text-muted">Del</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
});
