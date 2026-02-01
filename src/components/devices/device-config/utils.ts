import { createMinimalConfig } from '../../../lib/config/createConfig';
import type { AutoConfigResult } from '../../../lib/devices';
import type { CamillaConfig, DeviceInfo } from '../../../types';
import type { DeviceFormState } from './types';

export function getFormStateFromConfig(config: CamillaConfig): DeviceFormState {
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

export function getDeviceLabel(device: DeviceInfo): string {
  return device.name ?? device.device;
}

export function buildUpdatedConfig(config: CamillaConfig, formState: DeviceFormState): CamillaConfig {
  const newInputChannels = formState.inputChannels;
  const newOutputChannels = formState.outputChannels;

  let updatedMixers = config.mixers;
  if (config.mixers?.routing) {
    const routingMixer = config.mixers.routing;
    const oldInChannels = routingMixer.channels.in;
    const oldOutChannels = routingMixer.channels.out;

    if (oldInChannels !== newInputChannels || oldOutChannels !== newOutputChannels) {
      const validMapping = routingMixer.mapping.filter(
        (m) => m.dest < newOutputChannels && m.sources.every((s) => s.channel < newInputChannels),
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

  return {
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
}

export function createConfigFromFormState(formState: DeviceFormState): CamillaConfig {
  if (!formState.inputBackend || !formState.outputBackend) {
    throw new Error('Input and output backends must be selected before creating a config.');
  }

  return createMinimalConfig({
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
}

export function createConfigFromAutoResult(result: AutoConfigResult): CamillaConfig {
  return createMinimalConfig({
    captureBackend: result.backend,
    captureDevice: result.deviceForConfig,
    captureChannels: result.channels,
    captureFormat: result.format,
    playbackBackend: result.backend,
    playbackDevice: result.deviceForConfig,
    playbackChannels: result.channels,
    playbackFormat: result.format,
    sampleRate: result.sampleRate,
    chunkSize: result.chunkSize,
  });
}
