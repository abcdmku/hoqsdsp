import type { ChannelProcessingFilter } from '../../lib/signalflow';
import type {
  CompressorFilter,
  ConvolutionFilter,
  DelayFilter,
  DiffEqFilter,
  DitherFilter,
  FirPhaseCorrectionUiSettingsV1,
  FilterConfig,
  FilterType,
  GainFilter,
  LoudnessFilter,
  NoiseGateFilter,
  VolumeFilter,
} from '../../types';
import {
  CompressorEditorPanel,
  ConvolutionEditorPanel,
  DelayEditorPanel,
  DiffEqEditorPanel,
  DitherEditorPanel,
  GainEditorPanel,
  LoudnessEditorPanel,
  NoiseGateEditorPanel,
  VolumeEditorPanel,
} from '../filters';

interface SignalFlowFilterEditorPanelProps {
  filterType: FilterType;
  config: FilterConfig;
  sampleRate: number;
  filters: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  onClose: () => void;
  onApply: (config: FilterConfig) => void;
  onSave: (config: FilterConfig) => void;
}

export function SignalFlowFilterEditorPanel({
  filterType,
  config,
  sampleRate,
  filters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
  onClose,
  onApply,
  onSave,
}: SignalFlowFilterEditorPanelProps) {
  const commonProps = { onClose, onApply, onSave } as const;

  switch (filterType) {
    case 'Gain':
      return <GainEditorPanel {...commonProps} filter={config as GainFilter} />;
    case 'Delay':
      return <DelayEditorPanel {...commonProps} filter={config as DelayFilter} sampleRate={sampleRate} />;
    case 'Volume':
      return <VolumeEditorPanel {...commonProps} filter={config as VolumeFilter} />;
    case 'DiffEq':
      return <DiffEqEditorPanel {...commonProps} filter={config as DiffEqFilter} />;
    case 'Conv':
      return (
        <ConvolutionEditorPanel
          {...commonProps}
          filter={config as ConvolutionFilter}
          sampleRate={sampleRate}
          channelFilters={filters}
          filterName={filterName}
          firPhaseCorrectionSettings={firPhaseCorrectionSettings}
          onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        />
      );
    case 'Compressor':
      return <CompressorEditorPanel {...commonProps} filter={config as CompressorFilter} />;
    case 'NoiseGate':
      return <NoiseGateEditorPanel {...commonProps} filter={config as NoiseGateFilter} />;
    case 'Loudness':
      return <LoudnessEditorPanel {...commonProps} filter={config as LoudnessFilter} />;
    case 'Dither':
      return <DitherEditorPanel {...commonProps} filter={config as DitherFilter} />;
    default:
      return (
        <div className="text-sm text-dsp-text-muted">
          No editor available for {filterType}.
        </div>
      );
  }
}
