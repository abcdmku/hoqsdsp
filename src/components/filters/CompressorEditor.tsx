import { useCallback } from 'react';
import type { CompressorFilter } from '../../types';
import { compressorHandler } from '../../lib/filters/compressor';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { NumericInput, GainInput } from '../ui';
import { Switch } from '../ui/Switch';
import { Slider } from '../ui/Slider';

interface CompressorEditorProps {
  open: boolean;
  onClose: () => void;
  filter: CompressorFilter;
  onSave: (config: CompressorFilter) => void;
  onApply?: (config: CompressorFilter) => void;
}

interface CompressorEditorPanelProps {
  onClose: () => void;
  filter: CompressorFilter;
  onSave: (config: CompressorFilter) => void;
  onApply?: (config: CompressorFilter) => void;
}

function CompressorEditorContent() {
  const { filter, updateFilter } = useFilterEditor<CompressorFilter>();
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

  // Visual transfer function curve
  const renderTransferCurve = () => {
    const width = 120;
    const height = 120;
    const padding = 15;

    // Calculate knee point and compression line
    const threshold = params.threshold;
    const ratio = params.factor;

    // Map dB to pixel coordinates (-60 to 0 dB range)
    const dbToX = (db: number) => padding + ((db + 60) / 60) * (width - 2 * padding);
    const dbToY = (db: number) => height - padding - ((db + 60) / 60) * (height - 2 * padding);

    // Generate path: 1:1 line until threshold, then compression
    const pathPoints: string[] = [];

    // Below threshold: 1:1
    pathPoints.push(`M ${dbToX(-60)} ${dbToY(-60)}`);
    pathPoints.push(`L ${dbToX(threshold)} ${dbToY(threshold)}`);

    // Above threshold: compressed
    for (let input = threshold; input <= 0; input += 2) {
      const output = threshold + (input - threshold) / ratio;
      pathPoints.push(`L ${dbToX(input)} ${dbToY(Math.max(-60, output))}`);
    }

    return (
      <svg
        width={width}
        height={height}
        className="bg-dsp-bg rounded"
        role="img"
        aria-label="Compression transfer curve"
      >
        {/* Grid lines */}
        {[-48, -36, -24, -12, 0].map((db) => (
          <g key={db}>
            <line
              x1={dbToX(db)}
              y1={padding}
              x2={dbToX(db)}
              y2={height - padding}
              stroke="currentColor"
              className="text-dsp-primary/30"
              strokeWidth={0.5}
            />
            <line
              x1={padding}
              y1={dbToY(db)}
              x2={width - padding}
              y2={dbToY(db)}
              stroke="currentColor"
              className="text-dsp-primary/30"
              strokeWidth={0.5}
            />
          </g>
        ))}

        {/* 1:1 reference line */}
        <line
          x1={dbToX(-60)}
          y1={dbToY(-60)}
          x2={dbToX(0)}
          y2={dbToY(0)}
          stroke="currentColor"
          className="text-dsp-text/20"
          strokeWidth={1}
          strokeDasharray="4 2"
        />

        {/* Threshold line */}
        <line
          x1={dbToX(threshold)}
          y1={padding}
          x2={dbToX(threshold)}
          y2={height - padding}
          stroke="currentColor"
          className="text-filter-dynamics"
          strokeWidth={1}
          strokeDasharray="2 2"
        />

        {/* Transfer curve */}
        <path
          d={pathPoints.join(' ')}
          fill="none"
          stroke="currentColor"
          className="text-filter-dynamics"
          strokeWidth={2}
        />

        {/* Axis labels */}
        <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-dsp-text-muted text-[8px]">
          Input
        </text>
        <text x={3} y={height / 2} textAnchor="middle" transform={`rotate(-90 3 ${height / 2})`} className="fill-dsp-text-muted text-[8px]">
          Output
        </text>
      </svg>
    );
  };

  const ratioDisplay = params.factor >= 100 ? '' : `${params.factor}:1`;

  return (
    <div className="space-y-6">
      {/* Visual section */}
      <div className="flex justify-center items-center gap-4 p-4 bg-dsp-bg/50 rounded-lg">
        {renderTransferCurve()}
        <div className="text-center">
          <div className="text-3xl font-mono text-filter-dynamics">
            {ratioDisplay}
          </div>
          <div className="text-xs text-dsp-text-muted">
            @ {params.threshold} dB
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Channels</label>
        <NumericInput
          value={params.channels}
          onChange={(v) => { updateParam('channels', v); }}
          min={1}
          max={32}
          step={1}
          precision={0}
        />
        <p className="text-xs text-dsp-text-muted">
          Number of channels to process together (linked detection)
        </p>
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-dsp-text">Threshold</label>
          <span className="text-sm font-mono text-dsp-text">{params.threshold} dB</span>
        </div>
        <Slider
          value={[params.threshold]}
          onValueChange={(v) => { updateParam('threshold', v[0] ?? -20); }}
          min={-60}
          max={0}
          step={0.5}
        />
      </div>

      {/* Ratio */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-dsp-text">Ratio</label>
          <span className="text-sm font-mono text-dsp-text">{ratioDisplay}</span>
        </div>
        <Slider
          value={[params.factor]}
          onValueChange={(v) => { updateParam('factor', v[0] ?? 4); }}
          min={1}
          max={20}
          step={0.1}
        />
        <div className="flex justify-between text-xs text-dsp-text-muted">
          <span>1:1 (no compression)</span>
          <span>20:1 (limiting)</span>
        </div>
      </div>

      {/* Attack & Release */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">Attack</label>
          <NumericInput
            value={params.attack}
            onChange={(v) => { updateParam('attack', v); }}
            min={0.1}
            max={500}
            step={0.1}
            precision={1}
            unit="ms"
          />
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
        </div>
      </div>

      {/* Makeup Gain */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Makeup Gain</label>
        <GainInput
          value={params.makeup_gain ?? 0}
          onChange={(v) => { updateParam('makeup_gain', v); }}
          min={0}
          max={40}
        />
      </div>

      {/* Soft Clip Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-dsp-text">Soft Clip</label>
          <p className="text-xs text-dsp-text-muted">
            Apply soft clipping to output
          </p>
        </div>
        <Switch
          checked={params.soft_clip ?? false}
          onCheckedChange={(v) => { updateParam('soft_clip', v); }}
          aria-label="Enable soft clipping"
        />
      </div>
    </div>
  );
}

export function CompressorEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: CompressorEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Compressor"
      description="Dynamic range compression"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => compressorHandler.validate(config)}
    >
      <CompressorEditorContent />
    </FilterEditorModal>
  );
}

export function CompressorEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: CompressorEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Dynamic range compression"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => compressorHandler.validate(config)}
    >
      <CompressorEditorContent />
    </FilterEditorPanel>
  );
}
