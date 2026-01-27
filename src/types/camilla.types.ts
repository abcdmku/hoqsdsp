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
  // Per-channel gains (stored separately since Gain filters are merged into mixer sources)
  // key: "input:channelIndex" or "output:channelIndex"
  channelGains?: Record<string, { gain: number; inverted: boolean }>;
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

// CamillaDSP pipeline steps have different formats:
// - Mixer: { type: 'Mixer', name: 'mixername' }
// - Filter: { type: 'Filter', names: ['filter1', 'filter2'], channels: [0, 1] }
export type PipelineStep = MixerPipelineStep | FilterPipelineStep;

export interface MixerPipelineStep {
  type: 'Mixer';
  name: string;
  description?: string;
  bypassed?: boolean;
}

export interface FilterPipelineStep {
  type: 'Filter';
  names: string[];
  channels?: number[];  // Optional - if omitted, applies to all channels
  description?: string;
  bypassed?: boolean;
}

// Re-export FilterConfig for convenience
export type { FilterConfig };
