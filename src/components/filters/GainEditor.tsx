import { useCallback } from 'react';
import type { GainFilter } from '../../types';
import { gainHandler } from '../../lib/filters/gain';
import { FilterEditorModal, useFilterEditor } from './FilterEditorModal';
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
    <div className="space-y-6">
      {/* Scale Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Scale</label>
        <Select value={scale} onValueChange={(v) => { updateScale(v as GainScale); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dB">Decibels (dB)</SelectItem>
            <SelectItem value="linear">Linear</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gain Value */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Gain</label>
        {scale === 'dB' ? (
          <GainInput
            value={params.gain}
            onChange={updateGain}
            min={-100}
            max={40}
          />
        ) : (
          <NumericInput
            value={params.gain}
            onChange={updateGain}
            min={0}
            max={100}
            step={0.01}
            precision={4}
            unit="x"
          />
        )}
      </div>

      {/* Equivalent Value Display */}
      <div className="bg-dsp-bg rounded-md p-3 space-y-2">
        <p className="text-xs text-dsp-text-muted uppercase tracking-wide">Equivalent</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {scale !== 'dB' && (
            <div>
              <span className="text-dsp-text-muted">dB: </span>
              <span className="text-dsp-text font-mono">
                {equivalentDb > 0 ? '+' : ''}{equivalentDb.toFixed(2)} dB
              </span>
            </div>
          )}
          {scale !== 'linear' && (
            <div>
              <span className="text-dsp-text-muted">Linear: </span>
              <span className="text-dsp-text font-mono">{equivalentLinear.toFixed(4)}x</span>
            </div>
          )}
        </div>

        {/* Additional info for common values */}
        <div className="text-xs text-dsp-text-muted pt-2 border-t border-dsp-primary/20 space-y-1">
          <p>+6 dB = 2x, +12 dB = 4x, +20 dB = 10x</p>
          <p>-6 dB = 0.5x, -12 dB = 0.25x, -20 dB = 0.1x</p>
        </div>
      </div>

      {/* Invert Phase Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-dsp-text">Invert Phase</label>
          <p className="text-xs text-dsp-text-muted">
            Multiply signal by -1 (180 phase flip)
          </p>
        </div>
        <Switch
          checked={params.inverted ?? false}
          onCheckedChange={toggleInverted}
          aria-label="Invert phase"
        />
      </div>

      {/* Visual indicator of current state */}
      <div className="bg-dsp-bg rounded-md p-4 flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-mono text-dsp-text">
            {scale === 'dB'
              ? `${params.gain > 0 ? '+' : ''}${params.gain.toFixed(1)} dB`
              : `${params.gain.toFixed(3)}x`}
          </div>
          {params.inverted && (
            <div className="text-sm text-filter-dynamics mt-1">
              (inverted)
            </div>
          )}
        </div>
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
