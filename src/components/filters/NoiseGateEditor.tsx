import { useCallback } from 'react';
import type { NoiseGateFilter } from '../../types';
import { noisegateHandler } from '../../lib/filters/noisegate';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { FilterGraphControlsLayout } from './FilterGraphControlsLayout';
import { NumericInput } from '../ui';
import { Slider } from '../ui/Slider';

interface NoiseGateEditorProps {
  open: boolean;
  onClose: () => void;
  filter: NoiseGateFilter;
  onSave: (config: NoiseGateFilter) => void;
  onApply?: (config: NoiseGateFilter) => void;
}

interface NoiseGateEditorPanelProps {
  onClose: () => void;
  filter: NoiseGateFilter;
  onSave: (config: NoiseGateFilter) => void;
  onApply?: (config: NoiseGateFilter) => void;
}

function NoiseGateEditorContent() {
  const { filter, updateFilter } = useFilterEditor<NoiseGateFilter>();
  const params = filter.parameters;

  const updateParam = useCallback(
    <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
      updateFilter({
        ...filter,
        parameters: { ...params, [key]: value },
      });
    },
    [filter, params, updateFilter],
  );

  // Visual gate state indicator with proper timing diagram
  const renderGateDiagram = () => {
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Total time with some buffer for closed state visualization
    const closedTime = 20; // Show 20ms of closed state before trigger
    const totalTime = closedTime + params.attack + params.release + 20; // +20ms after

    const timeToX = (t: number) => padding.left + (t / totalTime) * graphWidth;

    // Gain: 0 = full attenuation (closed), 1 = open (no attenuation)
    const gainToY = (gain: number) => padding.top + (1 - gain) * graphHeight;

    // Generate time grid lines
    const timeGridStep = totalTime < 200 ? 20 : totalTime < 500 ? 50 : totalTime < 1000 ? 100 : 200;
    const timeGridLines: number[] = [];
    for (let t = 0; t <= totalTime; t += timeGridStep) {
      timeGridLines.push(t);
    }

    // Key time points for the gate envelope
    const triggerTime = closedTime;
    const openTime = triggerTime + params.attack;
    const closeStartTime = openTime;
    const closeEndTime = closeStartTime + params.release;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full rounded bg-dsp-bg"
        role="img"
        aria-label={`Gate timing diagram: ${params.attack}ms attack, ${params.release}ms release`}
      >
        {/* Background grid - horizontal lines (gain levels) */}
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <line
            key={`h-${level}`}
            x1={padding.left}
            y1={gainToY(level)}
            x2={width - padding.right}
            y2={gainToY(level)}
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

        {/* Trigger point marker */}
        <line
          x1={timeToX(triggerTime)}
          y1={padding.top}
          x2={timeToX(triggerTime)}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-dsp-accent"
          strokeWidth={1}
          strokeDasharray="4 2"
        />

        {/* Gate envelope line */}
        <path
          d={`
            M ${timeToX(0)} ${gainToY(0)}
            L ${timeToX(triggerTime)} ${gainToY(0)}
            L ${timeToX(openTime)} ${gainToY(1)}
            L ${timeToX(closeStartTime)} ${gainToY(1)}
            L ${timeToX(closeEndTime)} ${gainToY(0)}
            L ${timeToX(totalTime)} ${gainToY(0)}
          `}
          fill="none"
          stroke="currentColor"
          className="text-meter-green"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y-axis labels (Gain state) */}
        <text x={padding.left - 8} y={gainToY(1) + 4} textAnchor="end" className="fill-dsp-text-muted text-[10px]">
          Open
        </text>
        <text x={padding.left - 8} y={gainToY(0) + 4} textAnchor="end" className="fill-dsp-text-muted text-[10px]">
          Closed
        </text>
        <text x={padding.left - 8} y={gainToY(0.5) + 4} textAnchor="end" className="fill-dsp-text-muted text-[9px]">
          -{Math.round(params.attenuation / 2)}dB
        </text>

        {/* X-axis labels (Time ms) */}
        {timeGridLines.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % 2 === 0).map((t) => (
          <text
            key={`x-${t}`}
            x={timeToX(t)}
            y={height - padding.bottom + 14}
            textAnchor="middle"
            className="fill-dsp-text-muted text-[9px]"
          >
            {t}ms
          </text>
        ))}

        {/* Phase labels */}
        <text
          x={timeToX(triggerTime + params.attack / 2)}
          y={padding.top - 6}
          textAnchor="middle"
          className="fill-meter-green text-[10px] font-medium"
        >
          Attack {params.attack}ms
        </text>
        <text
          x={timeToX(closeStartTime + params.release / 2)}
          y={padding.top - 6}
          textAnchor="middle"
          className="fill-meter-green text-[10px] font-medium"
        >
          Release {params.release}ms
        </text>

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-dsp-text-muted text-[11px]"
        >
          Time
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          className="fill-dsp-text-muted text-[11px]"
        >
          Gate State
        </text>
      </svg>
    );
  };

  return (
    <FilterGraphControlsLayout
      graph={
        <div className="relative h-full w-full">
          {renderGateDiagram()}
          <div className="absolute right-3 top-3 rounded-md bg-dsp-surface/80 px-3 py-2 text-right shadow-sm backdrop-blur">
            <div className="text-sm font-mono text-dsp-text">Threshold: {params.threshold} dB</div>
          </div>
        </div>
      }
      controls={
        <div className="space-y-6">
          {/* Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-dsp-text">Threshold</label>
              <span className="text-sm font-mono text-dsp-text">{params.threshold} dB</span>
            </div>
            <Slider
              value={[params.threshold]}
              onValueChange={(v) => { updateParam('threshold', v[0] ?? -60); }}
              min={-80}
              max={0}
              step={0.5}
            />
            <p className="text-xs text-dsp-text-muted">
              Gate opens when signal exceeds this level
            </p>
          </div>

          {/* Attenuation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Attenuation</label>
            <NumericInput
              value={params.attenuation}
              onChange={(v) => { updateParam('attenuation', v); }}
              min={0}
              max={120}
              step={1}
              precision={0}
              unit="dB"
            />
            <p className="text-xs text-dsp-text-muted">
              Amount of attenuation applied when gate is closed
            </p>
          </div>

          {/* Timing Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dsp-text">Attack</label>
              <NumericInput
                value={params.attack}
                onChange={(v) => { updateParam('attack', v); }}
                min={0.1}
                max={100}
                step={0.1}
                precision={1}
                unit="ms"
              />
              <p className="text-xs text-dsp-text-muted">
                Opening time
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-dsp-text">Release</label>
              <NumericInput
                value={params.release}
                onChange={(v) => { updateParam('release', v); }}
                min={10}
                max={5000}
                step={1}
                precision={0}
                unit="ms"
              />
              <p className="text-xs text-dsp-text-muted">
                Closing time
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="rounded-lg bg-dsp-bg p-3 text-sm text-dsp-text-muted">
          <p>
            Gate opens when signal rises above {params.threshold} dB. Takes {params.attack} ms to fully open, then
            closes over {params.release} ms when the signal drops. Closed gain is reduced by {params.attenuation} dB.
          </p>
        </div>
      }
    />
  );
}

export function NoiseGateEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: NoiseGateEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Noise Gate"
      description="Silence signals below threshold"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => noisegateHandler.validate(config)}
      contentClassName="w-[95vw] max-w-[960px]"
    >
      <NoiseGateEditorContent />
    </FilterEditorModal>
  );
}

export function NoiseGateEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: NoiseGateEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Silence signals below threshold"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => noisegateHandler.validate(config)}
      autoApply={true}
      autoApplyDebounceMs={150}
    >
      <NoiseGateEditorContent />
    </FilterEditorPanel>
  );
}
