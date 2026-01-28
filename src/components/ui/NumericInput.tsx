import { forwardRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  showStepper?: boolean;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      min = -Infinity,
      max = Infinity,
      step = 1,
      precision = 2,
      unit,
      showStepper = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [editingValue, setEditingValue] = useState<string | null>(null);
    const displayedValue = editingValue ?? value.toFixed(precision);

    const clamp = useCallback(
      (val: number) => Math.min(max, Math.max(min, val)),
      [min, max]
    );

    const commit = useCallback(() => {
      if (editingValue === null) return;
      const parsed = Number.parseFloat(editingValue);
      if (!Number.isNaN(parsed)) {
        onChange(clamp(parsed));
      }
      setEditingValue(null);
    }, [editingValue, clamp, onChange]);

    const increment = useCallback(() => {
      onChange(clamp(value + step));
      setEditingValue(null);
    }, [value, step, clamp, onChange]);

    const decrement = useCallback(() => {
      onChange(clamp(value - step));
      setEditingValue(null);
    }, [value, step, clamp, onChange]);

    return (
      <div className={cn('flex items-center gap-1', className)}>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayedValue}
          onChange={(e) => { setEditingValue(e.target.value); }}
          onFocus={() => { setEditingValue(value.toFixed(precision)); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              increment();
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              decrement();
              return;
            }
            if (e.key === 'Enter') {
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={disabled}
          className={cn(
            [
              'w-24 h-8 px-2 text-right text-sm font-mono tabular-nums',
              'rounded-md border border-dsp-primary/50 bg-dsp-bg/40 text-dsp-text',
              'placeholder:text-dsp-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-dsp-accent/35 focus:ring-offset-2 focus:ring-offset-dsp-bg',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')
          )}
          {...props}
        />

        {unit && <span className="text-xs text-dsp-text-muted">{unit}</span>}

        {showStepper && (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={increment}
              disabled={disabled === true || value >= max}
              className={cn(
                'inline-flex h-4 w-6 items-center justify-center rounded-sm border border-transparent',
                'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/35',
                'disabled:opacity-30 disabled:hover:bg-transparent'
              )}
              aria-label="Increment"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={decrement}
              disabled={disabled === true || value <= min}
              className={cn(
                'inline-flex h-4 w-6 items-center justify-center rounded-sm border border-transparent',
                'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/35',
                'disabled:opacity-30 disabled:hover:bg-transparent'
              )}
              aria-label="Decrement"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }
);
NumericInput.displayName = 'NumericInput';
