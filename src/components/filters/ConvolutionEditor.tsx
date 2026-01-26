import { useCallback, useState } from 'react';
import { FileAudio, Upload } from 'lucide-react';
import type { ConvolutionFilter, ConvolutionParameters } from '../../types';
import { convolutionHandler } from '../../lib/filters/convolution';
import { FilterEditorModal, FilterEditorPanel, useFilterEditor } from './FilterEditorModal';
import { NumericInput } from '../ui';
import { Button } from '../ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { cn } from '../../lib/utils';

interface ConvolutionEditorProps {
  open: boolean;
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
}

interface ConvolutionEditorPanelProps {
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
}

const RAW_FORMATS = [
  { value: 'TEXT', label: 'Text (ASCII)' },
  { value: 'FLOAT32LE', label: 'Float 32-bit LE' },
  { value: 'FLOAT64LE', label: 'Float 64-bit LE' },
  { value: 'S16LE', label: 'Signed 16-bit LE' },
  { value: 'S24LE', label: 'Signed 24-bit LE (padded)' },
  { value: 'S24LE3', label: 'Signed 24-bit LE (packed)' },
  { value: 'S32LE', label: 'Signed 32-bit LE' },
] as const;

type ConvType = ConvolutionParameters['type'];

function ConvolutionEditorContent() {
  const { filter, updateFilter } = useFilterEditor<ConvolutionFilter>();
  const params = filter.parameters;
  const [valuesText, setValuesText] = useState(
    params.type === 'Values' ? params.values.join(', ') : '',
  );

  const handleTypeChange = useCallback(
    (newType: ConvType) => {
      let newParams: ConvolutionParameters;

      if (newType === 'Wav') {
        newParams = {
          type: 'Wav',
          filename: params.type !== 'Values' ? params.filename : '',
          channel: 0,
        };
      } else if (newType === 'Raw') {
        newParams = {
          type: 'Raw',
          filename: params.type !== 'Values' ? params.filename : '',
          format: 'TEXT',
        };
      } else {
        newParams = {
          type: 'Values',
          values: [1.0],
        };
        setValuesText('1.0');
      }

      updateFilter({ ...filter, parameters: newParams });
    },
    [filter, params, updateFilter],
  );

  const updateFilename = useCallback(
    (filename: string) => {
      if (params.type === 'Values') return;
      updateFilter({
        ...filter,
        parameters: { ...params, filename },
      });
    },
    [filter, params, updateFilter],
  );

  const updateChannel = useCallback(
    (channel: number) => {
      if (params.type !== 'Wav') return;
      updateFilter({
        ...filter,
        parameters: { ...params, channel },
      });
    },
    [filter, params, updateFilter],
  );

  const updateFormat = useCallback(
    (format: string) => {
      if (params.type !== 'Raw') return;
      updateFilter({
        ...filter,
        parameters: { ...params, format },
      });
    },
    [filter, params, updateFilter],
  );

  const updateSkipBytes = useCallback(
    (skip_bytes_lines: number) => {
      if (params.type !== 'Raw') return;
      updateFilter({
        ...filter,
        parameters: { ...params, skip_bytes_lines },
      });
    },
    [filter, params, updateFilter],
  );

  const updateReadBytes = useCallback(
    (read_bytes_lines: number) => {
      if (params.type !== 'Raw') return;
      updateFilter({
        ...filter,
        parameters: { ...params, read_bytes_lines },
      });
    },
    [filter, params, updateFilter],
  );

  const updateValues = useCallback(
    (text: string) => {
      setValuesText(text);
      if (params.type !== 'Values') return;

      // Parse comma or whitespace separated values
      const values = text
        .split(/[,\s]+/)
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));

      if (values.length > 0) {
        updateFilter({
          ...filter,
          parameters: { ...params, values },
        });
      }
    },
    [filter, params, updateFilter],
  );

  return (
    <div className="space-y-6">
      {/* Convolution Type Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dsp-text">Source Type</label>
        <Select value={params.type} onValueChange={(v) => { handleTypeChange(v as ConvType); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Wav">WAV File</SelectItem>
            <SelectItem value="Raw">Raw File</SelectItem>
            <SelectItem value="Values">Direct Values</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* WAV File Options */}
      {params.type === 'Wav' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Filename</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={params.filename}
                  onChange={(e) => { updateFilename(e.target.value); }}
                  placeholder="/path/to/impulse.wav"
                  className={cn(
                    'w-full h-10 pl-10 pr-3 bg-dsp-surface border border-dsp-primary rounded-md',
                    'text-dsp-text text-sm placeholder:text-dsp-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                  )}
                />
                <FileAudio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dsp-text-muted" />
              </div>
              <Button variant="outline" size="icon" aria-label="Browse">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-dsp-text-muted">
              Path to WAV file containing impulse response
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Channel</label>
            <NumericInput
              value={params.channel ?? 0}
              onChange={updateChannel}
              min={0}
              max={31}
              step={1}
              precision={0}
            />
            <p className="text-xs text-dsp-text-muted">
              Channel to read from (0-based index)
            </p>
          </div>
        </>
      )}

      {/* Raw File Options */}
      {params.type === 'Raw' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Filename</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={params.filename}
                onChange={(e) => { updateFilename(e.target.value); }}
                placeholder="/path/to/impulse.raw"
                className={cn(
                  'flex-1 h-10 px-3 bg-dsp-surface border border-dsp-primary rounded-md',
                  'text-dsp-text text-sm placeholder:text-dsp-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                )}
              />
              <Button variant="outline" size="icon" aria-label="Browse">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-dsp-text">Format</label>
            <Select value={params.format ?? 'TEXT'} onValueChange={updateFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RAW_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dsp-text">Skip Lines/Bytes</label>
              <NumericInput
                value={params.skip_bytes_lines ?? 0}
                onChange={updateSkipBytes}
                min={0}
                step={1}
                precision={0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-dsp-text">Read Lines/Bytes</label>
              <NumericInput
                value={params.read_bytes_lines ?? 0}
                onChange={updateReadBytes}
                min={0}
                step={1}
                precision={0}
              />
              <p className="text-xs text-dsp-text-muted">0 = read all</p>
            </div>
          </div>
        </>
      )}

      {/* Values (direct coefficient entry) */}
      {params.type === 'Values' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dsp-text">
            Filter Coefficients
          </label>
          <textarea
            value={valuesText}
            onChange={(e) => { updateValues(e.target.value); }}
            placeholder="1.0, 0.5, 0.25, 0.125..."
            rows={5}
            className={cn(
              'w-full px-3 py-2 bg-dsp-surface border border-dsp-primary rounded-md',
              'text-dsp-text text-sm font-mono placeholder:text-dsp-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
              'resize-none',
            )}
          />
          <p className="text-xs text-dsp-text-muted">
            {params.values.length} coefficient{params.values.length !== 1 ? 's' : ''} entered.
            Comma or whitespace separated.
          </p>
        </div>
      )}
    </div>
  );
}

export function ConvolutionEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: ConvolutionEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Convolution Filter"
      description="FIR filter using impulse response"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
    >
      <ConvolutionEditorContent />
    </FilterEditorModal>
  );
}

export function ConvolutionEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
}: ConvolutionEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="FIR filter using impulse response"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
    >
      <ConvolutionEditorContent />
    </FilterEditorPanel>
  );
}
