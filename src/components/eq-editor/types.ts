import type { ReactNode } from 'react';
import type { BiquadParameters } from '../../types';

/** EQ band for the visual editor */
export interface EQBand {
  id: string;
  enabled: boolean;
  parameters: BiquadParameters;
}

/** EQ Editor props */
export interface EQEditorProps {
  /** The list of EQ bands to edit */
  bands: EQBand[];
  /** Callback when bands change */
  onChange: (bands: EQBand[]) => void;
  /** Sample rate for accurate frequency response calculation */
  sampleRate: number;
  /** Currently selected band index (null if none) */
  selectedBandIndex?: number | null;
  /** Callback when band selection changes */
  onSelectBand?: (index: number | null) => void;
  /** Optional className for the container */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Optional controls rendered in the top-right of the editor (e.g. close button) */
  topRightControls?: ReactNode;
}

/** Canvas dimensions and margins */
export interface CanvasDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

/** Point on the canvas */
export interface CanvasPoint {
  x: number;
  y: number;
}

/** EQ Node props */
export interface EQNodeProps {
  band: EQBand;
  index: number;
  isSelected: boolean;
  /** Used when dragging is handled outside of EQNode (e.g., click-to-add placement). */
  isExternalDragging?: boolean;
  dimensions: CanvasDimensions;
  onSelect: () => void;
  onDrag: (freq: number, gain: number) => void;
  onDragEnd: () => void;
  onQChange: (deltaQ: number) => void;
  disabled?: boolean;
}

/** Band selector props */
export interface BandSelectorProps {
  bands: EQBand[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onAdd: () => void;
  disabled?: boolean;
  topRightControls?: ReactNode;
}

/** Band parameters props */
export interface BandParametersProps {
  band: EQBand | null;
  onChange: (updates: Partial<BiquadParameters>) => void;
  disabled?: boolean;
}

/** Standard frequency markers for grid */
export const FREQUENCY_MARKERS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

/** Standard gain markers for grid (in dB) */
export const GAIN_MARKERS = [-24, -18, -12, -6, 0, 6, 12, 18, 24];

/** Minimum and maximum frequency */
export const MIN_FREQUENCY = 20;
export const MAX_FREQUENCY = 20000;

/** Minimum and maximum gain */
export const MIN_GAIN = -24;
export const MAX_GAIN = 24;

/** Color mapping for different band indices */
export const BAND_COLORS = [
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#a78bfa', // purple
  '#4ade80', // green
  '#fb923c', // orange
  '#60a5fa', // blue
  '#facc15', // yellow
  '#ef4444', // red
  '#e879f9', // fuchsia
];

/** Get color for a band by index */
export function getBandColor(index: number): string {
  return BAND_COLORS[index % BAND_COLORS.length] ?? '#22d3ee';
}

/** Convert frequency to X position on canvas (logarithmic scale) */
export function freqToX(freq: number, dimensions: CanvasDimensions): number {
  const { width, marginLeft, marginRight } = dimensions;
  const plotWidth = width - marginLeft - marginRight;
  const logMin = Math.log10(MIN_FREQUENCY);
  const logMax = Math.log10(MAX_FREQUENCY);
  const logFreq = Math.log10(Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, freq)));
  return marginLeft + ((logFreq - logMin) / (logMax - logMin)) * plotWidth;
}

/** Convert X position to frequency (logarithmic scale) */
export function xToFreq(x: number, dimensions: CanvasDimensions): number {
  const { width, marginLeft, marginRight } = dimensions;
  const plotWidth = width - marginLeft - marginRight;
  const logMin = Math.log10(MIN_FREQUENCY);
  const logMax = Math.log10(MAX_FREQUENCY);
  const ratio = (x - marginLeft) / plotWidth;
  const logFreq = logMin + ratio * (logMax - logMin);
  return Math.pow(10, logFreq);
}

/** Convert gain to Y position on canvas (linear scale) */
export function gainToY(gain: number, dimensions: CanvasDimensions): number {
  const { height, marginTop, marginBottom } = dimensions;
  const plotHeight = height - marginTop - marginBottom;
  const normalizedGain = (MAX_GAIN - gain) / (MAX_GAIN - MIN_GAIN);
  return marginTop + normalizedGain * plotHeight;
}

/** Convert Y position to gain (linear scale) */
export function yToGain(y: number, dimensions: CanvasDimensions): number {
  const { height, marginTop, marginBottom } = dimensions;
  const plotHeight = height - marginTop - marginBottom;
  const normalizedY = (y - marginTop) / plotHeight;
  return MAX_GAIN - normalizedY * (MAX_GAIN - MIN_GAIN);
}

/** Get frequency from biquad parameters */
export function getBandFrequency(params: BiquadParameters): number {
  if ('freq' in params) {
    return params.freq;
  }
  if ('freq_act' in params) {
    return params.freq_act;
  }
  return 1000;
}

/** Get gain from biquad parameters (0 for filters without gain) */
export function getBandGain(params: BiquadParameters): number {
  if ('gain' in params) {
    return params.gain;
  }
  return 0;
}

/** Get Q from biquad parameters */
export function getBandQ(params: BiquadParameters): number {
  if ('q' in params) {
    return params.q;
  }
  if ('slope' in params) {
    // Convert slope to approximate Q for visualization
    return 1 / params.slope;
  }
  return 0.707;
}

/** Check if biquad type has adjustable gain */
export function hasGain(type: BiquadParameters['type']): boolean {
  return ['Peaking', 'Lowshelf', 'Highshelf', 'LowshelfFO', 'HighshelfFO'].includes(type);
}

/** Check if biquad type has adjustable Q */
export function hasQ(type: BiquadParameters['type']): boolean {
  return ['Lowpass', 'Highpass', 'Peaking', 'Notch', 'Bandpass', 'Allpass'].includes(type);
}

/** Check if biquad type has adjustable slope */
export function hasSlope(type: BiquadParameters['type']): boolean {
  return ['Lowshelf', 'Highshelf'].includes(type);
}
