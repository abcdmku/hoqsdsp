import type { DeviceInfo, SampleFormat } from '../../../types';
import type { DeviceFormState } from './types';
import { Headphones, Volume2 } from 'lucide-react';
import { DeviceSectionFields } from './DeviceSectionFields';
import { CommonSettingsSection } from './CommonSettingsSection';
import { ConfigActions } from './ConfigActions';

interface DeviceConfigFormProps {
  formState: DeviceFormState;
  updateField: <K extends keyof DeviceFormState>(field: K, value: DeviceFormState[K]) => void;
  safeDeviceTypes: string[];
  typesLoading: boolean;
  typesError: boolean;
  captureDevices?: DeviceInfo[];
  captureLoading: boolean;
  captureError: boolean;
  playbackDevices?: DeviceInfo[];
  playbackLoading: boolean;
  playbackError: boolean;
  onInputBackendChange: (value: string) => void;
  onOutputBackendChange: (value: string) => void;
  isCreatingMode: boolean;
  canCreateConfig: boolean;
  isPending: boolean;
  isError: boolean;
  onCreateConfig: () => void;
  onApply: () => void;
}

export function DeviceConfigForm({
  formState,
  updateField,
  safeDeviceTypes,
  typesLoading,
  typesError,
  captureDevices,
  captureLoading,
  captureError,
  playbackDevices,
  playbackLoading,
  playbackError,
  onInputBackendChange,
  onOutputBackendChange,
  isCreatingMode,
  canCreateConfig,
  isPending,
  isError,
  onCreateConfig,
  onApply,
}: DeviceConfigFormProps) {
  return (
    <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4 space-y-6">
      <DeviceSectionFields
        title="Input (Capture)"
        icon={<Headphones className="h-4 w-4" />}
        backendValue={formState.inputBackend}
        deviceValue={formState.inputDevice}
        channelsValue={formState.inputChannels}
        formatValue={formState.inputFormat as SampleFormat}
        onBackendChange={onInputBackendChange}
        onDeviceChange={(v) => updateField('inputDevice', v)}
        onChannelsChange={(v) => updateField('inputChannels', v)}
        onFormatChange={(v) => updateField('inputFormat', v)}
        backendOptions={safeDeviceTypes}
        backendLoading={typesLoading}
        backendError={typesError}
        devices={captureDevices}
        devicesLoading={captureLoading}
        devicesError={captureError}
      />

      <DeviceSectionFields
        title="Output (Playback)"
        icon={<Volume2 className="h-4 w-4" />}
        backendValue={formState.outputBackend}
        deviceValue={formState.outputDevice}
        channelsValue={formState.outputChannels}
        formatValue={formState.outputFormat as SampleFormat}
        onBackendChange={onOutputBackendChange}
        onDeviceChange={(v) => updateField('outputDevice', v)}
        onChannelsChange={(v) => updateField('outputChannels', v)}
        onFormatChange={(v) => updateField('outputFormat', v)}
        backendOptions={safeDeviceTypes}
        backendLoading={typesLoading}
        backendError={typesError}
        devices={playbackDevices}
        devicesLoading={playbackLoading}
        devicesError={playbackError}
      />

      <CommonSettingsSection
        sampleRate={formState.sampleRate}
        chunkSize={formState.chunkSize}
        onSampleRateChange={(v) => updateField('sampleRate', v)}
        onChunkSizeChange={(v) => updateField('chunkSize', v)}
      />

      <ConfigActions
        isCreatingMode={isCreatingMode}
        canCreateConfig={canCreateConfig}
        isPending={isPending}
        isError={isError}
        onCreate={onCreateConfig}
        onApply={onApply}
      />
    </div>
  );
}
