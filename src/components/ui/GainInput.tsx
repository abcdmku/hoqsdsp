import { forwardRef } from 'react';
import { Slider } from './Slider';
import { NumericInput } from './NumericInput';
import { cn } from '../../lib/utils';

export interface GainInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  showSlider?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const GainInput = forwardRef<HTMLInputElement, GainInputProps>(
  ({
    value,
    onChange,
    min = -24,
    max = 24,
    showSlider = true,
    ariaLabel,
    className,
    disabled,
  }, ref) => {
    const handleSliderChange = (values: number[]) => {
      onChange(values[0] ?? 0);
    };

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <NumericInput
          ref={ref}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={0.5}
          precision={1}
          unit="dB"
          disabled={disabled}
          aria-label={ariaLabel}
        />
        {showSlider && (
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={0.1}
            disabled={disabled}
            aria-label={ariaLabel}
          />
        )}
      </div>
    );
  }
);
GainInput.displayName = 'GainInput';
