import { memo } from 'react';
import { Plus, Trash2, Power } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/Tooltip';
import { type BandSelectorProps, getBandColor, getBandFrequency, getBandGain, hasGain } from './types';

export const BandSelector = memo(function BandSelector({
  bands,
  selectedIndex,
  onSelect,
  onAdd,
  onRemove,
  onToggle,
  disabled = false,
}: BandSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Band buttons */}
      {bands.map((band, index) => {
        const isSelected = selectedIndex === index;
        const color = getBandColor(index);
        const freq = getBandFrequency(band.parameters);
        const gain = hasGain(band.parameters.type) ? getBandGain(band.parameters) : null;

        return (
          <Tooltip key={band.id}>
            <TooltipTrigger
              type="button"
              onClick={() => { onSelect(isSelected ? null : index); }}
              disabled={disabled}
              className={cn(
                'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all',
                'border-2 font-medium text-sm',
                isSelected
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-dsp-bg'
                  : 'hover:ring-1 hover:ring-white/50',
                band.enabled
                  ? 'opacity-100'
                  : 'opacity-40',
                disabled && 'cursor-not-allowed',
              )}
              style={{
                backgroundColor: band.enabled ? color : '#4b5563',
                borderColor: isSelected ? '#ffffff' : color,
                color: '#ffffff',
              }}
            >
              {index + 1}
              {!band.enabled && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-dsp-accent rounded-full" />
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="font-medium">{band.parameters.type}</div>
              <div className="text-dsp-text-muted">
                {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq.toFixed(0)} Hz
                {gain !== null && ` / ${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}

      {/* Add band button */}
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-dsp-primary bg-transparent hover:bg-dsp-primary/50 disabled:pointer-events-none disabled:opacity-50"
          onClick={onAdd}
          disabled={disabled}
          aria-label="Add band"
        >
          <Plus className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">Add band</TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Band controls - only show when a band is selected */}
      {selectedIndex !== null && bands[selectedIndex] && (
        <>
          {/* Toggle enable/disable */}
          <Tooltip>
            <TooltipTrigger
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-md disabled:pointer-events-none disabled:opacity-50',
                bands[selectedIndex].enabled
                  ? 'bg-dsp-primary text-dsp-text hover:bg-dsp-primary/80'
                  : 'border border-dsp-primary bg-transparent hover:bg-dsp-primary/50'
              )}
              onClick={() => { onToggle(selectedIndex); }}
              disabled={disabled}
              aria-label={bands[selectedIndex].enabled ? 'Bypass band' : 'Enable band'}
            >
              <Power className={cn('w-4 h-4', bands[selectedIndex].enabled && 'text-meter-green')} />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {bands[selectedIndex].enabled ? 'Bypass band (B)' : 'Enable band (B)'}
            </TooltipContent>
          </Tooltip>

          {/* Remove band */}
          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-meter-red text-white hover:bg-meter-red/90 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => { onRemove(selectedIndex); }}
              disabled={disabled}
              aria-label="Remove band"
            >
              <Trash2 className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Remove band (Delete)</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
});
