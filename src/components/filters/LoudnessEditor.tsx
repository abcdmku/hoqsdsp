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

  // Visualization of the loudness compensation curve with proper axes
  const renderLoudnessCurve = () => {
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

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

    // Map frequency (log scale) to X
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const freqToX = (freq: number) => {
      const logFreq = Math.log10(freq);
      return padding.left + ((logFreq - logMin) / (logMax - logMin)) * graphWidth;
    };

    // Map dB boost to Y (range: -5 to +20 dB to show full range)
    const dbMin = -5;
    const dbMax = 20;
    const dbRange = dbMax - dbMin;
    const dbToY = (db: number) => padding.top + ((dbMax - db) / dbRange) * graphHeight;

    // Frequency grid lines (logarithmic)
    const freqGridLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const freqLabels = [20, 100, 1000, 10000, 20000];

    // dB grid lines
    const dbGridLines = [-5, 0, 5, 10, 15, 20];

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${freqToX(p.freq).toFixed(1)} ${dbToY(p.boost).toFixed(1)}`)
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full rounded bg-dsp-bg"
        role="img"
        aria-label={`Loudness compensation: +${params.low_boost}dB bass, +${params.high_boost}dB treble`}
      >
        {/* Horizontal grid lines (dB levels) */}
        {dbGridLines.map((db) => (
          <g key={`h-${db}`}>
            <line
              x1={padding.left}
              y1={dbToY(db)}
              x2={width - padding.right}
              y2={dbToY(db)}
              stroke="currentColor"
              className="text-dsp-primary/30"
              strokeWidth={db === 0 ? 1 : 0.5}
            />
            {/* dB label */}
            <text
              x={padding.left - 6}
              y={dbToY(db) + 3}
              textAnchor="end"
              className="fill-dsp-text-muted text-[9px]"
            >
              {db > 0 ? `+${db}` : db}
            </text>
          </g>
        ))}

        {/* Vertical grid lines (frequency) */}
        {freqGridLines.map((freq) => (
          <line
            key={`v-${freq}`}
            x1={freqToX(freq)}
            y1={padding.top}
            x2={freqToX(freq)}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/30"
            strokeWidth={freq === 1000 ? 1 : 0.5}
          />
        ))}

        {/* Frequency labels */}
        {freqLabels.map((freq) => (
          <text
            key={`fl-${freq}`}
            x={freqToX(freq)}
            y={height - padding.bottom + 14}
            textAnchor="middle"
            className="fill-dsp-text-muted text-[9px]"
          >
            {freq >= 1000 ? `${freq / 1000}k` : freq}
          </text>
        ))}

        {/* Loudness compensation curve */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          className="text-filter-eq"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-dsp-text-muted text-[11px]"
        >
          Frequency (Hz)
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          className="fill-dsp-text-muted text-[11px]"
        >
          Boost (dB)
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
