import { useCallback } from 'react';
import type { GainFilter } from '../../types';
import { gainHandler } from '../../lib/filters/gain';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { GainInput, NumericInput } from '../ui';
import { Switch } from '../ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

interface GainEditorProps {
  open: boolean;
  onClose: () => void;
  filter: GainFilter;
  onSave: (config: GainFilter) => void;
  onApply?: (config: GainFilter) => void;
}

interface GainEditorPanelProps {
  onClose: () => void;
  filter: GainFilter;
  onSave: (config: GainFilter) => void;
  onApply?: (config: GainFilter) => void;
}

type GainScale = 'dB' | 'linear';

function GainEditorContent() {
  const { filter, updateFilter } = useFilterEditor<GainFilter>();
  const params = filter.parameters;
  const scale = params.scale ?? 'dB';

  const updateGain = useCallback(
    (gain: number) => {
      updateFilter({
        ...filter,
        parameters: { ...params, gain },
      });
    },
    [filter, params, updateFilter],
  );

  const updateScale = useCallback(
    (newScale: GainScale) => {
      // Convert gain value when switching scales
      let newGain = params.gain;
      const currentScale = params.scale ?? 'dB';

      if (currentScale === 'dB' && newScale === 'linear') {
        // dB to linear: 10^(dB/20)
        newGain = Math.pow(10, params.gain / 20);
      } else if (currentScale === 'linear' && newScale === 'dB') {
        // linear to dB: 20 * log10(linear)
        newGain = params.gain > 0 ? 20 * Math.log10(params.gain) : -100;
      }

      updateFilter({
        ...filter,
        parameters: { ...params, scale: newScale, gain: newGain },
      });
    },
    [filter, params, updateFilter],
  );

  const toggleInverted = useCallback(
    (inverted: boolean) => {
      updateFilter({
        ...filter,
        parameters: { ...params, inverted },
      });
    },
    [filter, params, updateFilter],
  );

  // Calculate equivalent value for display
  const equivalentDb = scale === 'dB' ? params.gain : 20 * Math.log10(Math.abs(params.gain) || 0.0001);
  const equivalentLinear = scale === 'linear' ? params.gain : Math.pow(10, params.gain / 20);

  return (
    <div className="space-y-3">
      {/* Compact row: Gain value + Scale + Invert toggle */}
      <div className="flex items-center gap-3">
        {scale === 'dB' ? (
          <GainInput
            value={params.gain}
            onChange={updateGain}
            min={-100}
            max={40}
            className="flex-1"
          />
        ) : (
          <NumericInput
            value={params.gain}
            onChange={updateGain}
            min={0}
            max={100}
            step={0.01}
            precision={4}
            className="flex-1"
          />
        )}

        <Select value={scale} onValueChange={(v) => { updateScale(v as GainScale); }}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dB">dB</SelectItem>
            <SelectItem value="linear">linear</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-dsp-text-muted whitespace-nowrap">
          <Switch
            checked={params.inverted ?? false}
            onCheckedChange={toggleInverted}
            aria-label="Invert phase"
          />
          <span>Invert</span>
        </label>
      </div>

      {/* Compact equivalent value display */}
      <div className="flex gap-4 text-xs text-dsp-text-muted">
        <span>=</span>
        {scale === 'dB' ? (
          <span>
            <span className="text-dsp-text font-mono">{equivalentLinear.toFixed(4)}</span>x linear
          </span>
        ) : (
          <span>
            <span className="text-dsp-text font-mono">
              {equivalentDb > 0 ? '+' : ''}{equivalentDb.toFixed(2)}
            </span> dB
          </span>
        )}
        {params.inverted && (
          <span className="text-filter-dynamics">(phase inverted)</span>
        )}
      </div>
    </div>
  );
}

export function GainEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: GainEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Gain"
      description="Level adjustment"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => gainHandler.validate(config)}
    >
      <GainEditorContent />
    </FilterEditorModal>
  );
}

export function GainEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: GainEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Level adjustment"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => gainHandler.validate(config)}
    >
      <GainEditorContent />
    </FilterEditorPanel>
  );
}
