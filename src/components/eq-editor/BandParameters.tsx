import { memo } from 'react';
import { FrequencyInput, GainInput, QInput, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui';
import type { BiquadParameters } from '../../types';
import { type BandParametersProps, hasGain, hasQ, hasSlope } from './types';
import { NumericInput } from '../ui/NumericInput';

/** All supported biquad filter types for EQ */
const BIQUAD_TYPES = [
  { value: 'Peaking', label: 'Peaking EQ' },
  { value: 'Lowshelf', label: 'Low Shelf' },
  { value: 'Highshelf', label: 'High Shelf' },
  { value: 'LowshelfFO', label: 'Low Shelf (1st)' },
  { value: 'HighshelfFO', label: 'High Shelf (1st)' },
  { value: 'Lowpass', label: 'Low Pass' },
  { value: 'Highpass', label: 'High Pass' },
  { value: 'LowpassFO', label: 'Low Pass (1st)' },
  { value: 'HighpassFO', label: 'High Pass (1st)' },
  { value: 'Notch', label: 'Notch' },
  { value: 'Bandpass', label: 'Band Pass' },
  { value: 'Allpass', label: 'All Pass' },
  { value: 'AllpassFO', label: 'All Pass (1st)' },
] as const;

export const BandParameters = memo(function BandParameters({
  band,
  onChange,
  disabled = false,
}: BandParametersProps) {
  if (!band) {
    return (
      <div className="flex items-center justify-center h-32 text-dsp-text-muted">
        Select a band to edit parameters
      </div>
    );
  }

  const { parameters } = band;

  // Get current values
  const freq = 'freq' in parameters ? parameters.freq : 'freq_act' in parameters ? parameters.freq_act : 1000;
  const gain = 'gain' in parameters ? parameters.gain : 0;
  const q = 'q' in parameters ? parameters.q : 0.707;
  const slope = 'slope' in parameters ? parameters.slope : 1;

  const showGain = hasGain(parameters.type);
  const showQ = hasQ(parameters.type);
  const showSlope = hasSlope(parameters.type);

  // Handle filter type change
  const handleTypeChange = (newType: string) => {
    // Build new parameters based on type
    const newParams: Record<string, unknown> = { type: newType };

    // Preserve frequency
    if (newType === 'LinkwitzTransform') {
      newParams.freq_act = freq;
      newParams.q_act = q;
      newParams.freq_target = freq;
      newParams.q_target = q;
    } else {
      newParams.freq = freq;
    }

    // Add gain if applicable
    if (['Peaking', 'Lowshelf', 'Highshelf', 'LowshelfFO', 'HighshelfFO'].includes(newType)) {
      newParams.gain = gain;
    }

    // Add Q if applicable
    if (['Lowpass', 'Highpass', 'Peaking', 'Notch', 'Bandpass', 'Allpass'].includes(newType)) {
      newParams.q = q;
    }

    // Add slope if applicable
    if (['Lowshelf', 'Highshelf'].includes(newType)) {
      newParams.slope = slope;
    }

    onChange(newParams as Partial<BiquadParameters>);
  };

  return (
    <div className="space-y-4">
      {/* Filter Type Selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-dsp-text-muted font-medium">Filter Type</label>
        <Select
          value={parameters.type}
          onValueChange={handleTypeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {BIQUAD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <label className="text-xs text-dsp-text-muted font-medium">Frequency</label>
        <FrequencyInput
          value={freq}
          onChange={(value) => {
            if ('freq' in parameters) {
              onChange({ freq: value });
            } else if ('freq_act' in parameters) {
              onChange({ freq_act: value } as Partial<BiquadParameters>);
            }
          }}
          disabled={disabled}
        />
      </div>

      {/* Gain (if applicable) */}
      {showGain && (
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted font-medium">Gain</label>
          <GainInput
            value={gain}
            onChange={(value) => { onChange({ gain: value }); }}
            disabled={disabled}
          />
        </div>
      )}

      {/* Q Factor (if applicable) */}
      {showQ && (
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted font-medium">Q Factor</label>
          <QInput
            value={q}
            onChange={(value) => { onChange({ q: value }); }}
            disabled={disabled}
          />
        </div>
      )}

      {/* Slope (if applicable) */}
      {showSlope && (
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted font-medium">Slope</label>
          <NumericInput
            value={slope}
            onChange={(value) => { onChange({ slope: value }); }}
            min={0.1}
            max={2}
            step={0.1}
            precision={2}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
});
