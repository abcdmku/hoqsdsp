import type { CamillaConfig, MixerMapping, SampleFormat } from '../../types';

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
  // Create default 1:1 routing: input 0 → output 0, input 1 → output 1, etc.
  // This ensures audio flows through the mixer from the start
  const routeCount = Math.min(options.captureChannels, options.playbackChannels);
  const mapping: MixerMapping[] = Array.from({ length: routeCount }, (_, idx) => ({
    dest: idx,
    sources: [{ channel: idx, gain: 0 }],
  }));

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
    mixers: {
      routing: {
        channels: { in: options.captureChannels, out: options.playbackChannels },
        mapping,
      },
    },
    pipeline: [{ type: 'Mixer', name: 'routing' }],
  };
}
