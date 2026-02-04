import { useCallback, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import type { DitherParameters } from '../../types';
import { cn } from '../../lib/utils';

const DITHER_TYPES: {
  value: DitherParameters['type'];
  label: string;
  shortLabel: string;
}[] = [
  { value: 'Shibata48', label: 'Shibata 48kHz', shortLabel: 'Shib48' },
  { value: 'Shibata441', label: 'Shibata 44.1kHz', shortLabel: 'Shib44' },
  { value: 'ShibataLow48', label: 'Shibata Low 48kHz', shortLabel: 'ShibL48' },
  { value: 'ShibataLow441', label: 'Shibata Low 44.1kHz', shortLabel: 'ShibL44' },
  { value: 'Lipshitz441', label: 'Lipshitz 44.1kHz', shortLabel: 'Lip44' },
  { value: 'Fweighted441', label: 'F-weighted 44.1kHz', shortLabel: 'Fwt44' },
  { value: 'Highpass', label: 'Highpass', shortLabel: 'HP' },
  { value: 'Flat', label: 'Flat (TPDF)', shortLabel: 'Flat' },
  { value: 'None', label: 'None', shortLabel: 'None' },
];

interface DitherSettingsDropdownProps {
  ditherType: DitherParameters['type'];
  amplitude?: number;
  onTypeChange: (type: DitherParameters['type']) => void;
  onAmplitudeChange?: (amplitude: number) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function DitherSettingsDropdown({
  ditherType,
  amplitude = 2,
  onTypeChange,
  onAmplitudeChange,
  onOpenChange,
  disabled,
  className,
}: DitherSettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedType = DITHER_TYPES.find((t) => t.value === ditherType);

  const handleAmplitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number.parseInt(e.target.value, 10);
      if (Number.isFinite(val) && onAmplitudeChange) {
        onAmplitudeChange(val);
      }
    },
    [onAmplitudeChange],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'inline-flex h-7 items-center gap-1 px-2 text-[11px] transition-colors',
            'bg-dsp-surface text-filter-dither/80',
            'hover:bg-dsp-bg/50 hover:text-filter-dither',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-medium">{selectedType?.shortLabel ?? ditherType}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-[160px] rounded-md border p-1 shadow-lg',
            'border-dsp-primary/60 bg-dsp-surface',
            'animate-in fade-in-0 zoom-in-95',
          )}
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Label className="px-2 py-1 text-[10px] uppercase tracking-wide text-dsp-text-muted">
            Dither Type
          </DropdownMenu.Label>

          <DropdownMenu.RadioGroup
            value={ditherType}
            onValueChange={(v) => onTypeChange(v as DitherParameters['type'])}
          >
            {DITHER_TYPES.map((type) => (
              <DropdownMenu.RadioItem
                key={type.value}
                value={type.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-xs outline-none',
                  'text-dsp-text focus:bg-dsp-primary/50',
                )}
              >
                <span className="absolute left-2 flex h-3 w-3 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check className="h-3 w-3 text-filter-dither" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {type.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          {ditherType === 'Flat' && onAmplitudeChange && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-dsp-primary/30" />
              <div className="px-2 py-1.5">
                <label className="flex items-center justify-between gap-3 text-xs text-dsp-text">
                  <span>Amplitude</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={amplitude}
                      onChange={handleAmplitudeChange}
                      min={0}
                      max={32}
                      className="w-12 rounded border border-dsp-primary/40 bg-dsp-bg/50 px-1.5 py-0.5 text-right font-mono text-xs text-dsp-text outline-none focus:border-filter-dither/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-[10px] text-dsp-text-muted">LSB</span>
                  </div>
                </label>
              </div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
