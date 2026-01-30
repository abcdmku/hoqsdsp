import type { ConvolutionFilter, FirPhaseCorrectionUiSettingsV1 } from '../../types';
import type { ChannelProcessingFilter } from '../../lib/signalflow';
import { convolutionHandler } from '../../lib/filters/convolution';
import { FilterEditorModal, FilterEditorPanel } from './FilterEditorModal';
import { ConvolutionEditorContent } from './convolution/ConvolutionEditorContent';

interface ConvolutionEditorProps {
  open: boolean;
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
  sampleRate?: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
}

interface ConvolutionEditorPanelProps {
  onClose: () => void;
  filter: ConvolutionFilter;
  onSave: (config: ConvolutionFilter) => void;
  onApply?: (config: ConvolutionFilter) => void;
  sampleRate?: number;
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
}

export function ConvolutionEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
}: ConvolutionEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="FIR Phase Correction"
      description="Auto-generate an FIR to linearize filter phase"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
      contentClassName="max-w-5xl"
      bodyScrollable={false}
      bodyClassName="py-0"
    >
      <ConvolutionEditorContent
        sampleRate={sampleRate}
        channelFilters={channelFilters}
        filterName={filterName}
        firPhaseCorrectionSettings={firPhaseCorrectionSettings}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        onDebouncedApply={onApply}
      />
    </FilterEditorModal>
  );
}

export function ConvolutionEditorPanel({
  onClose,
  filter,
  onSave,
  onApply,
  sampleRate = 48000,
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
  onPersistFirPhaseCorrectionSettings,
}: ConvolutionEditorPanelProps) {
  return (
    <FilterEditorPanel
      onClose={onClose}
      description="Auto-generate an FIR to linearize filter phase"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => convolutionHandler.validate(config)}
      bodyScrollable={false}
      bodyClassName="py-0"
    >
      <ConvolutionEditorContent
        sampleRate={sampleRate}
        channelFilters={channelFilters}
        filterName={filterName}
        firPhaseCorrectionSettings={firPhaseCorrectionSettings}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        onDebouncedApply={onApply}
      />
    </FilterEditorPanel>
  );
}


