import { useCallback } from 'react';
import type { DitherFilter, DitherParameters } from '../../types';
import { ditherHandler } from '../../lib/filters/dither';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { NumericInput } from '../ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

interface DitherEditorProps {
  open: boolean;
  onClose: () => void;
  filter: DitherFilter;
  onSave: (config: DitherFilter) => void;
  onApply?: (config: DitherFilter) => void;
}

interface DitherEditorPanelProps {
  onClose: () => void;
  filter: DitherFilter;
  onSave: (config: DitherFilter) => void;
  onApply?: (config: DitherFilter) => void;
}

const DITHER_TYPES: {
  value: DitherParameters['type'];
  label: string;
  description: string;
}[] = [
  { value: 'Simple', label: 'Simple', description: 'Basic triangular dither' },
  { value: 'Uniform', label: 'Uniform', description: 'Uniform distribution (rectangular)' },
  { value: 'Lipshitz441', label: 'Lipshitz 44.1kHz', description: 'Noise-shaped for 44.1kHz' },
  { value: 'Fweighted441', label: 'F-weighted 44.1kHz', description: 'F-weighted for 44.1kHz' },
  { value: 'Shibata441', label: 'Shibata 44.1kHz', description: 'Shibata curve for 44.1kHz' },
  { value: 'Shibata48', label: 'Shibata 48kHz', description: 'Shibata curve for 48kHz' },
  { value: 'ShibataLow441', label: 'Shibata Low 44.1kHz', description: 'Low-intensity Shibata for 44.1kHz' },
  { value: 'ShibataLow48', label: 'Shibata Low 48kHz', description: 'Low-intensity Shibata for 48kHz' },
  { value: 'None', label: 'None', description: 'No dithering (truncation only)' },
];

const COMMON_BIT_DEPTHS = [
  { value: 8, label: '8-bit', description: 'Low quality' },
  { value: 16, label: '16-bit', description: 'CD quality' },
  { value: 24, label: '24-bit', description: 'High resolution' },
  { value: 32, label: '32-bit', description: 'Maximum precision' },
];

function DitherEditorContent() {
  const { filter, updateFilter } = useFilterEditor<DitherFilter>();
  const params = filter.parameters;

  const updateType = useCallback(
    (type: DitherParameters['type']) => {
      updateFilter({
        ...filter,
        parameters: { ...params, type },
      });
    },
    [filter, params, updateFilter],
  );

  const updateBits = useCallback(
    (bits: number) => {
      updateFilter({
        ...filter,
        parameters: { ...params, bits },
      });
    },
    [filter, params, updateFilter],
  );

  const selectedType = DITHER_TYPES.find((t) => t.value === params.type);

  // Calculate dynamic range
  const dynamicRange = params.bits * 6.02; // ~6 dB per bit

  return (
    <div className="space-y-6">
      {/* Visual info */}
      <div className="bg-dsp-bg/50 rounded-lg p-4 text-center">
        <div className="text-2xl font-mono text-dsp-text">
          {params.bits}-bit
        </div>
        <div className="text-sm text-dsp-text-muted">
          ~{dynamicRange.toFixed(0)} dB dynamic range
        </div>
      </div>

      {/* Dither Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Dither Type</label>
        <Select value={params.type} onValueChange={(v) => { updateType(v as DitherParameters['type']); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DITHER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedType && (
          <p className="text-xs text-dsp-text-muted">{selectedType.description}</p>
        )}
      </div>

      {/* Bit Depth */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Target Bit Depth</label>
        <NumericInput
          value={params.bits}
          onChange={updateBits}
          min={1}
          max={32}
          step={1}
          precision={0}
          unit="bits"
        />
      </div>

      {/* Quick presets */}
      <div className="space-y-2">
        <label className="text-xs text-dsp-text-muted uppercase tracking-wide">Quick Presets</label>
        <div className="grid grid-cols-4 gap-2">
          {COMMON_BIT_DEPTHS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => { updateBits(preset.value); }}
              className={`
                px-3 py-2 text-sm rounded-md border transition-colors
                ${params.bits === preset.value
                  ? 'bg-dsp-accent text-white border-dsp-accent'
                  : 'bg-dsp-surface border-dsp-primary hover:bg-dsp-primary/50 text-dsp-text'}
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sample rate recommendation */}
      {(params.type.includes('441') || params.type.includes('48')) && (
        <div className="bg-dsp-bg rounded-md p-3 space-y-1">
          <p className="text-xs text-dsp-text-muted">
            {params.type.includes('441')
              ? 'This dither type is optimized for 44.1kHz sample rate.'
              : 'This dither type is optimized for 48kHz sample rate.'}
          </p>
          <p className="text-xs text-dsp-text-muted">
            Using it at a different sample rate may produce suboptimal noise shaping.
          </p>
        </div>
      )}

      {/* Info about dithering */}
      <div className="bg-dsp-bg rounded-md p-3 text-xs text-dsp-text-muted space-y-2">
        <p>
          <strong>Dithering</strong> adds low-level noise before quantization to
          reduce audible distortion artifacts when reducing bit depth.
        </p>
        <p>
          <strong>Noise shaping</strong> (Lipshitz, Shibata types) moves the
          dither noise to frequencies where human hearing is less sensitive.
        </p>
      </div>
    </div>
  );
}

export function DitherEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: DitherEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Dither"
      description="Bit depth reduction with noise shaping"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => ditherHandler.validate(config)}
    >
      <DitherEditorContent />
    </FilterEditorModal>
  );
}

export function DitherEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: DitherEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Bit depth reduction with noise shaping"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => ditherHandler.validate(config)}
    >
      <DitherEditorContent />
    </FilterEditorPanel>
  );
}
