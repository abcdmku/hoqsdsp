import { useState, useMemo, useCallback } from 'react';
import { Headphones, Volume2, Settings2, AlertCircle, Plus, Zap, Cog } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { useConfigStatus, useSetConfigJson } from '../../features/configuration';
import {
  useSupportedDeviceTypes,
  useAvailableCaptureDevices,
  useAvailablePlaybackDevices,
} from '../../features/devices';
import { useAutoSetup } from '../../hooks';
import { showToast } from '../feedback';
import { createMinimalConfig } from '../../lib/config/createConfig';
import {
  findBestHardwareDevice,
  generateAutoConfig,
  formatAutoConfigSummary,
  type AutoConfigResult,
} from '../../lib/devices';
import { AutoSetupDialog } from './AutoSetupDialog';
import type { SampleFormat, DeviceInfo, CamillaConfig } from '../../types';

const SAMPLE_FORMATS: SampleFormat[] = [
  'S16LE',
  'S24LE',
  'S24LE3',
  'S32LE',
  'FLOAT32LE',
  'FLOAT64LE',
];

const COMMON_SAMPLE_RATES = [44100, 48000, 88200, 96000, 176400, 192000];
const COMMON_CHUNK_SIZES = [256, 512, 1024, 2048, 4096];

const DEFAULT_FORM_STATE: DeviceFormState = {
  inputBackend: null,
  inputDevice: '',
  inputChannels: 2,
  inputFormat: 'S32LE',
  outputBackend: null,
  outputDevice: '',
  outputChannels: 2,
  outputFormat: 'S32LE',
  sampleRate: 48000,
  chunkSize: 1024,
};

interface DeviceFormState {
  inputBackend: string | null;
  inputDevice: string;
  inputChannels: number;
  inputFormat: SampleFormat;
  outputBackend: string | null;
  outputDevice: string;
  outputChannels: number;
  outputFormat: SampleFormat;
  sampleRate: number;
  chunkSize: number;
}

function getFormStateFromConfig(config: CamillaConfig): DeviceFormState {
  return {
    inputBackend: config.devices.capture.type,
    inputDevice: config.devices.capture.device ?? '',
    inputChannels: config.devices.capture.channels,
    inputFormat: config.devices.capture.format ?? 'S32LE',
    outputBackend: config.devices.playback.type,
    outputDevice: config.devices.playback.device ?? '',
    outputChannels: config.devices.playback.channels,
    outputFormat: config.devices.playback.format ?? 'S32LE',
    sampleRate: config.devices.samplerate,
    chunkSize: config.devices.chunksize,
  };
}

interface DeviceConfigSectionProps {
  unitId: string;
}

type ConfigMode = 'selection' | 'manual' | null;

export function DeviceConfigSection({ unitId }: DeviceConfigSectionProps) {
  const { hasConfig, isLoading: configLoading, config, dataUpdatedAt } = useConfigStatus(unitId);
  const { data: deviceTypes, isLoading: typesLoading, isError: typesError } = useSupportedDeviceTypes(unitId);
  const setConfigJson = useSetConfigJson(unitId);
  const autoSetup = useAutoSetup(unitId);

  // Config creation mode: 'selection' = choose Quick/Manual, 'manual' = show full form
  const [configMode, setConfigMode] = useState<ConfigMode>(null);
  // Auto-config result to show confirmation
  const [autoConfigResult, setAutoConfigResult] = useState<AutoConfigResult | null>(null);
  // Backend selected for auto-config
  const [selectedBackend, setSelectedBackend] = useState<string | null>(null);
  // Track when Quick Setup found no hardware device
  const [noHardwareFound, setNoHardwareFound] = useState(false);
  // Auto Setup dialog state
  const [autoSetupDialogOpen, setAutoSetupDialogOpen] = useState(false);

  // Track local edits as an overlay on top of config (or defaults when no config)
  const [localEdits, setLocalEdits] = useState<Partial<DeviceFormState>>({});
  const [lastDataUpdatedAt, setLastDataUpdatedAt] = useState(dataUpdatedAt);

  // Reset local edits when config data is updated (e.g., after successful apply)
  if (dataUpdatedAt !== lastDataUpdatedAt) {
    setLastDataUpdatedAt(dataUpdatedAt);
    setLocalEdits({});
  }

  // Compute form state by merging base (from config or defaults) with local edits
  const formState = useMemo((): DeviceFormState => {
    const baseState = config ? getFormStateFromConfig(config) : DEFAULT_FORM_STATE;
    return { ...baseState, ...localEdits };
  }, [config, localEdits]);

  // Fetch available devices based on selected backends (works without config)
  const { data: captureDevices, isLoading: captureLoading, isError: captureError, error: captureErrorDetails } = useAvailableCaptureDevices(
    unitId,
    formState.inputBackend
  );
  const { data: playbackDevices, isLoading: playbackLoading, isError: playbackError, error: playbackErrorDetails } = useAvailablePlaybackDevices(
    unitId,
    formState.outputBackend
  );

  // Fetch devices for Quick Setup (when backend is selected for auto-config)
  const { data: autoConfigDevices, isLoading: autoConfigLoading } = useAvailablePlaybackDevices(
    unitId,
    selectedBackend
  );

  const updateField = <K extends keyof DeviceFormState>(field: K, value: DeviceFormState[K]) => {
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputBackendChange = (value: string) => {
    // Only accept string values that are in our device types list
    if (typeof value !== 'string' || !safeDeviceTypes.includes(value)) {
      return;
    }
    setLocalEdits((prev) => ({
      ...prev,
      inputBackend: value,
      inputDevice: '', // Reset device when backend changes
    }));
  };

  const handleOutputBackendChange = (value: string) => {
    // Only accept string values that are in our device types list
    if (typeof value !== 'string' || !safeDeviceTypes.includes(value)) {
      return;
    }
    setLocalEdits((prev) => ({
      ...prev,
      outputBackend: value,
      outputDevice: '', // Reset device when backend changes
    }));
  };

  const handleApply = () => {
    if (!config) return;

    // Update mixer channel counts to match new device channel counts
    const newInputChannels = formState.inputChannels;
    const newOutputChannels = formState.outputChannels;

    // Update the routing mixer if it exists
    let updatedMixers = config.mixers;
    if (config.mixers?.routing) {
      const routingMixer = config.mixers.routing;
      const oldInChannels = routingMixer.channels.in;
      const oldOutChannels = routingMixer.channels.out;

      // Only update if channel counts changed
      if (oldInChannels !== newInputChannels || oldOutChannels !== newOutputChannels) {
        // Filter out any routes that would be out of range with new channel counts
        const validMapping = routingMixer.mapping.filter(
          (m) => m.dest < newOutputChannels && m.sources.every((s) => s.channel < newInputChannels)
        );

        updatedMixers = {
          ...config.mixers,
          routing: {
            ...routingMixer,
            channels: { in: newInputChannels, out: newOutputChannels },
            mapping: validMapping,
          },
        };
      }
    }

    const updatedConfig: CamillaConfig = {
      ...config,
      devices: {
        ...config.devices,
        samplerate: formState.sampleRate,
        chunksize: formState.chunkSize,
        capture: {
          ...config.devices.capture,
          type: formState.inputBackend ?? config.devices.capture.type,
          device: formState.inputDevice || undefined,
          channels: formState.inputChannels,
          format: formState.inputFormat,
        },
        playback: {
          ...config.devices.playback,
          type: formState.outputBackend ?? config.devices.playback.type,
          device: formState.outputDevice || undefined,
          channels: formState.outputChannels,
          format: formState.outputFormat,
        },
      },
      mixers: updatedMixers,
    };

    setConfigJson.mutate(updatedConfig);
  };

  const handleCreateConfig = () => {
    if (!formState.inputBackend || !formState.outputBackend) {
      return;
    }

    const newConfig = createMinimalConfig({
      captureBackend: formState.inputBackend,
      captureDevice: formState.inputDevice,
      captureChannels: formState.inputChannels,
      captureFormat: formState.inputFormat,
      playbackBackend: formState.outputBackend,
      playbackDevice: formState.outputDevice,
      playbackChannels: formState.outputChannels,
      playbackFormat: formState.outputFormat,
      sampleRate: formState.sampleRate,
      chunkSize: formState.chunkSize,
    });

    setConfigJson.mutate(newConfig);
  };

  // Quick Setup handlers
  const handleQuickSetup = () => {
    if (!selectedBackend || !autoConfigDevices) return;

    setNoHardwareFound(false);
    const bestDevice = findBestHardwareDevice(autoConfigDevices);
    if (bestDevice) {
      const result = generateAutoConfig(bestDevice, selectedBackend);
      setAutoConfigResult(result);
    } else {
      // No hardware device found - show warning
      setAutoConfigResult(null);
      setNoHardwareFound(true);
    }
  };

  const handleConfirmAutoConfig = () => {
    if (!autoConfigResult) return;

    const newConfig = createMinimalConfig({
      captureBackend: autoConfigResult.backend,
      captureDevice: autoConfigResult.deviceForConfig,
      captureChannels: autoConfigResult.channels,
      captureFormat: autoConfigResult.format,
      playbackBackend: autoConfigResult.backend,
      playbackDevice: autoConfigResult.deviceForConfig,
      playbackChannels: autoConfigResult.channels,
      playbackFormat: autoConfigResult.format,
      sampleRate: autoConfigResult.sampleRate,
      chunkSize: autoConfigResult.chunkSize,
    });

    setConfigJson.mutate(newConfig, {
      onSuccess: () => {
        // Reset state after successful creation
        setAutoConfigResult(null);
        setSelectedBackend(null);
        setConfigMode(null);
      },
    });
  };

  const handleCancelAutoConfig = () => {
    setAutoConfigResult(null);
    setNoHardwareFound(false);
  };

  const handleManualSetup = () => {
    setConfigMode('manual');
  };

  const handleBackToSelection = () => {
    setConfigMode(null);
    setAutoConfigResult(null);
    setSelectedBackend(null);
    setNoHardwareFound(false);
  };

  // Open auto setup dialog
  const handleAutoSetupClick = useCallback(() => {
    setAutoSetupDialogOpen(true);
  }, []);

  // Handle device selection from auto setup dialog
  const handleAutoSetupConfirm = useCallback(async (
    captureDevice: DeviceInfo,
    playbackDevice: DeviceInfo,
    backend: string
  ) => {
    const result = await autoSetup.applyWithDevices(captureDevice, playbackDevice, backend);
    if (result.success) {
      const deviceName = captureDevice.name ?? captureDevice.device ?? 'unknown device';
      showToast.success('Auto Setup Complete', `Configured: ${deviceName}`);
    } else {
      showToast.error('Auto Setup Failed', result.error ?? 'Unknown error');
    }
  }, [autoSetup]);

  const getDeviceLabel = (device: DeviceInfo) => {
    return device.name ?? device.device;
  };

  const canCreateConfig = formState.inputBackend && formState.outputBackend;
  const isCreatingMode = !hasConfig && !configLoading;
  // Show mode selection when creating and haven't chosen a mode yet (or chose 'selection')
  const showModeSelection = isCreatingMode && (configMode === null || configMode === 'selection');
  // Show full form when we have config OR user chose manual mode
  const showFullForm = hasConfig || configMode === 'manual';

  // Ensure deviceTypes is an array
  const safeDeviceTypes = Array.isArray(deviceTypes) ? deviceTypes : [];

  if (configLoading) {
    return (
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dsp-text">
          <Settings2 className="h-5 w-5" />
          Audio Devices
        </h2>
        <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
          <p className="text-sm text-dsp-text-muted">
            Loading configuration from CamillaDSP...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-dsp-text">
          <Settings2 className="h-5 w-5" />
          Audio Devices
        </h2>

        {/* Auto Setup button - always available when connected */}
        <Button
          variant={hasConfig ? 'outline' : 'default'}
          size="sm"
          disabled={autoSetup.isRunning}
          onClick={handleAutoSetupClick}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          {autoSetup.isRunning ? 'Setting up...' : 'Auto Setup'}
        </Button>
      </div>

      {/* Auto Setup Status */}
      {autoSetup.isRunning && autoSetup.message && (
        <div className="mb-4 rounded-lg border border-dsp-accent/30 bg-dsp-accent/10 p-3 text-sm text-dsp-text">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 animate-pulse text-dsp-accent" />
            <span>{autoSetup.message}</span>
          </div>
        </div>
      )}

      {/* Mode Selection UI */}
      {showModeSelection && (
        <div className="mb-4 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-dsp-text">
            <Plus className="h-4 w-4 text-dsp-accent" />
            <span>No configuration loaded.</span>
          </div>

          {/* Backend Selection for Quick Setup */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-dsp-text-muted">
              Backend Type
            </label>
            <Select
              value={selectedBackend ?? undefined}
              onValueChange={setSelectedBackend}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder={
                  typesLoading ? 'Loading...' :
                  typesError ? 'Error loading backends' :
                  safeDeviceTypes.length === 0 ? 'No backends available' :
                  'Select backend'
                } />
              </SelectTrigger>
              <SelectContent>
                {safeDeviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Setup Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleQuickSetup}
              disabled={!selectedBackend || autoConfigLoading}
              variant="default"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {autoConfigLoading ? 'Detecting...' : 'Quick Setup'}
            </Button>
            <Button
              onClick={handleManualSetup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Cog className="h-4 w-4" />
              Manual Setup
            </Button>
          </div>

          <p className="mt-3 text-xs text-dsp-text-muted">
            Quick Setup auto-detects your audio device and configures with recommended settings.
          </p>

          {/* Auto-config Confirmation */}
          {autoConfigResult && (
            <div className="mt-4 rounded border border-dsp-accent/50 bg-dsp-accent/10 p-3">
              <p className="mb-2 text-sm text-dsp-text">
                <strong>Found:</strong> {formatAutoConfigSummary(autoConfigResult)}
              </p>
              <p className="mb-3 text-xs text-dsp-text-muted">
                Uses the same device for input and output (full-duplex).
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmAutoConfig}
                  disabled={setConfigJson.isPending}
                  size="sm"
                >
                  {setConfigJson.isPending ? 'Creating...' : 'Confirm'}
                </Button>
                <Button
                  onClick={handleCancelAutoConfig}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* No device found message */}
          {noHardwareFound && (
            <div className="mt-4 rounded border border-status-warning/50 bg-status-warning/10 p-3 text-sm text-dsp-text">
              <AlertCircle className="mb-1 inline h-4 w-4 text-status-warning" />{' '}
              No hardware audio device detected. Please connect a device or use Manual Setup.
            </div>
          )}
        </div>
      )}

      {/* Manual Setup Banner (when in manual mode) */}
      {configMode === 'manual' && isCreatingMode && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-dsp-accent/30 bg-dsp-accent/10 p-3 text-sm text-dsp-text">
          <div className="flex items-center gap-2">
            <Cog className="h-4 w-4 text-dsp-accent" />
            <span>Manual Setup - Configure all device settings below.</span>
          </div>
          <Button
            onClick={handleBackToSelection}
            variant="ghost"
            size="sm"
          >
            Back
          </Button>
        </div>
      )}

      {/* Device Types Error - show in mode selection too */}
      {typesError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load supported device types. Check CamillaDSP connection.</span>
        </div>
      )}

      {/* Full Device Configuration Form */}
      {showFullForm && (
        <>
          {/* Capture Device Error */}
          {captureError && formState.inputBackend && (
            <div className="mb-4 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load capture devices for {formState.inputBackend}</span>
              </div>
              <p className="mt-1 text-xs opacity-75">
                {captureErrorDetails instanceof Error ? captureErrorDetails.message : String(captureErrorDetails)}
              </p>
            </div>
          )}

          {/* Playback Device Error */}
          {playbackError && formState.outputBackend && (
            <div className="mb-4 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load playback devices for {formState.outputBackend}</span>
              </div>
              <p className="mt-1 text-xs opacity-75">
                {playbackErrorDetails instanceof Error ? playbackErrorDetails.message : String(playbackErrorDetails)}
              </p>
            </div>
          )}

          <div className="space-y-6 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
        {/* Input Device Section */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dsp-text">
            <Headphones className="h-4 w-4" />
            Input (Capture)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Backend Type */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Backend Type {safeDeviceTypes.length > 0 && `(${safeDeviceTypes.length} available)`}
              </label>
              <Select
                value={formState.inputBackend ?? undefined}
                onValueChange={handleInputBackendChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    typesLoading ? 'Loading...' :
                    typesError ? 'Error loading backends' :
                    safeDeviceTypes.length === 0 ? 'No backends available' :
                    'Select backend'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {safeDeviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Device {captureDevices && captureDevices.length > 0 && `(${captureDevices.length} found)`}
              </label>
              <Select
                value={formState.inputDevice}
                onValueChange={(v) => { updateField('inputDevice', v); }}
                disabled={!formState.inputBackend || captureLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    captureLoading ? 'Loading...' :
                    captureError ? 'Error loading devices' :
                    captureDevices?.length === 0 ? 'No devices found' :
                    'Select device'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {captureDevices?.map((device) => (
                    <SelectItem key={device.device} value={device.device}>
                      {getDeviceLabel(device)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channels */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Channels
              </label>
              <input
                type="number"
                min={1}
                max={64}
                value={formState.inputChannels}
                onChange={(e) => { updateField('inputChannels', Number(e.target.value)); }}
                className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
              />
            </div>

            {/* Format */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Sample Format
              </label>
              <Select
                value={formState.inputFormat}
                onValueChange={(v) => { updateField('inputFormat', v as SampleFormat); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Output Device Section */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dsp-text">
            <Volume2 className="h-4 w-4" />
            Output (Playback)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Backend Type */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Backend Type
              </label>
              <Select
                value={formState.outputBackend ?? undefined}
                onValueChange={handleOutputBackendChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    typesLoading ? 'Loading...' :
                    typesError ? 'Error loading backends' :
                    safeDeviceTypes.length === 0 ? 'No backends available' :
                    'Select backend'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {safeDeviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Device {playbackDevices && playbackDevices.length > 0 && `(${playbackDevices.length} found)`}
              </label>
              <Select
                value={formState.outputDevice}
                onValueChange={(v) => { updateField('outputDevice', v); }}
                disabled={!formState.outputBackend || playbackLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    playbackLoading ? 'Loading...' :
                    playbackError ? 'Error loading devices' :
                    playbackDevices?.length === 0 ? 'No devices found' :
                    'Select device'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {playbackDevices?.map((device) => (
                    <SelectItem key={device.device} value={device.device}>
                      {getDeviceLabel(device)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channels */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Channels
              </label>
              <input
                type="number"
                min={1}
                max={64}
                value={formState.outputChannels}
                onChange={(e) => { updateField('outputChannels', Number(e.target.value)); }}
                className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
              />
            </div>

            {/* Format */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Sample Format
              </label>
              <Select
                value={formState.outputFormat}
                onValueChange={(v) => { updateField('outputFormat', v as SampleFormat); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Common Settings */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-dsp-text">Common Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Sample Rate */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Sample Rate
              </label>
              <Select
                value={String(formState.sampleRate)}
                onValueChange={(v) => { updateField('sampleRate', Number(v)); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SAMPLE_RATES.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {(rate / 1000).toFixed(1)} kHz
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chunk Size */}
            <div>
              <label className="mb-1.5 block text-xs text-dsp-text-muted">
                Chunk Size
              </label>
              <Select
                value={String(formState.chunkSize)}
                onValueChange={(v) => { updateField('chunkSize', Number(v)); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CHUNK_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} samples
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {setConfigJson.isError && (
          <div className="flex items-center gap-2 rounded border border-status-error/50 bg-status-error/10 p-3 text-sm text-status-error">
            <AlertCircle className="h-4 w-4" />
            Failed to {isCreatingMode ? 'create' : 'apply'} configuration. Please check your settings.
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          {isCreatingMode ? (
            <Button
              onClick={handleCreateConfig}
              disabled={setConfigJson.isPending || !canCreateConfig}
            >
              {setConfigJson.isPending ? 'Creating...' : 'Create Configuration'}
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={setConfigJson.isPending}
            >
              {setConfigJson.isPending ? 'Applying...' : 'Apply'}
            </Button>
          )}
        </div>
      </div>
        </>
      )}

      {/* Auto Setup Dialog */}
      <AutoSetupDialog
        open={autoSetupDialogOpen}
        onOpenChange={setAutoSetupDialogOpen}
        unitId={unitId}
        onConfirm={handleAutoSetupConfirm}
      />
    </section>
  );
}
