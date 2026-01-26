import { useCallback } from 'react';
import type { NoiseGateFilter } from '../../types';
import { noisegateHandler } from '../../lib/filters/noisegate';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
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

  // Visual gate state indicator
  const renderGateDiagram = () => {
    const width = 200;
    const height = 80;
    const padding = 10;

    // Gate states visualization
    const totalTime = params.attack + params.hold + params.release;
    const timeToX = (t: number) => padding + (t / totalTime) * (width - 2 * padding);

    const attackEnd = params.attack;
    const holdEnd = attackEnd + params.hold;

    return (
      <svg
        width={width}
        height={height}
        className="bg-dsp-bg rounded"
        role="img"
        aria-label="Gate timing diagram"
      >
        {/* Closed (muted) region */}
        <rect
          x={padding}
          y={height / 2 - 15}
          width={timeToX(attackEnd) - padding}
          height={30}
          fill="currentColor"
          className="text-dsp-primary/20"
        />

        {/* Open region */}
        <rect
          x={timeToX(attackEnd)}
          y={height / 2 - 15}
          width={timeToX(holdEnd) - timeToX(attackEnd)}
          height={30}
          fill="currentColor"
          className="text-meter-green/30"
        />

        {/* Closing region */}
        <rect
          x={timeToX(holdEnd)}
          y={height / 2 - 15}
          width={width - padding - timeToX(holdEnd)}
          height={30}
          fill="currentColor"
          className="text-dsp-primary/20"
        />

        {/* Gate envelope line */}
        <path
          d={`
            M ${padding} ${height / 2 + 15}
            L ${timeToX(attackEnd)} ${height / 2 + 15}
            L ${timeToX(attackEnd)} ${height / 2 - 15}
            L ${timeToX(holdEnd)} ${height / 2 - 15}
            L ${width - padding} ${height / 2 + 15}
          `}
          fill="none"
          stroke="currentColor"
          className="text-meter-green"
          strokeWidth={2}
        />

        {/* Labels */}
        <text x={timeToX(attackEnd / 2)} y={height - 5} textAnchor="middle" className="fill-dsp-text-muted text-[8px]">
          Attack
        </text>
        <text x={timeToX(attackEnd + params.hold / 2)} y={height - 5} textAnchor="middle" className="fill-dsp-text-muted text-[8px]">
          Hold
        </text>
        <text x={timeToX(holdEnd + params.release / 2)} y={height - 5} textAnchor="middle" className="fill-dsp-text-muted text-[8px]">
          Release
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Visual section */}
      <div className="flex flex-col items-center gap-2 p-4 bg-dsp-bg/50 rounded-lg">
        {renderGateDiagram()}
        <div className="text-center">
          <div className="text-lg font-mono text-dsp-text">
            Threshold: {params.threshold} dB
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
          onValueChange={(v) => { updateParam('threshold', v[0] ?? -60); }}
          min={-80}
          max={0}
          step={0.5}
        />
        <p className="text-xs text-dsp-text-muted">
          Gate opens when signal exceeds this level
        </p>
      </div>

      {/* Timing Controls */}
      <div className="grid grid-cols-3 gap-4">
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
          <label className="text-sm font-medium text-dsp-text">Hold</label>
          <NumericInput
            value={params.hold}
            onChange={(v) => { updateParam('hold', v); }}
            min={0}
            max={2000}
            step={1}
            precision={0}
            unit="ms"
          />
          <p className="text-xs text-dsp-text-muted">
            Stay open
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

      {/* Summary */}
      <div className="bg-dsp-bg rounded-md p-3 text-sm text-dsp-text-muted">
        <p>
          Gate opens when signal rises above {params.threshold} dB.
          Takes {params.attack} ms to fully open,
          stays open for at least {params.hold} ms after signal drops,
          then closes over {params.release} ms.
        </p>
      </div>
    </div>
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
    >
      <NoiseGateEditorContent />
    </FilterEditorPanel>
  );
}
