import type { CamillaConfig, SampleFormat } from '../../types';

export interface MinimalConfigOptions {
  captureDevice: string;
  captureBackend: string;
  captureChannels: number;
  captureFormat: SampleFormat;
  playbackDevice: string;
  playbackBackend: string;
  playbackChannels: number;
  playbackFormat: SampleFormat;
  sampleRate: number;
  chunkSize: number;
}

export function createMinimalConfig(options: MinimalConfigOptions): CamillaConfig {
  return {
    devices: {
      samplerate: options.sampleRate,
      chunksize: options.chunkSize,
      capture: {
        type: options.captureBackend,
        channels: options.captureChannels,
        device: options.captureDevice,
        format: options.captureFormat,
      },
      playback: {
        type: options.playbackBackend,
        channels: options.playbackChannels,
        device: options.playbackDevice,
        format: options.playbackFormat,
      },
    },
    pipeline: [],
  };
}
