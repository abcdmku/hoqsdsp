import { NumericInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui';
import type { FirDesignSettings } from './useFirSettings';

interface FirWindowSectionProps {
  settings: FirDesignSettings;
  onSettingsChange: (updater: (prev: FirDesignSettings) => FirDesignSettings) => void;
}

export function FirWindowSection({ settings, onSettingsChange }: FirWindowSectionProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Window</label>
          <Select value={settings.window} onValueChange={(v) => onSettingsChange((s) => ({ ...s, window: v as FirDesignSettings['window'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rectangular">Rectangular</SelectItem>
              <SelectItem value="Hann">Hann</SelectItem>
              <SelectItem value="Hamming">Hamming</SelectItem>
              <SelectItem value="Blackman">Blackman</SelectItem>
              <SelectItem value="Kaiser">Kaiser</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {settings.window === 'Kaiser' ? (
          <div className="space-y-1.5">
            <label className="text-xs text-dsp-text-muted">Kaiser beta</label>
            <NumericInput
              value={settings.kaiserBeta}
              onChange={(v) => onSettingsChange((s) => ({ ...s, kaiserBeta: v }))}
              min={0}
              max={20}
              step={0.1}
              precision={1}
            />
          </div>
        ) : (
          <div />
        )}
        <div />
      </div>
    </>
  );
}
