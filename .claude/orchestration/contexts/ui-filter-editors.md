# Agent Context: Filter Editor UI Components

## Your Role
You are building the filter editor UI components. Each filter type needs a specialized editor with appropriate controls and real-time validation.

## Design Principles
- **Immediate feedback**: Show validation errors as user types
- **Real-time preview**: Update frequency response graph as parameters change
- **Accessibility**: Full keyboard navigation, ARIA labels
- **Consistency**: All editors follow the same layout pattern

## Base Editor Modal Layout

```
┌──────────────────────────────────────────────────────────┐
│  Filter Name: [______________________]  [Filter Type ▼]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │              Frequency Response Graph               │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Parameters Section - varies by filter type]            │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                              [Cancel]  [Apply]  [Save]   │
└──────────────────────────────────────────────────────────┘
```

## Task 6.1.1: Base Filter Editor Modal

Create `src/components/filters/FilterEditorModal.tsx`:

```tsx
import { Dialog, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { FrequencyResponse } from '@/components/monitoring/FrequencyResponse';
import { Button } from '@/components/ui/Button';

interface FilterEditorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  filterConfig: FilterConfig;
  onSave: (config: FilterConfig) => void;
  onApply: (config: FilterConfig) => void;
  children: React.ReactNode; // Parameter inputs
}

export function FilterEditorModal({
  open,
  onClose,
  title,
  filterConfig,
  onSave,
  onApply,
  children,
}: FilterEditorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="flex flex-col h-[80vh] max-h-[700px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogClose />
        </div>

        {/* Frequency Response Graph */}
        <div className="h-48 p-4 border-b border-white/10">
          <FrequencyResponse filter={filterConfig} />
        </div>

        {/* Parameters */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={() => onApply(filterConfig)}>Apply</Button>
          <Button onClick={() => onSave(filterConfig)}>Save</Button>
        </div>
      </div>
    </Dialog>
  );
}
```

## Task 6.1.2: Numeric Input with Units

Create `src/components/ui/NumericInput.tsx`:

```tsx
interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  error?: string;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  error,
}: NumericInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-gray-400">{label}</label>}
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full bg-dsp-bg border border-white/20 rounded px-3 py-2 pr-10 font-mono"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
```

## Task 6.1.3: Frequency Input with Logarithmic Slider

Create `src/components/ui/FrequencyInput.tsx`:

```tsx
import * as Slider from '@radix-ui/react-slider';

interface FrequencyInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

// Convert linear slider value (0-1) to logarithmic frequency
function sliderToFreq(value: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + value * (logMax - logMin));
}

// Convert frequency to linear slider value (0-1)
function freqToSlider(freq: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logFreq = Math.log10(freq);
  return (logFreq - logMin) / (logMax - logMin);
}

export function FrequencyInput({
  value,
  onChange,
  min = 20,
  max = 20000,
  label = 'Frequency',
}: FrequencyInputProps) {
  const sliderValue = freqToSlider(value, min, max);

  const handleSliderChange = (values: number[]) => {
    const freq = Math.round(sliderToFreq(values[0], min, max));
    onChange(freq);
  };

  // Format frequency for display
  const formatFreq = (f: number) => {
    if (f >= 1000) return `${(f / 1000).toFixed(1)}k`;
    return f.toString();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="font-mono text-sm">{formatFreq(value)} Hz</span>
      </div>

      <Slider.Root
        value={[sliderValue]}
        onValueChange={handleSliderChange}
        min={0}
        max={1}
        step={0.001}
        className="relative flex items-center select-none touch-none h-5"
      >
        <Slider.Track className="bg-dsp-primary relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-dsp-accent rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-5 h-5 bg-white rounded-full shadow focus:outline-none focus:ring-2 focus:ring-dsp-accent" />
      </Slider.Root>

      {/* Frequency scale markers */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>20</span>
        <span>100</span>
        <span>1k</span>
        <span>10k</span>
        <span>20k</span>
      </div>
    </div>
  );
}
```

## Task 6.2.1: Biquad Filter Editor

Create `src/components/filters/BiquadEditor.tsx`:

```tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { biquadSchema } from '@/lib/dsp/filters/biquad';
import { FilterEditorModal } from './FilterEditorModal';
import { FrequencyInput } from '@/components/ui/FrequencyInput';
import { GainInput } from '@/components/ui/GainInput';
import { NumericInput } from '@/components/ui/NumericInput';
import { Select } from '@/components/ui/Select';

const BIQUAD_TYPES = [
  { value: 'Highpass', label: 'Highpass', needsQ: true },
  { value: 'Lowpass', label: 'Lowpass', needsQ: true },
  { value: 'Peaking', label: 'Peaking EQ', needsQ: true, needsGain: true },
  { value: 'Notch', label: 'Notch', needsQ: true },
  { value: 'Bandpass', label: 'Bandpass', needsQ: true },
  { value: 'Allpass', label: 'Allpass', needsQ: true },
  { value: 'Highshelf', label: 'High Shelf', needsGain: true },
  { value: 'Lowshelf', label: 'Low Shelf', needsGain: true },
  // ... more types
];

export function BiquadEditor({ filter, onSave, onClose }: BiquadEditorProps) {
  const form = useForm({
    defaultValues: filter.parameters,
    validatorAdapter: zodValidator(),
    validators: { onChange: biquadSchema },
    onSubmit: async ({ value }) => onSave({ type: 'Biquad', parameters: value }),
  });

  const filterType = form.useStore((s) => s.values.type);
  const typeConfig = BIQUAD_TYPES.find((t) => t.value === filterType);

  return (
    <FilterEditorModal
      open
      onClose={onClose}
      title="Biquad Filter"
      filterConfig={{ type: 'Biquad', parameters: form.state.values }}
      onSave={() => form.handleSubmit()}
      onApply={() => {/* Apply without saving */}}
    >
      <div className="space-y-6">
        {/* Filter Type Selector */}
        <form.Field
          name="type"
          children={(field) => (
            <Select
              label="Filter Type"
              value={field.state.value}
              onValueChange={field.handleChange}
              options={BIQUAD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          )}
        />

        {/* Frequency */}
        <form.Field
          name="freq"
          children={(field) => (
            <FrequencyInput
              value={field.state.value || 1000}
              onChange={field.handleChange}
              label="Frequency"
            />
          )}
        />

        {/* Q Factor (conditional) */}
        {typeConfig?.needsQ && (
          <form.Field
            name="q"
            children={(field) => (
              <NumericInput
                value={field.state.value || 0.707}
                onChange={field.handleChange}
                min={0.1}
                max={100}
                step={0.01}
                label="Q Factor"
              />
            )}
          />
        )}

        {/* Gain (conditional) */}
        {typeConfig?.needsGain && (
          <form.Field
            name="gain"
            children={(field) => (
              <GainInput
                value={field.state.value || 0}
                onChange={field.handleChange}
                min={-40}
                max={40}
                label="Gain"
              />
            )}
          />
        )}
      </div>
    </FilterEditorModal>
  );
}
```

## Other Filter Editors

Follow the same pattern for:
- **ConvolutionEditor**: File picker, format selector, channel selector
- **DelayEditor**: Value input with unit selector (ms/samples/mm), subsample toggle
- **GainEditor**: Gain slider with dB/linear toggle, invert checkbox
- **VolumeEditor**: Fader selector dropdown, min/max limits
- **DitherEditor**: Type selector, bits input
- **DiffEqEditor**: A and B coefficient array inputs
- **CompressorEditor**: Threshold, ratio, attack, release inputs
- **LoudnessEditor**: Reference level input
- **NoiseGateEditor**: Threshold and timing inputs

## Validation Feedback

All inputs should show validation errors immediately:

```tsx
<div className="space-y-1">
  <input className={cn(
    'border',
    error ? 'border-red-500' : 'border-white/20'
  )} />
  {error && (
    <p className="text-sm text-red-500 flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      {error}
    </p>
  )}
</div>
```

## Keyboard Navigation

- Tab between fields
- Enter to apply changes
- Escape to close without saving
- Arrow keys for sliders
- Number input accepts direct typing
