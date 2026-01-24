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
    className,
    disabled,
  }, ref) => {
    const handleSliderChange = (values: number[]) => {
      onChange(values[0] ?? 0);
    };

    const gainColor = value > 0
      ? 'text-meter-green'
      : value < 0
        ? 'text-meter-yellow'
        : 'text-dsp-text';

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
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
          />
          <span className={cn("text-sm font-mono", gainColor)}>
            {value > 0 ? '+' : ''}{value.toFixed(1)}
          </span>
        </div>
        {showSlider && (
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={0.1}
            disabled={disabled}
          />
        )}
      </div>
    );
  }
);
GainInput.displayName = 'GainInput';
