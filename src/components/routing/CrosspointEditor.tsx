import { X } from 'lucide-react';
import { Button, Slider } from '../ui';
import type { MixerSource } from '../../types';

export interface CrosspointEditorProps {
  source: MixerSource | undefined;
  inputChannel: number;
  inputLabel: string;
  outputLabel: string;
  onSourceChange: (source: Partial<MixerSource> | null) => void;
  onAddConnection: () => void;
  onClose: () => void;
}

export function CrosspointEditor({
  source,
  inputChannel: _inputChannel,
  inputLabel,
  outputLabel,
  onSourceChange,
  onAddConnection,
  onClose,
}: CrosspointEditorProps) {
  if (!source) {
    return (
      <div className="mt-4 p-4 bg-dsp-surface rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-dsp-text">
            {inputLabel} → {outputLabel}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-gray-400 mb-4">
          No connection. Click to add routing from {inputLabel} to {outputLabel}.
        </p>
        <Button onClick={onAddConnection}>
          Add Connection
        </Button>
      </div>
    );
  }

  const formatGain = (gain: number): string => {
    if (gain === 0) return '0.0';
    return gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1);
  };

  return (
    <div className="mt-4 p-4 bg-dsp-surface rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-dsp-text">
          {inputLabel} → {outputLabel}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gain */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Gain</label>
          <div className="flex items-center gap-2">
            <Slider
              value={[source.gain]}
              onValueChange={([gain]) => { onSourceChange({ ...source, gain }); }}
              min={-40}
              max={12}
              step={0.5}
              className="flex-1"
              aria-label="Gain"
            />
            <span className="font-mono text-sm w-16 text-right text-dsp-text">
              {formatGain(source.gain)} dB
            </span>
          </div>
        </div>

        {/* Phase Invert */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Phase</label>
          <Button
            variant={source.inverted ? 'destructive' : 'outline'}
            onClick={() => { onSourceChange({ ...source, inverted: !source.inverted }); }}
            className="w-full"
          >
            {source.inverted ? 'Inverted (φ)' : 'Normal'}
          </Button>
        </div>

        {/* Mute */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Mute</label>
          <Button
            variant={source.mute ? 'destructive' : 'outline'}
            onClick={() => { onSourceChange({ ...source, mute: !source.mute }); }}
            className="w-full"
          >
            {source.mute ? 'MUTED' : 'Active'}
          </Button>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          variant="destructive"
          onClick={() => { onSourceChange(null); }}
        >
          Remove Connection
        </Button>
      </div>
    </div>
  );
}
