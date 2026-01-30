import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, NumericInput } from '../../ui';
import type { FirDesignSettings } from './useFirSettings';
import { clampOddInt } from '../../../lib/dsp/firOperations';

interface FirToggleSectionProps {
  previewEnabled: boolean;
  onPreviewEnabledChange: (value: boolean) => void;
  isIdentityFir: boolean;
  canEnableFromIdentity: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  tapMode: 'latency' | 'taps';
  onTapModeChange: (value: 'latency' | 'taps') => void;
  settings: FirDesignSettings;
  onSettingsChange: (updater: (prev: FirDesignSettings) => FirDesignSettings) => void;
  effectiveTaps: number;
  targetLatencyMs: number;
}

export function FirToggleSection({
  previewEnabled,
  onPreviewEnabledChange,
  isIdentityFir,
  canEnableFromIdentity,
  onToggleEnabled,
  tapMode,
  onTapModeChange,
  settings,
  onSettingsChange,
  effectiveTaps,
  targetLatencyMs,
}: FirToggleSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-dsp-text">Design Settings</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dsp-text-muted">Preview</span>
          <Switch checked={previewEnabled} onCheckedChange={(checked) => onPreviewEnabledChange(Boolean(checked))} aria-label="Show preview" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-dsp-text">FIR Enabled</p>
          <p className="text-[11px] text-dsp-text-muted">Toggle between applied taps and identity.</p>
        </div>
        <div
          title={
            !isIdentityFir || canEnableFromIdentity
              ? undefined
              : 'No FIR to enable (select filters to linearize and ensure Preview is producing a non-identity FIR).'
          }
        >
          <Switch
            checked={!isIdentityFir}
            onCheckedChange={(checked) => onToggleEnabled(Boolean(checked))}
            aria-label="Enable FIR"
            disabled={isIdentityFir && !canEnableFromIdentity}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Mode</label>
          <Select value={tapMode} onValueChange={(v) => onTapModeChange(v as 'latency' | 'taps')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latency">Max Latency</SelectItem>
              <SelectItem value="taps">Tap Count</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tapMode === 'latency' ? (
          <div className="space-y-1.5">
            <label className="text-xs text-dsp-text-muted">Max Latency (ms)</label>
            <NumericInput
              value={settings.maxLatencyMs}
              onChange={(v) => onSettingsChange((s) => ({ ...s, maxLatencyMs: v }))}
              min={0}
              max={500}
              step={1}
              precision={0}
            />
            <p className="text-[11px] text-dsp-text-muted">
              Taps: <span className="font-mono">{effectiveTaps.toLocaleString()}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs text-dsp-text-muted">Taps</label>
            <NumericInput
              value={clampOddInt(settings.taps)}
              onChange={(v) => onSettingsChange((s) => ({ ...s, taps: clampOddInt(v) }))}
              min={1}
              max={262143}
              step={2}
              precision={0}
            />
            <p className="text-[11px] text-dsp-text-muted">
              Target delay: <span className="font-mono">{targetLatencyMs.toFixed(2)} ms</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
