import { useCallback } from 'react';
import type { DelayFilter, DelayParameters } from '../../types';
import { delayHandler } from '../../lib/filters/delay';
import { FilterEditorModal, useFilterEditor } from './FilterEditorModal';
import { NumericInput } from '../ui';
import { Switch } from '../ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

interface DelayEditorProps {
  open: boolean;
  onClose: () => void;
  filter: DelayFilter;
  onSave: (config: DelayFilter) => void;
  onApply?: (config: DelayFilter) => void;
  sampleRate?: number;
}

type DelayUnit = DelayParameters['unit'];

function DelayEditorContent({ sampleRate }: { sampleRate: number }) {
  const { filter, updateFilter } = useFilterEditor<DelayFilter>();
  const params = filter.parameters;

  const updateDelay = useCallback(
    (delay: number) => {
      updateFilter({
        ...filter,
        parameters: { ...params, delay },
      });
    },
    [filter, params, updateFilter],
  );

  const updateUnit = useCallback(
    (unit: DelayUnit) => {
      // Convert delay value when switching units
      let newDelay = params.delay;

      if (params.unit === 'ms' && unit === 'samples') {
        newDelay = Math.round(params.delay * sampleRate / 1000);
      } else if (params.unit === 'samples' && unit === 'ms') {
        newDelay = (params.delay * 1000) / sampleRate;
      } else if (params.unit === 'mm' && unit === 'ms') {
        // Speed of sound ~343 m/s at 20C
        newDelay = params.delay / 0.343;
      } else if (params.unit === 'ms' && unit === 'mm') {
        newDelay = params.delay * 0.343;
      } else if (params.unit === 'mm' && unit === 'samples') {
        newDelay = Math.round((params.delay / 0.343) * sampleRate / 1000);
      } else if (params.unit === 'samples' && unit === 'mm') {
        newDelay = (params.delay * 1000 / sampleRate) * 0.343;
      }

      updateFilter({
        ...filter,
        parameters: { ...params, unit, delay: newDelay },
      });
    },
    [filter, params, sampleRate, updateFilter],
  );

  const toggleSubsample = useCallback(
    (subsample: boolean) => {
      updateFilter({
        ...filter,
        parameters: { ...params, subsample },
      });
    },
    [filter, params, updateFilter],
  );

  // Calculate equivalent values for display
  const equivalentMs = params.unit === 'ms'
    ? params.delay
    : params.unit === 'samples'
      ? (params.delay * 1000) / sampleRate
      : params.delay / 0.343;

  const equivalentSamples = params.unit === 'samples'
    ? params.delay
    : params.unit === 'ms'
      ? (params.delay * sampleRate) / 1000
      : ((params.delay / 0.343) * sampleRate) / 1000;

  const equivalentMm = params.unit === 'mm'
    ? params.delay
    : params.unit === 'ms'
      ? params.delay * 0.343
      : (params.delay * 1000 / sampleRate) * 0.343;

  const getStepForUnit = (): number => {
    switch (params.unit) {
      case 'ms':
        return 0.01;
      case 'samples':
        return 1;
      case 'mm':
        return 1;
      default:
        return 0.1;
    }
  };

  const getPrecisionForUnit = (): number => {
    switch (params.unit) {
      case 'ms':
        return 3;
      case 'samples':
        return 0;
      case 'mm':
        return 1;
      default:
        return 2;
    }
  };

  return (
    <div className="space-y-6">
      {/* Delay Unit Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Unit</label>
        <Select value={params.unit} onValueChange={(v) => { updateUnit(v as DelayUnit); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ms">Milliseconds (ms)</SelectItem>
            <SelectItem value="samples">Samples</SelectItem>
            <SelectItem value="mm">Millimeters (mm)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delay Value */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Delay</label>
        <NumericInput
          value={params.delay}
          onChange={updateDelay}
          min={0}
          max={params.unit === 'samples' ? 1000000 : params.unit === 'mm' ? 100000 : 10000}
          step={getStepForUnit()}
          precision={getPrecisionForUnit()}
          unit={params.unit}
        />
      </div>

      {/* Equivalent Values Display */}
      <div className="bg-dsp-bg rounded-md p-3 space-y-1">
        <p className="text-xs text-dsp-text-muted uppercase tracking-wide mb-2">Equivalent</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {params.unit !== 'ms' && (
            <div>
              <span className="text-dsp-text-muted">Time: </span>
              <span className="text-dsp-text font-mono">{equivalentMs.toFixed(3)} ms</span>
            </div>
          )}
          {params.unit !== 'samples' && (
            <div>
              <span className="text-dsp-text-muted">Samples: </span>
              <span className="text-dsp-text font-mono">{equivalentSamples.toFixed(1)}</span>
            </div>
          )}
          {params.unit !== 'mm' && (
            <div>
              <span className="text-dsp-text-muted">Distance: </span>
              <span className="text-dsp-text font-mono">{equivalentMm.toFixed(1)} mm</span>
            </div>
          )}
        </div>
      </div>

      {/* Subsample Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-dsp-text">Subsample Interpolation</label>
          <p className="text-xs text-dsp-text-muted">
            Enable for fractional sample delays (higher CPU usage)
          </p>
        </div>
        <Switch
          checked={params.subsample}
          onCheckedChange={toggleSubsample}
          aria-label="Enable subsample interpolation"
        />
      </div>

      {/* Sample rate info */}
      <div className="text-xs text-dsp-text-muted border-t border-dsp-primary/30 pt-4">
        Sample rate: {sampleRate.toLocaleString()} Hz
      </div>
    </div>
  );
}

export function DelayEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
}: DelayEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Delay"
      description="Time alignment delay"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => delayHandler.validate(config)}
    >
      <DelayEditorContent sampleRate={sampleRate} />
    </FilterEditorModal>
  );
}
