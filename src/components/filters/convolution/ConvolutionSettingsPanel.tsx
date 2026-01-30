import type { FirMagnitudeStats, FirPreviewDesign } from './types';
import type { FirDesignSettings } from './useFirSettings';
import type { CorrectableFilterUi } from './useFirSelection';
import { DesignSettingsPanel } from './DesignSettingsPanel';
import { FilterSelectionPanel } from './FilterSelectionPanel';

interface ConvolutionSettingsPanelProps {
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
  sampleRate: number;
  previewDesign: FirPreviewDesign;
  onApplyFir: () => void;
  firMagnitudeStats: { preview: FirMagnitudeStats | null };
  correctableUi: CorrectableFilterUi[];
  selectedFilterNames: Set<string>;
  onSelectedFilterNamesChange: (updater: (prev: Set<string>) => Set<string>) => void;
  onSelectAllFilters: () => void;
  onClearFilters: () => void;
}

export function ConvolutionSettingsPanel({
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
  sampleRate,
  previewDesign,
  onApplyFir,
  firMagnitudeStats,
  correctableUi,
  selectedFilterNames,
  onSelectedFilterNamesChange,
  onSelectAllFilters,
  onClearFilters,
}: ConvolutionSettingsPanelProps) {
  return (
    <div className="rounded-lg border border-dsp-primary/20 bg-dsp-bg/30 p-4 space-y-4">
      <DesignSettingsPanel
        previewEnabled={previewEnabled}
        onPreviewEnabledChange={onPreviewEnabledChange}
        isIdentityFir={isIdentityFir}
        canEnableFromIdentity={canEnableFromIdentity}
        onToggleEnabled={onToggleEnabled}
        tapMode={tapMode}
        onTapModeChange={onTapModeChange}
        settings={settings}
        onSettingsChange={onSettingsChange}
        effectiveTaps={effectiveTaps}
        targetLatencyMs={targetLatencyMs}
        sampleRate={sampleRate}
        previewDesign={previewDesign}
        onApplyFir={onApplyFir}
        firMagnitudeStats={firMagnitudeStats}
      />
      <FilterSelectionPanel
        correctableUi={correctableUi}
        selectedFilterNames={selectedFilterNames}
        onSelectedFilterNamesChange={onSelectedFilterNamesChange}
        onSelectAllFilters={onSelectAllFilters}
        onClearFilters={onClearFilters}
      />
      <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2 text-xs text-dsp-text-muted">
        Microphone-based (measurement) correction is planned and will appear here as an additional source option.
      </div>
    </div>
  );
}
