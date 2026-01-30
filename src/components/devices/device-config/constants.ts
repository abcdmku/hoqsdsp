import type { SampleFormat } from '../../../types';
import type { DeviceFormState } from './types';

export const SAMPLE_FORMATS: SampleFormat[] = [
  'S16LE',
  'S24LE',
  'S24LE3',
  'S32LE',
  'FLOAT32LE',
  'FLOAT64LE',
];

export const COMMON_SAMPLE_RATES = [44100, 48000, 88200, 96000, 176400, 192000];
export const COMMON_CHUNK_SIZES = [256, 512, 1024, 2048, 4096];

export const DEFAULT_FORM_STATE: DeviceFormState = {
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
