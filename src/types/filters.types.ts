// Filter Configuration Types - Discriminated Union

export type FilterConfig =
  | BiquadFilter
  | ConvolutionFilter
  | DelayFilter
  | GainFilter
  | VolumeFilter
  | DitherFilter
  | DiffEqFilter
  | CompressorFilter
  | LoudnessFilter
  | NoiseGateFilter;

// Biquad Filter
export interface BiquadFilter {
  type: 'Biquad';
  parameters: BiquadParameters;
}

export type BiquadParameters =
  | { type: 'Lowpass'; freq: number; q: number }
  | { type: 'Highpass'; freq: number; q: number }
  | { type: 'LowpassFO'; freq: number }
  | { type: 'HighpassFO'; freq: number }
  | { type: 'Peaking'; freq: number; gain: number; q: number }
  | { type: 'Lowshelf'; freq: number; gain: number; slope: number }
  | { type: 'Highshelf'; freq: number; gain: number; slope: number }
  | { type: 'LowshelfFO'; freq: number; gain: number }
  | { type: 'HighshelfFO'; freq: number; gain: number }
  | { type: 'Notch'; freq: number; q: number }
  | { type: 'Bandpass'; freq: number; q: number }
  | { type: 'Allpass'; freq: number; q: number }
  | { type: 'AllpassFO'; freq: number }
  | { type: 'LinkwitzTransform'; freq_act: number; q_act: number; freq_target: number; q_target: number }
  | ButterworthParams
  | LinkwitzRileyParams;

export interface ButterworthParams {
  type: 'ButterworthLowpass' | 'ButterworthHighpass';
  freq: number;
  order: 2 | 4 | 6 | 8;
}

export interface LinkwitzRileyParams {
  type: 'LinkwitzRileyLowpass' | 'LinkwitzRileyHighpass';
  freq: number;
  order: 2 | 4 | 6 | 8;
}

// Convolution Filter
export interface ConvolutionFilter {
  type: 'Conv';
  parameters: ConvolutionParameters;
}

export type ConvolutionParameters =
  | { type: 'Raw'; filename: string; format?: string; skip_bytes_lines?: number; read_bytes_lines?: number }
  | { type: 'Wav'; filename: string; channel?: number }
  | { type: 'Values'; values: number[] };

// Delay Filter
export interface DelayFilter {
  type: 'Delay';
  parameters: DelayParameters;
}

export type DelayParameters =
  | { delay: number; unit: 'ms' | 'samples'; subsample: boolean }
  | { delay: number; unit: 'mm'; subsample: boolean };

// Gain Filter
export interface GainFilter {
  type: 'Gain';
  parameters: GainParameters;
}

export interface GainParameters {
  gain: number;
  inverted?: boolean;
  scale?: 'dB' | 'linear';
}

// Volume Filter (linked to faders)
export interface VolumeFilter {
  type: 'Volume';
  parameters: VolumeParameters;
}

export interface VolumeParameters {
  ramp_time?: number;
}

// Dither Filter
export interface DitherFilter {
  type: 'Dither';
  parameters: DitherParameters;
}

export interface DitherParameters {
  type: 'Simple' | 'Uniform' | 'Lipshitz441' | 'Fweighted441' | 'Shibata441' | 'Shibata48' | 'ShibataLow441' | 'ShibataLow48' | 'None';
  bits: number;
}

// DiffEq Filter (generic difference equation)
export interface DiffEqFilter {
  type: 'DiffEq';
  parameters: DiffEqParameters;
}

export interface DiffEqParameters {
  a: number[];
  b: number[];
}

// Compressor Filter
export interface CompressorFilter {
  type: 'Compressor';
  parameters: CompressorParameters;
}

export interface CompressorParameters {
  threshold: number;
  factor: number;
  attack: number;
  release: number;
  makeup_gain?: number;
  soft_clip?: boolean;
}

// Loudness Filter
export interface LoudnessFilter {
  type: 'Loudness';
  parameters: LoudnessParameters;
}

export interface LoudnessParameters {
  reference_level: number;
  high_boost: number;
  low_boost: number;
}

// NoiseGate Filter
export interface NoiseGateFilter {
  type: 'NoiseGate';
  parameters: NoiseGateParameters;
}

export interface NoiseGateParameters {
  threshold: number;
  attack: number;
  release: number;
  attenuation: number;
}

// Helper type for filter type discrimination
export type FilterType = FilterConfig['type'];
