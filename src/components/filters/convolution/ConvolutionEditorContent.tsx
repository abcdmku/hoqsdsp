import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConvolutionFilter, FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import { useFilterEditor } from '../FilterEditorModal';
import { generateFrequencies } from '../../../lib/dsp';
import type { HoverInfo } from './types';
import { ConvolutionGraphPanel } from './ConvolutionGraphPanel';
import { ConvolutionHeader } from './ConvolutionHeader';
import { ConvolutionSettingsPanel } from './ConvolutionSettingsPanel';
import { useFirPreviewDesign } from './useFirPreviewDesign';
import { useFirResponses } from './useFirResponses';
import { useFirEditorActions } from './useFirEditorActions';
import { useFirSelection } from './useFirSelection';
import { useFirSettings } from './useFirSettings';

export function ConvolutionEditorContent({
  sampleRate,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
  onDebouncedApply,
}: {
  sampleRate: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  onDebouncedApply?: (config: ConvolutionFilter) => void;
}) {
  const { filter, updateFilter } = useFilterEditor<ConvolutionFilter>();
  const [view, setView] = useState<'magnitude' | 'phase' | 'groupDelay' | 'impulse'>('phase');
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    setHoverInfo(null);
  }, [view]);

  const maxFreq = Math.min(20000, sampleRate / 2);
  const responseFrequencies = useMemo(() => generateFrequencies(256, 20, Math.max(20, maxFreq)), [maxFreq]);

  const {
    correctableUi,
    selectedFilterNames,
    setSelectedFilterNames,
    selectedFilterConfigs,
    pipelineFilterConfigs,
  } = useFirSelection({ channelFilters, filterName, firPhaseCorrectionSettings });

  const {
    tapMode,
    setTapMode,
    settings,
    setSettings,
    effectiveTaps,
    targetDelaySamples,
    targetLatencyMs,
  } = useFirSettings({ sampleRate, firPhaseCorrectionSettings });

  const previewDesign = useFirPreviewDesign({
    sampleRate,
    effectiveTaps,
    settings,
    selectedFilterConfigs,
  });

  const settingsToPersist = useMemo<FirPhaseCorrectionUiSettingsV1>(
    () => ({
      version: 1,
      tapMode,
      maxLatencyMs: settings.maxLatencyMs,
      taps: settings.taps,
      bandLowHz: settings.bandLowHz,
      bandHighHz: settings.bandHighHz,
      transitionOctaves: settings.transitionOctaves,
      magnitudeThresholdDb: settings.magnitudeThresholdDb,
      magnitudeTransitionDb: settings.magnitudeTransitionDb,
      phaseHideBelowDb: settings.phaseHideBelowDb,
      window: settings.window,
      kaiserBeta: settings.kaiserBeta,
      normalize: settings.normalize,
      selectedFilterNames: correctableUi.filter((f) => selectedFilterNames.has(f.name)).map((f) => f.name),
    }),
    [
      correctableUi,
      selectedFilterNames,
      settings.bandHighHz,
      settings.bandLowHz,
      settings.kaiserBeta,
      settings.magnitudeThresholdDb,
      settings.magnitudeTransitionDb,
      settings.maxLatencyMs,
      settings.normalize,
      settings.phaseHideBelowDb,
      settings.taps,
      settings.transitionOctaves,
      settings.window,
      tapMode,
    ],
  );

  const {
    params,
    currentTaps,
    isIdentityFir,
    canPreviewAppliedFirResponse,
    canEnableFromIdentity,
    canUndo,
    canReset,
    handleUndo,
    handleResetToBaseline,
    handleApplyFir,
    handleToggleEnabled,
  } = useFirEditorActions({
    filter,
    updateFilter,
    previewDesign,
    settingsToPersist,
    filterName,
    onPersistFirPhaseCorrectionSettings,
    onDebouncedApply,
  });

  const {
    firMagnitudeStats,
    magnitudeSeries,
    magnitudePlot,
    phaseSeries,
    groupDelayPlot,
  } = useFirResponses({
    sampleRate,
    responseFrequencies,
    pipelineFilterConfigs,
    currentTaps,
    previewTaps: previewDesign.taps,
    canPreviewAppliedFirResponse,
    phaseHideBelowDb: settings.phaseHideBelowDb,
    targetDelaySamples,
  });

  const handleSelectAllFilters = useCallback(() => {
    setSelectedFilterNames(new Set(correctableUi.map((f) => f.name)));
  }, [correctableUi, setSelectedFilterNames]);

  const handleClearFilters = useCallback(() => {
    setSelectedFilterNames(new Set());
  }, [setSelectedFilterNames]);

  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_24rem] gap-4 p-4">
      <div className="min-w-0 min-h-0 space-y-3">
        <ConvolutionHeader
          view={view}
          onViewChange={setView}
          isIdentityFir={isIdentityFir}
          params={params}
          currentTapCount={currentTaps.length}
          targetLatencyMs={targetLatencyMs}
          canUndo={canUndo}
          canReset={canReset}
          onUndo={handleUndo}
          onReset={handleResetToBaseline}
        />
        <ConvolutionGraphPanel
          view={view}
          maxFreq={maxFreq}
          magnitudeSeries={magnitudeSeries}
          magnitudePlot={magnitudePlot}
          phaseSeries={phaseSeries}
          groupDelayPlot={groupDelayPlot}
          currentTaps={currentTaps}
          previewTaps={previewDesign.taps}
          sampleRate={sampleRate}
          hoverInfo={hoverInfo}
          onHoverChange={setHoverInfo}
        />
      </div>
      <div className="min-w-0 min-h-0 h-full overflow-y-auto">
        <ConvolutionSettingsPanel
          isIdentityFir={isIdentityFir}
          canEnableFromIdentity={canEnableFromIdentity}
          onToggleEnabled={handleToggleEnabled}
          tapMode={tapMode}
          onTapModeChange={setTapMode}
          settings={settings}
          onSettingsChange={setSettings}
          effectiveTaps={effectiveTaps}
          targetLatencyMs={targetLatencyMs}
          sampleRate={sampleRate}
          previewDesign={previewDesign}
          onApplyFir={handleApplyFir}
          firMagnitudeStats={firMagnitudeStats}
          correctableUi={correctableUi}
          selectedFilterNames={selectedFilterNames}
          onSelectedFilterNamesChange={setSelectedFilterNames}
          onSelectAllFilters={handleSelectAllFilters}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  );
}



