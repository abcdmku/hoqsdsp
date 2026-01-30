import { FrequencyInput, NumericInput } from '../../ui';
import type { FirDesignSettings } from './useFirSettings';

interface FirBandGateSectionProps {
  settings: FirDesignSettings;
  onSettingsChange: (updater: (prev: FirDesignSettings) => FirDesignSettings) => void;
  sampleRate: number;
}

export function FirBandGateSection({
  settings,
  onSettingsChange,
  sampleRate,
}: FirBandGateSectionProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Band Low (Hz)</label>
          <FrequencyInput value={settings.bandLowHz} onChange={(v) => onSettingsChange((s) => ({ ...s, bandLowHz: v }))} min={1} max={sampleRate / 2} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Band High (Hz)</label>
          <FrequencyInput value={settings.bandHighHz} onChange={(v) => onSettingsChange((s) => ({ ...s, bandHighHz: v }))} min={1} max={sampleRate / 2} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Band Transition (oct)</label>
          <NumericInput
            value={settings.transitionOctaves}
            onChange={(v) => onSettingsChange((s) => ({ ...s, transitionOctaves: v }))}
            min={0}
            max={4}
            step={0.05}
            precision={2}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Magnitude Gate (dB)</label>
          <NumericInput
            value={settings.magnitudeThresholdDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, magnitudeThresholdDb: v }))}
            min={-200}
            max={0}
            step={1}
            precision={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Gate Transition (dB)</label>
          <NumericInput
            value={settings.magnitudeTransitionDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, magnitudeTransitionDb: v }))}
            min={0}
            max={60}
            step={1}
            precision={0}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Hide Phase Below (dB)</label>
          <NumericInput
            value={settings.phaseHideBelowDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, phaseHideBelowDb: v }))}
            min={-300}
            max={0}
            step={1}
            precision={0}
          />
        </div>
      </div>
    </>
  );
}
