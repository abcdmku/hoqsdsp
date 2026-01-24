import { forwardRef, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
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
  ({
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
  }, ref) => {
    const [inputValue, setInputValue] = useState(value.toFixed(precision));

    const clamp = useCallback((val: number) => {
      return Math.min(max, Math.max(min, val));
    }, [min, max]);

    const handleBlur = useCallback(() => {
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        const clamped = clamp(parsed);
        onChange(clamped);
        setInputValue(clamped.toFixed(precision));
      } else {
        setInputValue(value.toFixed(precision));
      }
    }, [inputValue, clamp, onChange, value, precision]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newValue = clamp(value + step);
        onChange(newValue);
        setInputValue(newValue.toFixed(precision));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newValue = clamp(value - step);
        onChange(newValue);
        setInputValue(newValue.toFixed(precision));
      } else if (e.key === 'Enter') {
        handleBlur();
      }
    }, [value, step, clamp, onChange, precision, handleBlur]);

    const increment = useCallback(() => {
      const newValue = clamp(value + step);
      onChange(newValue);
      setInputValue(newValue.toFixed(precision));
    }, [value, step, clamp, onChange, precision]);

    const decrement = useCallback(() => {
      const newValue = clamp(value - step);
      onChange(newValue);
      setInputValue(newValue.toFixed(precision));
    }, [value, step, clamp, onChange, precision]);

    return (
      <div className={cn("flex items-center gap-1", className)}>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-20 h-8 px-2 text-right text-sm bg-dsp-surface border border-dsp-primary rounded-md",
            "text-dsp-text focus:outline-none focus:ring-2 focus:ring-dsp-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          {...props}
        />
        {unit && <span className="text-xs text-dsp-text-muted">{unit}</span>}
        {showStepper && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={increment}
              disabled={disabled === true || value >= max}
              className="h-4 w-4 flex items-center justify-center text-dsp-text-muted hover:text-dsp-text disabled:opacity-30"
              aria-label="Increment"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={decrement}
              disabled={disabled === true || value <= min}
              className="h-4 w-4 flex items-center justify-center text-dsp-text-muted hover:text-dsp-text disabled:opacity-30"
              aria-label="Decrement"
            >
              ▼
            </button>
          </div>
        )}
      </div>
    );
  }
);
NumericInput.displayName = 'NumericInput';
