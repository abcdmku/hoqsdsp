import { forwardRef, useMemo } from 'react';
import { Slider } from './Slider';
import { NumericInput } from './NumericInput';
import { cn } from '../../lib/utils';

export interface FrequencyInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  showSlider?: boolean;
  className?: string;
  disabled?: boolean;
}

// Convert frequency to logarithmic slider position (0-1)
function freqToSlider(freq: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logFreq = Math.log10(freq);
  return (logFreq - logMin) / (logMax - logMin);
}

// Convert slider position to frequency
function sliderToFreq(pos: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logFreq = logMin + pos * (logMax - logMin);
  return Math.pow(10, logFreq);
}

export const FrequencyInput = forwardRef<HTMLInputElement, FrequencyInputProps>(
  ({
    value,
    onChange,
    min = 20,
    max = 20000,
    showSlider = true,
    className,
    disabled,
  }, ref) => {
    const sliderValue = useMemo(() => freqToSlider(value, min, max), [value, min, max]);

    const handleSliderChange = (values: number[]) => {
      const newFreq = sliderToFreq(values[0] ?? 0, min, max);
      // Round to reasonable precision based on frequency range
      const rounded = newFreq < 100
        ? Math.round(newFreq)
        : newFreq < 1000
          ? Math.round(newFreq / 5) * 5
          : Math.round(newFreq / 10) * 10;
      onChange(Math.min(max, Math.max(min, rounded)));
    };

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <NumericInput
          ref={ref}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={value < 100 ? 1 : value < 1000 ? 5 : 10}
          precision={0}
          unit="Hz"
          disabled={disabled}
        />
        {showSlider && (
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            min={0}
            max={1}
            step={0.001}
            disabled={disabled}
          />
        )}
      </div>
    );
  }
);
FrequencyInput.displayName = 'FrequencyInput';
