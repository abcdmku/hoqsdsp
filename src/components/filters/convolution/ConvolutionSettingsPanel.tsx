import { useEffect, useMemo, useState } from 'react';
import type { FirMagnitudeStats, FirPreviewDesign } from './types';
import type { FirDesignSettings } from './useFirSettings';
import type { CorrectableFilterUi } from './useFirSelection';
import { DesignSettingsPanel } from './DesignSettingsPanel';
import { FilterSelectionPanel } from './FilterSelectionPanel';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';

type FirWizardTab = 'settings' | 'sources';

const WIZARD_TABS: Array<{ id: FirWizardTab; label: string }> = [
  { id: 'settings', label: '1 Settings' },
  { id: 'sources', label: '2 Sources' },
];

interface ConvolutionSettingsPanelProps {
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

function formatCoeffList(values: number[], maxItems: number): string {
  const shown = values.slice(0, maxItems).map((v) => (Number.isFinite(v) ? Number(v.toFixed(6)).toString() : 'NaN'));
  return values.length > maxItems ? `${shown.join(', ')}, …` : shown.join(', ');
}

function formatCorrectableFilterParams(filter: CorrectableFilterUi): string {
  const config = filter.config;
  if (config.type === 'Biquad') {
    const p = config.parameters;
    switch (p.type) {
      case 'Peaking':
        return `Biquad.${p.type} freq=${p.freq}Hz gain=${p.gain}dB q=${p.q}`;
      case 'Lowpass':
      case 'Highpass':
      case 'Notch':
      case 'Bandpass':
      case 'Allpass':
        return `Biquad.${p.type} freq=${p.freq}Hz q=${p.q}`;
      case 'LowpassFO':
      case 'HighpassFO':
      case 'AllpassFO':
        return `Biquad.${p.type} freq=${p.freq}Hz`;
      case 'Lowshelf':
      case 'Highshelf':
        return `Biquad.${p.type} freq=${p.freq}Hz gain=${p.gain}dB slope=${p.slope}`;
      case 'LowshelfFO':
      case 'HighshelfFO':
        return `Biquad.${p.type} freq=${p.freq}Hz gain=${p.gain}dB`;
      case 'LinkwitzTransform':
        return `Biquad.${p.type} freq_act=${p.freq_act}Hz q_act=${p.q_act} freq_target=${p.freq_target}Hz q_target=${p.q_target}`;
      case 'ButterworthLowpass':
      case 'ButterworthHighpass':
      case 'LinkwitzRileyLowpass':
      case 'LinkwitzRileyHighpass':
        return `Biquad.${p.type} freq=${p.freq}Hz order=${p.order}`;
      default:
        return filter.summary ? `Biquad ${filter.summary}` : 'Biquad';
    }
  }

  if (config.type === 'DiffEq') {
    const p = config.parameters;
    return `DiffEq a[${p.a.length}]=[${formatCoeffList(p.a, 4)}] b[${p.b.length}]=[${formatCoeffList(p.b, 4)}]`;
  }

  return filter.summary ? `${config.type} ${filter.summary}` : config.type;
}

export function ConvolutionSettingsPanel({
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
  const [wizardOpen, setWizardOpen] = useState<boolean>(() => isIdentityFir);
  const [activeTab, setActiveTab] = useState<FirWizardTab>('settings');

  useEffect(() => {
    if (!isIdentityFir) return;
    setWizardOpen(true);
    setActiveTab('settings');
  }, [isIdentityFir]);

  const selectedFilters = useMemo(() => {
    const selectedUi = correctableUi.filter((f) => selectedFilterNames.has(f.name));
    return { selectedUi };
  }, [correctableUi, selectedFilterNames]);

  const handleOpenWizard = () => {
    setWizardOpen(true);
    setActiveTab('settings');
  };

  const handleApplyFirAndCloseWizard = () => {
    onApplyFir();
    setWizardOpen(false);
  };

  const handleCloseWizard = () => {
    if (isIdentityFir) return;
    setWizardOpen(false);
  };

  if (!wizardOpen && !isIdentityFir) {
    return (
      <div className="rounded-lg border border-dsp-primary/20 bg-dsp-bg/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-dsp-text">Applied FIR</p>
            <p className="text-xs text-dsp-text-muted">
              Linearizes {selectedFilters.selectedUi.length.toLocaleString()} filter{selectedFilters.selectedUi.length === 1 ? '' : 's'}.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleOpenWizard}>
            Auto FIR Wizard
          </Button>
        </div>

        {selectedFilters.selectedUi.length === 0 ? (
          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2 text-xs text-dsp-text-muted">
            No filters selected.
          </div>
        ) : (
          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2">
            <ul className="space-y-1.5 text-xs text-dsp-text">
              {selectedFilters.selectedUi.map((f) => (
                <li key={f.name} className="min-w-0">
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-dsp-text">{f.displayName}</span>
                    <span className="flex-shrink-0 rounded border border-dsp-primary/30 bg-dsp-bg/30 px-1.5 py-0.5 text-[11px] text-dsp-text-muted">
                      {f.config.type}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-dsp-text-muted">
                    {formatCorrectableFilterParams(f)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dsp-primary/20 bg-dsp-bg/30 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md bg-dsp-surface/50 p-1" role="tablist" aria-label="Auto FIR Wizard">
          {WIZARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                'px-2.5 py-1 rounded-sm text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                activeTab === tab.id
                  ? 'bg-dsp-bg text-dsp-text'
                  : 'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/20',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {!isIdentityFir && (
          <Button type="button" variant="ghost" size="sm" onClick={handleCloseWizard}>
            Close
          </Button>
        )}
      </div>

      {activeTab === 'settings' ? (
        <DesignSettingsPanel
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
          firMagnitudeStats={firMagnitudeStats}
          showApplyButton={false}
        />
      ) : (
        <div className="space-y-4">
          <FilterSelectionPanel
            correctableUi={correctableUi}
            selectedFilterNames={selectedFilterNames}
            onSelectedFilterNamesChange={onSelectedFilterNamesChange}
            onSelectAllFilters={onSelectAllFilters}
            onClearFilters={onClearFilters}
          />
          <div className="rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3 space-y-1.5">
            <p className="text-sm font-medium text-dsp-text">Captured measured phase</p>
            <p className="text-xs text-dsp-text-muted">
              Microphone-based (measurement) correction is planned and will appear here as an additional source option.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('settings')}
          disabled={activeTab === 'settings'}
        >
          Back
        </Button>
        {activeTab === 'settings' ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setActiveTab('sources')}>
            Next: Sources
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {!isIdentityFir && (
              <Button type="button" variant="ghost" size="sm" onClick={handleCloseWizard}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyFirAndCloseWizard}
              disabled={!previewDesign.taps}
            >
              Apply FIR
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
