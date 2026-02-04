import { useCallback } from 'react';
import type { VolumeFilter } from '../../types';
import { volumeHandler } from '../../lib/filters/volume';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { FilterGraphControlsLayout } from './FilterGraphControlsLayout';
import { NumericInput } from '../ui';
import { Slider } from '../ui/Slider';

interface VolumeEditorProps {
  open: boolean;
  onClose: () => void;
  filter: VolumeFilter;
  onSave: (config: VolumeFilter) => void;
  onApply?: (config: VolumeFilter) => void;
}

interface VolumeEditorPanelProps {
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

  // Render the time-based ramp curve visualization
  const renderRampCurve = () => {
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // X-axis: Time (0 to max display time)
    // For instant (0ms), show a 100ms window to demonstrate the step
    // For ramp times, show ramp time + 20% buffer
    const maxTime = rampTime === 0 ? 100 : Math.max(100, rampTime * 1.2);

    // Y-axis: Level (0% to 100%)
    const timeToX = (t: number) => padding.left + (t / maxTime) * graphWidth;
    const levelToY = (level: number) => padding.top + (1 - level) * graphHeight;

    // Generate grid lines for time axis
    const timeGridLines: number[] = [];
    if (rampTime === 0) {
      timeGridLines.push(0, 25, 50, 75, 100);
    } else {
      // Show grid lines at 0, 25%, 50%, 75%, 100% of ramp time, and end
      const step = rampTime / 4;
      for (let t = 0; t <= rampTime; t += step) {
        timeGridLines.push(Math.round(t));
      }
      if (timeGridLines[timeGridLines.length - 1] !== Math.round(maxTime)) {
        timeGridLines.push(Math.round(maxTime));
      }
    }

    // Generate the ramp curve path
    const generateRampPath = () => {
      const points: string[] = [];

      if (rampTime === 0) {
        // Instant change: step function
        // Hold at 0% until 20ms (to show the "before" state)
        points.push(`M ${timeToX(0)} ${levelToY(0)}`);
        points.push(`L ${timeToX(20)} ${levelToY(0)}`);
        // Step up instantly
        points.push(`L ${timeToX(20)} ${levelToY(1)}`);
        // Hold at 100%
        points.push(`L ${timeToX(maxTime)} ${levelToY(1)}`);
      } else {
        // Gradual ramp: exponential-like curve (typical volume fader behavior)
        // Start at 0%, ramp to 100% over rampTime ms
        const startTime = 10; // Small delay before ramp starts
        points.push(`M ${timeToX(0)} ${levelToY(0)}`);
        points.push(`L ${timeToX(startTime)} ${levelToY(0)}`);

        // Generate smooth exponential curve (1 - e^(-t/tau) shape)
        const numPoints = 50;
        for (let i = 0; i <= numPoints; i++) {
          const t = (i / numPoints) * rampTime;
          // Exponential rise: 1 - e^(-3*t/rampTime) reaches ~95% at t=rampTime
          const level = 1 - Math.exp(-3 * t / rampTime);
          points.push(`L ${timeToX(startTime + t)} ${levelToY(level)}`);
        }

        // Hold at final level
        points.push(`L ${timeToX(maxTime)} ${levelToY(1)}`);
      }

      return points.join(' ');
    };

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full rounded bg-dsp-bg"
        role="img"
        aria-label={`Volume ramp visualization: ${rampTime === 0 ? 'instant' : `${rampTime}ms ramp time`}`}
      >
        {/* Background grid - horizontal lines (level) */}
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <line
            key={`h-${level}`}
            x1={padding.left}
            y1={levelToY(level)}
            x2={width - padding.right}
            y2={levelToY(level)}
            stroke="currentColor"
            className="text-dsp-primary/30"
            strokeWidth={level === 0 || level === 1 ? 1 : 0.5}
          />
        ))}

        {/* Background grid - vertical lines (time) */}
        {timeGridLines.map((t) => (
          <line
            key={`v-${t}`}
            x1={timeToX(t)}
            y1={padding.top}
            x2={timeToX(t)}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/30"
            strokeWidth={t === 0 ? 1 : 0.5}
          />
        ))}

        {/* Ramp time marker (if not instant) */}
        {rampTime > 0 && (
          <line
            x1={timeToX(10 + rampTime)}
            y1={padding.top}
            x2={timeToX(10 + rampTime)}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-accent"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}

        {/* Ramp curve */}
        <path
          d={generateRampPath()}
          fill="none"
          stroke="currentColor"
          className="text-dsp-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y-axis labels (Level %) */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <text
            key={`y-${pct}`}
            x={padding.left - 8}
            y={levelToY(pct / 100) + 4}
            textAnchor="end"
            className="fill-dsp-text-muted text-[10px]"
          >
            {pct}%
          </text>
        ))}

        {/* X-axis labels (Time ms) */}
        {timeGridLines.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2)).map((t) => (
          <text
            key={`x-${t}`}
            x={timeToX(t)}
            y={height - padding.bottom + 16}
            textAnchor="middle"
            className="fill-dsp-text-muted text-[10px]"
          >
            {t}ms
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-dsp-text-muted text-[11px]"
        >
          Time (ms)
        </text>
        <text
          x={14}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${height / 2})`}
          className="fill-dsp-text-muted text-[11px]"
        >
          Level
        </text>

        {/* Ramp time annotation */}
        {rampTime > 0 && (
          <text
            x={timeToX(10 + rampTime)}
            y={padding.top - 6}
            textAnchor="middle"
            className="fill-dsp-accent text-[10px] font-medium"
          >
            {rampTime}ms
          </text>
        )}
      </svg>
    );
  };

  return (
    <FilterGraphControlsLayout
      graph={
        <div className="relative h-full w-full">
          {renderRampCurve()}
          <div className="absolute right-3 top-3 rounded-md bg-dsp-surface/80 px-3 py-2 text-right shadow-sm backdrop-blur">
            <div className="text-2xl font-mono text-dsp-accent">
              {rampTime === 0 ? 'Instant' : `${rampTime}ms`}
            </div>
            <div className="text-xs text-dsp-text-muted">ramp time</div>
          </div>
        </div>
      }
      controls={
        <div className="space-y-6">
          {/* Ramp Time Slider */}
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
              Smoothing time for volume changes
            </p>
          </div>

          {/* Custom Ramp Time Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Custom Value</label>
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
            <div className="grid grid-cols-2 gap-2">
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

          {/* Info */}
          <div className="rounded-md bg-dsp-bg p-3 text-xs text-dsp-text-muted space-y-2">
            <p>
              <strong className="text-dsp-text">Ramp time</strong> smooths volume changes to prevent
              audible clicks and sudden level jumps.
            </p>
            <p>
              A value of 0 (instant) changes volume immediately, which may cause
              clicks on some audio material.
            </p>
          </div>
        </div>
      }
    />
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
      contentClassName="w-[95vw] max-w-[960px]"
    >
      <VolumeEditorContent />
    </FilterEditorModal>
  );
}

export function VolumeEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: VolumeEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Fader-linked volume control"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => volumeHandler.validate(config)}
    >
      <VolumeEditorContent />
    </FilterEditorPanel>
  );
}
