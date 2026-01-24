import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { cn } from '../../lib/utils';
import type { FilterType } from '../../types';

export interface QuickAddMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (filterType: FilterType) => void;
}

interface FilterOption {
  type: FilterType;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  category: 'eq' | 'dynamics' | 'time' | 'utility';
}

const FILTER_OPTIONS: FilterOption[] = [
  // EQ filters
  {
    type: 'Biquad',
    label: 'High Pass',
    shortLabel: 'HP',
    description: 'Remove low frequencies below cutoff',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  {
    type: 'Biquad',
    label: 'Low Pass',
    shortLabel: 'LP',
    description: 'Remove high frequencies above cutoff',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  {
    type: 'Biquad',
    label: 'Parametric EQ',
    shortLabel: 'PEQ',
    description: 'Boost or cut at specific frequency',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  {
    type: 'Biquad',
    label: 'Low Shelf',
    shortLabel: 'LS',
    description: 'Boost or cut below frequency',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  {
    type: 'Biquad',
    label: 'High Shelf',
    shortLabel: 'HS',
    description: 'Boost or cut above frequency',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  {
    type: 'Biquad',
    label: 'Notch',
    shortLabel: 'NCH',
    description: 'Remove narrow frequency band',
    colorClass: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq',
    category: 'eq',
  },
  // Dynamics
  {
    type: 'Compressor',
    label: 'Compressor',
    shortLabel: 'CMP',
    description: 'Reduce dynamic range',
    colorClass: 'bg-filter-dynamics/20 border-filter-dynamics/50 text-filter-dynamics',
    category: 'dynamics',
  },
  {
    type: 'NoiseGate',
    label: 'Noise Gate',
    shortLabel: 'GATE',
    description: 'Silence below threshold',
    colorClass: 'bg-filter-dynamics/20 border-filter-dynamics/50 text-filter-dynamics',
    category: 'dynamics',
  },
  {
    type: 'Loudness',
    label: 'Loudness',
    shortLabel: 'LOUD',
    description: 'Volume-dependent EQ curve',
    colorClass: 'bg-filter-dynamics/20 border-filter-dynamics/50 text-filter-dynamics',
    category: 'dynamics',
  },
  // Time-based
  {
    type: 'Delay',
    label: 'Delay',
    shortLabel: 'DLY',
    description: 'Time delay for alignment',
    colorClass: 'bg-filter-delay/20 border-filter-delay/50 text-filter-delay',
    category: 'time',
  },
  {
    type: 'Conv',
    label: 'Convolution',
    shortLabel: 'FIR',
    description: 'FIR filter / room correction',
    colorClass: 'bg-filter-fir/20 border-filter-fir/50 text-filter-fir',
    category: 'time',
  },
  // Utility
  {
    type: 'Gain',
    label: 'Gain',
    shortLabel: 'GAIN',
    description: 'Adjust level',
    colorClass: 'bg-filter-gain/20 border-filter-gain/50 text-filter-gain',
    category: 'utility',
  },
  {
    type: 'Volume',
    label: 'Volume',
    shortLabel: 'VOL',
    description: 'Linked volume control',
    colorClass: 'bg-filter-gain/20 border-filter-gain/50 text-filter-gain',
    category: 'utility',
  },
  {
    type: 'Dither',
    label: 'Dither',
    shortLabel: 'DTH',
    description: 'Add dither for bit reduction',
    colorClass: 'bg-filter-dither/20 border-filter-dither/50 text-filter-dither',
    category: 'utility',
  },
];

const CATEGORIES = [
  { id: 'eq', label: 'Equalization' },
  { id: 'dynamics', label: 'Dynamics' },
  { id: 'time', label: 'Time-Based' },
  { id: 'utility', label: 'Utility' },
] as const;

/**
 * Quick Add Menu - dialog for quickly adding common filter types.
 * Organized by category with visual filter type indicators.
 */
export function QuickAddMenu({ open, onOpenChange, onSelect }: QuickAddMenuProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('eq');

  const filteredOptions = React.useMemo(
    () => FILTER_OPTIONS.filter((opt) => opt.category === selectedCategory),
    [selectedCategory]
  );

  const handleSelect = React.useCallback(
    (option: FilterOption) => {
      onSelect(option.type);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, option: FilterOption) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(option);
      }
    },
    [handleSelect]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Filter</DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex gap-1 border-b border-dsp-primary/30 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors',
                selectedCategory === cat.id
                  ? 'bg-dsp-accent text-white'
                  : 'text-dsp-text-muted hover:bg-dsp-primary/30 hover:text-dsp-text'
              )}
              onClick={() => { setSelectedCategory(cat.id); }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter options grid */}
        <div className="grid grid-cols-2 gap-2 py-2">
          {filteredOptions.map((option, index) => (
            <button
              key={`${option.type}-${option.label}-${String(index)}`}
              className={cn(
                'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:ring-1 hover:ring-dsp-accent',
                option.colorClass
              )}
              onClick={() => { handleSelect(option); }}
              onKeyDown={(e) => { handleKeyDown(e, option); }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold">{option.label}</span>
                <span className="text-xs opacity-70">{option.shortLabel}</span>
              </div>
              <span className="text-xs opacity-70">{option.description}</span>
            </button>
          ))}
        </div>

        {/* Quick keys hint */}
        <div className="mt-2 border-t border-dsp-primary/30 pt-2 text-center text-xs text-dsp-text-muted">
          Press 1-{filteredOptions.length} to quickly select, or Esc to cancel
        </div>
      </DialogContent>
    </Dialog>
  );
}
