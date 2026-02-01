import { useCallback } from 'react';
import type { LoudnessFilter } from '../../types';
import { loudnessHandler } from '../../lib/filters/loudness';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { FilterGraphControlsLayout } from './FilterGraphControlsLayout';
import { Slider } from '../ui/Slider';

interface LoudnessEditorProps {
  open: boolean;
  onClose: () => void;
  filter: LoudnessFilter;
  onSave: (config: LoudnessFilter) => void;
  onApply?: (config: LoudnessFilter) => void;
}

interface LoudnessEditorPanelProps {
  onClose: () => void;
  filter: LoudnessFilter;
  onSave: (config: LoudnessFilter) => void;
  onApply?: (config: LoudnessFilter) => void;
}

function LoudnessEditorContent() {
  const { filter, updateFilter } = useFilterEditor<LoudnessFilter>();
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

  // Simple visualization of the loudness compensation curve
  const renderLoudnessCurve = () => {
    const width = 800;
    const height = 200;
    const padding = 40;

    // Simplified equal loudness contour visualization
    const points = [
      { freq: 20, boost: params.low_boost },
      { freq: 50, boost: params.low_boost * 0.8 },
      { freq: 100, boost: params.low_boost * 0.5 },
      { freq: 300, boost: 0 },
      { freq: 1000, boost: 0 },
      { freq: 3000, boost: 0 },
      { freq: 6000, boost: params.high_boost * 0.3 },
      { freq: 10000, boost: params.high_boost * 0.6 },
      { freq: 20000, boost: params.high_boost },
    ];

    // Map frequency (log scale) and gain to pixels
    const freqToX = (freq: number) => {
      const logMin = Math.log10(20);
      const logMax = Math.log10(20000);
      const logFreq = Math.log10(freq);
      return padding + ((logFreq - logMin) / (logMax - logMin)) * (width - 2 * padding);
    };

    const boostToY = (boost: number) => {
      const maxBoost = 20;
      return height / 2 - (boost / maxBoost) * ((height - 2 * padding) / 2);
    };

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${freqToX(p.freq).toFixed(1)} ${boostToY(p.boost).toFixed(1)}`)
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full rounded bg-dsp-bg"
        role="img"
        aria-label="Loudness compensation curve"
      >
        {/* Zero line */}
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="currentColor"
          className="text-dsp-primary/50"
          strokeWidth={1}
        />

        {/* Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          className="text-filter-eq"
          strokeWidth={2}
        />

        {/* Labels */}
        <text x={freqToX(50)} y={height - 8} textAnchor="middle" className="fill-dsp-text-muted text-[12px]">
          Bass
        </text>
        <text x={freqToX(1000)} y={height - 8} textAnchor="middle" className="fill-dsp-text-muted text-[12px]">
          Mid
        </text>
        <text x={freqToX(10000)} y={height - 8} textAnchor="middle" className="fill-dsp-text-muted text-[12px]">
          Treble
        </text>
      </svg>
    );
  };

  return (
    <FilterGraphControlsLayout
      graph={
        <div className="relative h-full w-full">
          {renderLoudnessCurve()}
          <div className="absolute right-3 top-3 rounded-md bg-dsp-surface/80 px-3 py-2 text-right shadow-sm backdrop-blur">
            <div className="text-sm font-mono text-dsp-text">Ref: {params.reference_level} dB</div>
            <div className="text-xs text-dsp-text-muted">Reference level</div>
          </div>
        </div>
      }
      controls={
        <div className="space-y-6">
          {/* Reference Level */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-dsp-text">Reference Level</label>
              <span className="text-sm font-mono text-dsp-text">{params.reference_level} dB</span>
            </div>
            <Slider
              value={[params.reference_level]}
              onValueChange={(v) => { updateParam('reference_level', v[0] ?? -25); }}
              min={-60}
              max={0}
              step={0.5}
            />
            <p className="text-xs text-dsp-text-muted">
              The listening level at which no compensation is applied
            </p>
          </div>

          {/* Low Boost */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-dsp-text">Low Frequency Boost</label>
              <span className="text-sm font-mono text-dsp-text">+{params.low_boost} dB</span>
            </div>
            <Slider
              value={[params.low_boost]}
              onValueChange={(v) => { updateParam('low_boost', v[0] ?? 10); }}
              min={0}
              max={20}
              step={0.5}
            />
            <p className="text-xs text-dsp-text-muted">
              Maximum bass boost at low listening levels
            </p>
          </div>

          {/* High Boost */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-dsp-text">High Frequency Boost</label>
              <span className="text-sm font-mono text-dsp-text">+{params.high_boost} dB</span>
            </div>
            <Slider
              value={[params.high_boost]}
              onValueChange={(v) => { updateParam('high_boost', v[0] ?? 5); }}
              min={0}
              max={20}
              step={0.5}
            />
            <p className="text-xs text-dsp-text-muted">
              Maximum treble boost at low listening levels
            </p>
          </div>
        </div>
      }
      footer={
        <div className="rounded-lg bg-dsp-bg p-3 text-xs text-dsp-text-muted space-y-2">
          <p>
            <strong>Loudness compensation</strong> adjusts frequency response based on the Fletcher-Munson equal-loudness
            contours.
          </p>
          <p>
            At lower listening levels, human hearing is less sensitive to low and high frequencies. This filter boosts
            bass and treble to compensate.
          </p>
          <p>
            The amount of boost depends on how far below the reference level you&apos;re listening. At the reference level,
            no compensation is applied.
          </p>
        </div>
      }
    />
  );
}

export function LoudnessEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: LoudnessEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Loudness"
      description="Fletcher-Munson loudness compensation"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => loudnessHandler.validate(config)}
      contentClassName="w-[95vw] max-w-[960px]"
    >
      <LoudnessEditorContent />
    </FilterEditorModal>
  );
}

export function LoudnessEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: LoudnessEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Fletcher-Munson loudness compensation"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => loudnessHandler.validate(config)}
      autoApply={true}
      autoApplyDebounceMs={150}
    >
      <LoudnessEditorContent />
    </FilterEditorPanel>
  );
}
