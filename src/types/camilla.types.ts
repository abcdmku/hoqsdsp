// CamillaDSP Configuration Types

import type { FilterConfig } from './filters.types';

// Signal Flow UI metadata - preserved by CamillaDSP but ignored by DSP engine
export interface SignalFlowUiMetadata {
  channelColors?: Record<string, string>;  // key: "input:deviceId:0" or "output:deviceId:1"
  channelNames?: Record<string, string>;   // custom display names
  mirrorGroups?: {
    input: { deviceId: string; channelIndex: number }[][];
    output: { deviceId: string; channelIndex: number }[][];
  };
}

export interface CamillaConfigUi {
  signalFlow?: SignalFlowUiMetadata;
}

export interface CamillaConfig {
  devices: DevicesConfig;
  mixers?: Record<string, MixerConfig>;
  filters?: Record<string, FilterConfig>;
  pipeline: PipelineStep[];
  title?: string;
  description?: string;
  ui?: CamillaConfigUi;  // UI metadata - ignored by CamillaDSP, preserved for UI
}

export interface DevicesConfig {
  samplerate: number;
  chunksize: number;
  capture: CaptureDevice;
  playback: PlaybackDevice;
  enable_rate_adjust?: boolean;
  target_level?: number;
  adjust_period?: number;
  resampler_type?: ResamplerType;
}

export interface CaptureDevice {
  type: string;
  channels: number;
  device?: string;
  format?: SampleFormat;
}

export interface PlaybackDevice {
  type: string;
  channels: number;
  device?: string;
  format?: SampleFormat;
}

export type SampleFormat = 'S16LE' | 'S24LE' | 'S24LE3' | 'S32LE' | 'FLOAT32LE' | 'FLOAT64LE';

export interface DeviceInfo {
  name: string | null;
  device: string;
}
export type ResamplerType = 'Synchronous' | 'AsyncSinc' | 'AsyncPoly';

export interface MixerConfig {
  channels: { in: number; out: number };
  mapping: MixerMapping[];
}

export interface MixerMapping {
  dest: number;
  sources: MixerSource[];
}

export interface MixerSource {
  channel: number;
  gain: number;
  inverted?: boolean;
  mute?: boolean;
}

export interface PipelineStep {
  type: 'Mixer' | 'Filter';
  name: string;
  channel?: number;
  channels?: number[];
}

// Re-export FilterConfig for convenience
export type { FilterConfig };
