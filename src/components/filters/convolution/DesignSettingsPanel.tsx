import type { FirMagnitudeStats, FirPreviewDesign } from './types';
import type { FirDesignSettings } from './useFirSettings';
import { DesignSettingsStatus } from './DesignSettingsStatus';
import { FirBandGateSection } from './FirBandGateSection';
import { FirToggleSection } from './FirToggleSection';
import { FirWindowSection } from './FirWindowSection';

interface DesignSettingsPanelProps {
  isIdentityFir: boolean;
  canEnableFromIdentity: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  tapMode: 'latency' | 'taps';
  onTapModeChange: (value: 'latency' | 'taps') => void;
  settings: FirDesignSettings;
  onSettingsChange: (updater: (prev: FirDesignSettings) => FirDesignSettings) => void;
  effectiveTaps: number;
  targetLatencyMs: number;
  sampleRate: number;
  previewDesign: FirPreviewDesign;
  onApplyFir?: () => void;
  firMagnitudeStats: { preview: FirMagnitudeStats | null };
  showApplyButton?: boolean;
}

export function DesignSettingsPanel({
  isIdentityFir,
  canEnableFromIdentity,
  onToggleEnabled,
  tapMode,
  onTapModeChange,
  settings,
  onSettingsChange,
  effectiveTaps,
  targetLatencyMs,
  sampleRate,
  previewDesign,
  onApplyFir,
  firMagnitudeStats,
  showApplyButton = true,
}: DesignSettingsPanelProps) {
  return (
    <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3 space-y-2">
      <FirToggleSection
        isIdentityFir={isIdentityFir}
        canEnableFromIdentity={canEnableFromIdentity}
        onToggleEnabled={onToggleEnabled}
        tapMode={tapMode}
        onTapModeChange={onTapModeChange}
        settings={settings}
        onSettingsChange={onSettingsChange}
        effectiveTaps={effectiveTaps}
        targetLatencyMs={targetLatencyMs}
      />
      <FirBandGateSection
        settings={settings}
        onSettingsChange={onSettingsChange}
        sampleRate={sampleRate}
      />
      <FirWindowSection
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
      <DesignSettingsStatus
        previewDesign={previewDesign}
        firMagnitudeStats={firMagnitudeStats}
        onApplyFir={onApplyFir}
        normalize={settings.normalize}
        onNormalizeChange={(value) => onSettingsChange((s) => ({ ...s, normalize: value }))}
        showApplyButton={showApplyButton}
      />
    </div>
  );
}
