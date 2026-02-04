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
  { value: 'Lowpass', label: 'Low Pass' },
  { value: 'Highpass', label: 'High Pass' },
  { value: 'Notch', label: 'Notch' },
  { value: 'Bandpass', label: 'Band Pass' },
  { value: 'Allpass', label: 'All Pass' },
  { value: 'AllpassFO', label: 'All Pass (1st)' },
] as const;

const ORDERABLE_TYPES = ['Lowshelf', 'Highshelf', 'Lowpass', 'Highpass'] as const;
type OrderableType = (typeof ORDERABLE_TYPES)[number];

function isOrderableType(value: string): value is OrderableType {
  return (ORDERABLE_TYPES as readonly string[]).includes(value);
}

function uiTypeFor(type: BiquadParameters['type']): BiquadParameters['type'] {
  switch (type) {
    case 'LowpassFO':
      return 'Lowpass';
    case 'HighpassFO':
      return 'Highpass';
    case 'LowshelfFO':
      return 'Lowshelf';
    case 'HighshelfFO':
      return 'Highshelf';
    default:
      return type;
  }
}

function orderFor(type: BiquadParameters['type']): 1 | 2 | null {
  switch (type) {
    case 'LowpassFO':
    case 'HighpassFO':
    case 'LowshelfFO':
    case 'HighshelfFO':
      return 1;
    case 'Lowpass':
    case 'Highpass':
    case 'Lowshelf':
    case 'Highshelf':
      return 2;
    default:
      return null;
  }
}

function applyOrder(uiType: OrderableType, order: 1 | 2): BiquadParameters['type'] {
  if (order === 2) return uiType;
  switch (uiType) {
    case 'Lowpass':
      return 'LowpassFO';
    case 'Highpass':
      return 'HighpassFO';
    case 'Lowshelf':
      return 'LowshelfFO';
    case 'Highshelf':
      return 'HighshelfFO';
  }
}

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
  const uiType = uiTypeFor(parameters.type);
  const order = orderFor(parameters.type);

  const showGain = hasGain(parameters.type);
  const showQ = hasQ(parameters.type);
  const showSlope = hasSlope(parameters.type);
  const showOrder = isOrderableType(uiType);

  const buildParamsForType = (nextType: BiquadParameters['type']) => {
    // Build new parameters based on type
    const newParams: Record<string, unknown> = { type: nextType };

    // Preserve frequency
    if (nextType === 'LinkwitzTransform') {
      newParams.freq_act = freq;
      newParams.q_act = q;
      newParams.freq_target = freq;
      newParams.q_target = q;
    } else {
      newParams.freq = freq;
    }

    // Add gain if applicable
    if (hasGain(nextType)) {
      newParams.gain = gain;
    }

    // Add Q if applicable
    if (hasQ(nextType)) {
      newParams.q = q;
    }

    // Add slope if applicable
    if (hasSlope(nextType)) {
      newParams.slope = slope;
    }

    return newParams as Partial<BiquadParameters>;
  };

  // Handle filter type change
  const handleTypeChange = (nextUiType: string) => {
    const nextOrder = isOrderableType(nextUiType)
      ? (order ?? 2)
      : null;
    const nextType = isOrderableType(nextUiType)
      ? applyOrder(nextUiType, nextOrder)
      : (nextUiType as BiquadParameters['type']);

    onChange(buildParamsForType(nextType));
  };

  const handleOrderChange = (nextOrder: 1 | 2) => {
    if (!isOrderableType(uiType)) return;
    const nextType = applyOrder(uiType, nextOrder);
    onChange(buildParamsForType(nextType));
  };

  return (
    <div className="space-y-4">
      {/* Filter Type Selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-dsp-text-muted font-medium">Filter Type</label>
        <Select
          value={uiType}
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

      {showOrder && (
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted font-medium">Order</label>
          <Select
            value={String(order ?? 2)}
            onValueChange={(value) => {
              const parsed = Number.parseInt(value, 10);
              if (parsed === 1 || parsed === 2) {
                handleOrderChange(parsed);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st</SelectItem>
              <SelectItem value="2">2nd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
