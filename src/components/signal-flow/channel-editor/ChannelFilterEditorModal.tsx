import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import type {
  BiquadFilter,
  CompressorFilter,
  ConvolutionFilter,
  DelayFilter,
  DiffEqFilter,
  DitherFilter,
  FilterConfig,
  GainFilter,
  LoudnessFilter,
  NoiseGateFilter,
  VolumeFilter,
} from '../../../types';
import {
  BiquadEditor,
  CompressorEditor,
  ConvolutionEditor,
  DelayEditor,
  DiffEqEditor,
  DitherEditor,
  GainEditor,
  LoudnessEditor,
  NoiseGateEditor,
  VolumeEditor,
} from '../../filters';

interface ChannelFilterEditorModalProps {
  filter: ChannelProcessingFilter | null;
  sampleRate: number;
  processingFilters: ChannelProcessingFilter[];
  onClose: () => void;
  onUpdate: (filterName: string, updatedConfig: FilterConfig, options?: { debounce?: boolean }) => void;
}

export function ChannelFilterEditorModal({
  filter,
  sampleRate,
  processingFilters,
  onClose,
  onUpdate,
}: ChannelFilterEditorModalProps) {
  if (!filter) return null;

  const handleSave = (updated: FilterConfig, options?: { debounce?: boolean }) => {
    onUpdate(filter.name, updated, options);
  };

  const applyDebounced = (updated: FilterConfig) => {
    handleSave(updated, { debounce: true });
  };

  switch (filter.config.type) {
    case 'Biquad':
      return (
        <BiquadEditor
          open={true}
          onClose={onClose}
          filter={filter.config as BiquadFilter}
          onSave={handleSave}
          onApply={applyDebounced}
          sampleRate={sampleRate}
        />
      );
    case 'Gain':
      return (
        <GainEditor
          open={true}
          onClose={onClose}
          filter={filter.config as GainFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'Delay':
      return (
        <DelayEditor
          open={true}
          onClose={onClose}
          filter={filter.config as DelayFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'DiffEq':
      return (
        <DiffEqEditor
          open={true}
          onClose={onClose}
          filter={filter.config as DiffEqFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'Volume':
      return (
        <VolumeEditor
          open={true}
          onClose={onClose}
          filter={filter.config as VolumeFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'Conv':
      return (
        <ConvolutionEditor
          open={true}
          onClose={onClose}
          filter={filter.config as ConvolutionFilter}
          onSave={handleSave}
          onApply={applyDebounced}
          sampleRate={sampleRate}
          channelFilters={processingFilters}
          filterName={filter.name}
        />
      );
    case 'Compressor':
      return (
        <CompressorEditor
          open={true}
          onClose={onClose}
          filter={filter.config as CompressorFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'Dither':
      return (
        <DitherEditor
          open={true}
          onClose={onClose}
          filter={filter.config as DitherFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'NoiseGate':
      return (
        <NoiseGateEditor
          open={true}
          onClose={onClose}
          filter={filter.config as NoiseGateFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    case 'Loudness':
      return (
        <LoudnessEditor
          open={true}
          onClose={onClose}
          filter={filter.config as LoudnessFilter}
          onSave={handleSave}
          onApply={applyDebounced}
        />
      );
    default:
      return null;
  }
}
