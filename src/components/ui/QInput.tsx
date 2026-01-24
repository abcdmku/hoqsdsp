import { forwardRef, useMemo } from 'react';
import { Slider } from './Slider';
import { NumericInput } from './NumericInput';
import { cn } from '../../lib/utils';

export interface QInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  showSlider?: boolean;
  className?: string;
  disabled?: boolean;
}

// Use logarithmic scale for Q (more resolution at low Q values)
function qToSlider(q: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logQ = Math.log10(q);
  return (logQ - logMin) / (logMax - logMin);
}

function sliderToQ(pos: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logQ = logMin + pos * (logMax - logMin);
  return Math.pow(10, logQ);
}

export const QInput = forwardRef<HTMLInputElement, QInputProps>(
  ({
    value,
    onChange,
    min = 0.1,
    max = 20,
    showSlider = true,
    className,
    disabled,
  }, ref) => {
    const sliderValue = useMemo(() => qToSlider(value, min, max), [value, min, max]);

    const handleSliderChange = (values: number[]) => {
      const newQ = sliderToQ(values[0] ?? 0.5, min, max);
      // Round to 2 decimal places
      onChange(Math.round(newQ * 100) / 100);
    };

    // Calculate bandwidth in octaves: BW = 2 * asinh(1/(2*Q)) / ln(2)
    const bandwidth = useMemo(() => {
      const bw = (2 * Math.asinh(1 / (2 * value))) / Math.LN2;
      return bw.toFixed(2);
    }, [value]);

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
          <NumericInput
            ref={ref}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={0.1}
            precision={2}
            unit="Q"
            disabled={disabled}
          />
          <span className="text-xs text-dsp-text-muted">
            ({bandwidth} oct)
          </span>
        </div>
        {showSlider && (
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            min={0}
            max={1}
            step={0.01}
            disabled={disabled}
          />
        )}
      </div>
    );
  }
);
QInput.displayName = 'QInput';
