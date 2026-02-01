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

  // Visual gate state indicator
  const renderGateDiagram = () => {
    const width = 800;
    const height = 200;
    const padding = 40;
    const envelopeHeight = 100;
    const envelopeTop = height / 2 - envelopeHeight / 2;
    const envelopeBottom = height / 2 + envelopeHeight / 2;

    // Gate states visualization
    const totalTime = Math.max(params.attack + params.release, 1);
    const timeToX = (t: number) => padding + (t / totalTime) * (width - 2 * padding);

    const attackEnd = params.attack;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full rounded bg-dsp-bg"
        role="img"
        aria-label="Gate timing diagram"
      >
        {/* Gate envelope line */}
        <path
          d={`
            M ${padding} ${envelopeBottom}
            L ${timeToX(attackEnd)} ${envelopeBottom}
            L ${timeToX(attackEnd)} ${envelopeTop}
            L ${width - padding} ${envelopeBottom}
          `}
          fill="none"
          stroke="currentColor"
          className="text-meter-green"
          strokeWidth={5}
        />

        {/* Labels */}
        <text x={timeToX(attackEnd / 2)} y={height - 8} textAnchor="middle" className="fill-dsp-text-muted text-[12px]">
          Attack
        </text>
        <text x={timeToX(attackEnd + params.release / 2)} y={height - 8} textAnchor="middle" className="fill-dsp-text-muted text-[12px]">
          Release
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
