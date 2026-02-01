import { X } from 'lucide-react';
import { Button, Slider } from '../ui';
import type { MixerSource } from '../../types';

export interface CrosspointEditorProps {
  source: MixerSource | undefined;
  inputChannel: number;
  inputLabel: string;
  outputLabel: string;
  onSourceChange: (source: Partial<MixerSource> | null, options?: { debounce?: boolean }) => void;
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
      <div className="mt-4 rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-dsp-text">
            {inputLabel} → {outputLabel}
          </h3>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mb-4 text-sm text-dsp-text-muted">
          No connection. Click to add routing from {inputLabel} to {outputLabel}.
        </p>
        <Button onClick={onAddConnection}>Add Connection</Button>
      </div>
    );
  }

  const formatGain = (gain: number): string => {
    if (gain === 0) return '0.0';
    return gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1);
  };

  return (
    <div className="mt-4 rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-dsp-text">
          {inputLabel} → {outputLabel}
        </h3>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm text-dsp-text-muted">Gain</label>
          <div className="flex items-center gap-2">
            <Slider
              value={[source.gain]}
              onValueChange={([gain]) => { onSourceChange({ ...source, gain }, { debounce: true }); }}
              min={-40}
              max={12}
              step={0.5}
              className="flex-1"
              aria-label="Gain"
            />
            <span className="w-16 text-right font-mono text-sm text-dsp-text">
              {formatGain(source.gain)} dB
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-dsp-text-muted">Phase</label>
          <Button
            variant={source.inverted ? 'destructive' : 'outline'}
            onClick={() => { onSourceChange({ ...source, inverted: !source.inverted }); }}
            className="w-full"
          >
            {source.inverted ? '180°' : '0°'}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-dsp-text-muted">Mute</label>
          <Button
            variant={source.mute ? 'destructive' : 'outline'}
            onClick={() => { onSourceChange({ ...source, mute: !source.mute }); }}
            className="w-full"
          >
            {source.mute ? 'Muted' : 'Active'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="destructive" onClick={() => { onSourceChange(null); }}>
          Remove Connection
        </Button>
      </div>
    </div>
  );
}
