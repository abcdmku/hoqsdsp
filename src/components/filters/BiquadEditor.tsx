import { useCallback } from 'react';
import type { BiquadFilter, BiquadParameters } from '../../types';
import { biquadHandler } from '../../lib/filters/biquad';
import { FilterEditorModal, useFilterEditor } from './FilterEditorModal';
import { FrequencyInput, GainInput, QInput, NumericInput } from '../ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

interface BiquadEditorProps {
  open: boolean;
  onClose: () => void;
  filter: BiquadFilter;
  onSave: (config: BiquadFilter) => void;
  onApply?: (config: BiquadFilter) => void;
  sampleRate?: number;
}

// Biquad filter type definitions with required parameters
interface BiquadTypeConfig {
  value: string;
  label: string;
  needsFreq?: boolean;
  needsQ?: boolean;
  needsGain?: boolean;
  needsSlope?: boolean;
  needsOrder?: boolean;
  needsLinkwitz?: boolean;
}

const BIQUAD_TYPES: readonly BiquadTypeConfig[] = [
  { value: 'Lowpass', label: 'Lowpass', needsFreq: true, needsQ: true },
  { value: 'Highpass', label: 'Highpass', needsFreq: true, needsQ: true },
  { value: 'LowpassFO', label: 'Lowpass (1st order)', needsFreq: true },
  { value: 'HighpassFO', label: 'Highpass (1st order)', needsFreq: true },
  { value: 'Peaking', label: 'Peaking EQ', needsFreq: true, needsQ: true, needsGain: true },
  { value: 'Lowshelf', label: 'Low Shelf', needsFreq: true, needsGain: true, needsSlope: true },
  { value: 'Highshelf', label: 'High Shelf', needsFreq: true, needsGain: true, needsSlope: true },
  { value: 'LowshelfFO', label: 'Low Shelf (1st order)', needsFreq: true, needsGain: true },
  { value: 'HighshelfFO', label: 'High Shelf (1st order)', needsFreq: true, needsGain: true },
  { value: 'Notch', label: 'Notch', needsFreq: true, needsQ: true },
  { value: 'Bandpass', label: 'Bandpass', needsFreq: true, needsQ: true },
  { value: 'Allpass', label: 'Allpass', needsFreq: true, needsQ: true },
  { value: 'AllpassFO', label: 'Allpass (1st order)', needsFreq: true },
  { value: 'LinkwitzTransform', label: 'Linkwitz Transform', needsLinkwitz: true },
  { value: 'ButterworthLowpass', label: 'Butterworth Lowpass', needsFreq: true, needsOrder: true },
  { value: 'ButterworthHighpass', label: 'Butterworth Highpass', needsFreq: true, needsOrder: true },
  { value: 'LinkwitzRileyLowpass', label: 'Linkwitz-Riley Lowpass', needsFreq: true, needsOrder: true },
  { value: 'LinkwitzRileyHighpass', label: 'Linkwitz-Riley Highpass', needsFreq: true, needsOrder: true },
];

type BiquadTypeValue = BiquadTypeConfig['value'];

// Inner editor component that uses the context
function BiquadEditorContent() {
  const { filter, updateFilter } = useFilterEditor<BiquadFilter>();
  const params = filter.parameters;
  const typeConfig = BIQUAD_TYPES.find((t) => t.value === params.type);

  const handleTypeChange = useCallback(
    (newType: BiquadTypeValue) => {
      // Build new parameters based on type requirements
      const typeInfo = BIQUAD_TYPES.find((t) => t.value === newType);
      if (!typeInfo) return;

      let newParams: BiquadParameters;

      // Preserve existing values where possible
      const existingFreq = 'freq' in params ? params.freq : 1000;
      const existingQ = 'q' in params ? params.q : 0.707;
      const existingGain = 'gain' in params ? params.gain : 0;

      if (newType === 'LinkwitzTransform') {
        newParams = {
          type: 'LinkwitzTransform',
          freq_act: existingFreq,
          q_act: existingQ,
          freq_target: existingFreq / 2,
          q_target: 0.707,
        };
      } else if (newType === 'ButterworthLowpass' || newType === 'ButterworthHighpass') {
        newParams = {
          type: newType,
          freq: existingFreq,
          order: 4,
        };
      } else if (newType === 'LinkwitzRileyLowpass' || newType === 'LinkwitzRileyHighpass') {
        newParams = {
          type: newType,
          freq: existingFreq,
          order: 4,
        };
      } else if (typeInfo.needsQ && typeInfo.needsGain) {
        newParams = {
          type: newType as 'Peaking',
          freq: existingFreq,
          q: existingQ,
          gain: existingGain,
        };
      } else if (typeInfo.needsGain && typeInfo.needsSlope) {
        newParams = {
          type: newType as 'Lowshelf' | 'Highshelf',
          freq: existingFreq,
          gain: existingGain,
          slope: 6,
        };
      } else if (typeInfo.needsGain) {
        newParams = {
          type: newType as 'LowshelfFO' | 'HighshelfFO',
          freq: existingFreq,
          gain: existingGain,
        };
      } else if (typeInfo.needsQ) {
        newParams = {
          type: newType as 'Lowpass' | 'Highpass' | 'Notch' | 'Bandpass' | 'Allpass',
          freq: existingFreq,
          q: existingQ,
        };
      } else {
        newParams = {
          type: newType as 'LowpassFO' | 'HighpassFO' | 'AllpassFO',
          freq: existingFreq,
        };
      }

      updateFilter({ ...filter, parameters: newParams });
    },
    [filter, params, updateFilter],
  );

  const updateParam = useCallback(
    <K extends keyof BiquadParameters>(key: K, value: BiquadParameters[K]) => {
      updateFilter({
        ...filter,
        parameters: { ...params, [key]: value } as BiquadParameters,
      });
    },
    [filter, params, updateFilter],
  );

  return (
    <div className="space-y-6">
      {/* Filter Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Filter Type</label>
        <Select value={params.type} onValueChange={(v) => { handleTypeChange(v); }}>
          <SelectTrigger>
            <SelectValue />
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

      {/* Standard Frequency */}
      {typeConfig?.needsFreq && 'freq' in params && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Frequency</label>
          <FrequencyInput
            value={params.freq}
            onChange={(v) => { updateParam('freq' as keyof BiquadParameters, v as never); }}
          />
        </div>
      )}

      {/* Q Factor */}
      {typeConfig?.needsQ && 'q' in params && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Q Factor</label>
          <QInput
            value={params.q}
            onChange={(v) => { updateParam('q' as keyof BiquadParameters, v as never); }}
          />
        </div>
      )}

      {/* Gain */}
      {typeConfig?.needsGain && 'gain' in params && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Gain</label>
          <GainInput
            value={params.gain}
            onChange={(v) => { updateParam('gain' as keyof BiquadParameters, v as never); }}
            min={-40}
            max={40}
          />
        </div>
      )}

      {/* Slope (for shelf filters) */}
      {typeConfig?.needsSlope && 'slope' in params && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Slope</label>
          <NumericInput
            value={params.slope}
            onChange={(v) => { updateParam('slope' as keyof BiquadParameters, v as never); }}
            min={0.1}
            max={12}
            step={0.1}
            precision={1}
            unit="dB/oct"
          />
        </div>
      )}

      {/* Order (for Butterworth/Linkwitz-Riley) */}
      {typeConfig?.needsOrder && 'order' in params && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Order</label>
          <Select
            value={String(params.order)}
            onValueChange={(v) => { updateParam('order' as keyof BiquadParameters, Number(v) as never); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2nd order (12 dB/oct)</SelectItem>
              <SelectItem value="4">4th order (24 dB/oct)</SelectItem>
              <SelectItem value="6">6th order (36 dB/oct)</SelectItem>
              <SelectItem value="8">8th order (48 dB/oct)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Linkwitz Transform - special parameters */}
      {typeConfig?.needsLinkwitz && params.type === 'LinkwitzTransform' && (
        <>
          <div className="border-t border-dsp-primary/30 pt-4">
            <h4 className="text-sm font-medium text-dsp-text mb-4">Actual Speaker</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-dsp-text-muted">Resonant Frequency</label>
                <FrequencyInput
                  value={params.freq_act}
                  onChange={(v) => { updateParam('freq_act' as keyof BiquadParameters, v as never); }}
                  min={10}
                  max={200}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-dsp-text-muted">Q Factor</label>
                <QInput
                  value={params.q_act}
                  onChange={(v) => { updateParam('q_act' as keyof BiquadParameters, v as never); }}
                  min={0.1}
                  max={5}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-dsp-primary/30 pt-4">
            <h4 className="text-sm font-medium text-dsp-text mb-4">Target Response</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-dsp-text-muted">Target Frequency</label>
                <FrequencyInput
                  value={params.freq_target}
                  onChange={(v) => { updateParam('freq_target' as keyof BiquadParameters, v as never); }}
                  min={10}
                  max={200}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-dsp-text-muted">Target Q</label>
                <QInput
                  value={params.q_target}
                  onChange={(v) => { updateParam('q_target' as keyof BiquadParameters, v as never); }}
                  min={0.1}
                  max={2}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BiquadEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
}: BiquadEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Biquad Filter"
      description={`${filter.parameters.type} filter`}
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => biquadHandler.validate(config)}
      showFrequencyResponse
      sampleRate={sampleRate}
    >
      <BiquadEditorContent />
    </FilterEditorModal>
  );
}
