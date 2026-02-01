import { useCallback } from 'react';
import type { DelayFilter, DelayParameters } from '../../types';
import { delayHandler } from '../../lib/filters/delay';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
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

interface DelayEditorPanelProps {
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
  const formattedSampleRate = sampleRate.toLocaleString(undefined, { maximumFractionDigits: 0 });

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
    <div className="space-y-3">
      {/* Compact row: Value + Unit + Subsample toggle */}
      <div className="flex items-center gap-3">
        <NumericInput
          value={params.delay}
          onChange={updateDelay}
          min={0}
          max={params.unit === 'samples' ? 1000000 : params.unit === 'mm' ? 100000 : 10000}
          step={getStepForUnit()}
          precision={getPrecisionForUnit()}
          className="flex-1"
        />

        <Select value={params.unit} onValueChange={(v) => { updateUnit(v as DelayUnit); }}>
          <SelectTrigger className="w-28">
            <span className="sr-only">Unit</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ms">ms</SelectItem>
            <SelectItem value="samples">samples</SelectItem>
            <SelectItem value="mm">mm</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-dsp-text-muted whitespace-nowrap">
          <Switch
            checked={params.subsample}
            onCheckedChange={toggleSubsample}
            aria-label="Enable subsample interpolation"
          />
          <span>Subsample Interpolation</span>
        </label>
      </div>

      <div className="rounded-md border border-dsp-primary/30 bg-dsp-bg/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
            Equivalent
          </div>
          <div className="text-xs text-dsp-text-muted">{formattedSampleRate} Hz</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-dsp-text-muted">
          {params.unit !== 'ms' && (
            <span>
              <span className="text-dsp-text font-mono">{equivalentMs.toFixed(3)}</span> ms
            </span>
          )}
          {params.unit !== 'samples' && (
            <span>
              <span className="text-dsp-text font-mono">{equivalentSamples.toFixed(1)}</span> samples
            </span>
          )}
          {params.unit !== 'mm' && (
            <span>
              <span className="text-dsp-text font-mono">{equivalentMm.toFixed(1)}</span> mm
            </span>
          )}
        </div>
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

export function DelayEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
}: DelayEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Time alignment delay"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => delayHandler.validate(config)}
    >
      <DelayEditorContent sampleRate={sampleRate} />
    </FilterEditorPanel>
  );
}
