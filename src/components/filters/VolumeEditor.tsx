import { useCallback } from 'react';
import type { VolumeFilter } from '../../types';
import { volumeHandler } from '../../lib/filters/volume';
import { FilterEditorModal, useFilterEditor } from './FilterEditorModal';
import { NumericInput } from '../ui';
import { Slider } from '../ui/Slider';

interface VolumeEditorProps {
  open: boolean;
  onClose: () => void;
  filter: VolumeFilter;
  onSave: (config: VolumeFilter) => void;
  onApply?: (config: VolumeFilter) => void;
}

function VolumeEditorContent() {
  const { filter, updateFilter } = useFilterEditor<VolumeFilter>();
  const params = filter.parameters;

  const updateRampTime = useCallback(
    (ramp_time: number | undefined) => {
      updateFilter({
        ...filter,
        parameters: { ...params, ramp_time },
      });
    },
    [filter, params, updateFilter],
  );

  const rampTime = params.ramp_time ?? 0;

  return (
    <div className="space-y-6">
      {/* Info about volume filter */}
      <div className="bg-dsp-accent/10 border border-dsp-accent/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-dsp-text mb-2">Volume Fader Control</h4>
        <p className="text-sm text-dsp-text-muted">
          This filter connects to CamillaDSP's volume fader system.
          The actual volume level is controlled via the WebSocket API using
          SetVolume/GetVolume commands or linked faders.
        </p>
      </div>

      {/* Ramp Time */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-dsp-text">Ramp Time</label>
          <span className="text-sm font-mono text-dsp-text">
            {rampTime > 0 ? `${rampTime} ms` : 'Instant'}
          </span>
        </div>
        <Slider
          value={[rampTime]}
          onValueChange={(v) => { updateRampTime(v[0] === 0 ? undefined : v[0]); }}
          min={0}
          max={1000}
          step={10}
        />
        <p className="text-xs text-dsp-text-muted">
          Smoothing time for volume changes (0 = instant)
        </p>
      </div>

      {/* Ramp time input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Custom Ramp Time</label>
        <NumericInput
          value={rampTime}
          onChange={(v) => { updateRampTime(v === 0 ? undefined : v); }}
          min={0}
          max={5000}
          step={10}
          precision={0}
          unit="ms"
        />
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <label className="text-xs text-dsp-text-muted uppercase tracking-wide">Presets</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 0, label: 'Instant' },
            { value: 50, label: '50ms' },
            { value: 200, label: '200ms' },
            { value: 500, label: '500ms' },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => { updateRampTime(preset.value === 0 ? undefined : preset.value); }}
              className={`
                px-3 py-2 text-sm rounded-md border transition-colors
                ${rampTime === preset.value
                  ? 'bg-dsp-accent text-white border-dsp-accent'
                  : 'bg-dsp-surface border-dsp-primary hover:bg-dsp-primary/50 text-dsp-text'}
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visualization of ramp */}
      <div className="bg-dsp-bg rounded-lg p-4">
        <p className="text-xs text-dsp-text-muted mb-2 uppercase tracking-wide">
          Volume Change Response
        </p>
        <svg
          width={200}
          height={60}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Volume ramp visualization"
        >
          {/* Background grid */}
          <line x1={20} y1={50} x2={180} y2={50} stroke="currentColor" className="text-dsp-primary/30" strokeWidth={1} />
          <line x1={20} y1={10} x2={180} y2={10} stroke="currentColor" className="text-dsp-primary/30" strokeWidth={1} />

          {/* Ramp curve */}
          {rampTime === 0 ? (
            // Instant change (step)
            <path
              d="M 20 50 L 100 50 L 100 10 L 180 10"
              fill="none"
              stroke="currentColor"
              className="text-dsp-accent"
              strokeWidth={2}
            />
          ) : (
            // Gradual ramp
            <path
              d={`M 20 50 L 80 50 Q ${80 + (rampTime / 1000) * 60} 50 ${80 + (rampTime / 1000) * 60} 10 L 180 10`}
              fill="none"
              stroke="currentColor"
              className="text-dsp-accent"
              strokeWidth={2}
            />
          )}

          {/* Labels */}
          <text x={20} y={58} className="fill-dsp-text-muted text-[8px]">Before</text>
          <text x={180} y={58} textAnchor="end" className="fill-dsp-text-muted text-[8px]">After</text>
        </svg>
      </div>

      {/* Info */}
      <div className="bg-dsp-bg rounded-md p-3 text-xs text-dsp-text-muted space-y-2">
        <p>
          <strong>Ramp time</strong> smooths volume changes to prevent audible clicks
          and sudden level jumps. Longer ramp times create smoother fades.
        </p>
        <p>
          A value of 0 (instant) changes the volume immediately, which may cause
          clicks on some audio material.
        </p>
      </div>
    </div>
  );
}

export function VolumeEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: VolumeEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Volume"
      description="Fader-linked volume control"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => volumeHandler.validate(config)}
    >
      <VolumeEditorContent />
    </FilterEditorModal>
  );
}
