import type { SampleFormat } from '../../../types';

export interface DeviceFormState {
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

export type ConfigMode = 'selection' | 'manual' | null;
