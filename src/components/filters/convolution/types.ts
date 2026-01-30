export type FrequencyValuePoint = { frequency: number; value: number };

export interface FrequencySeries {
  id: string;
  label: string;
  colorClass: string;
  strokeDasharray?: string;
  points: FrequencyValuePoint[];
}

export type ConvolutionView = 'magnitude' | 'phase' | 'groupDelay' | 'impulse';

export interface HoverInfo {
  frequency: number;
  values: Record<string, number>;
}

export interface FirPreviewDesign {
  taps: number[] | null;
  error: string | null;
  warnings: string[];
}

export interface FirMagnitudeStats {
  minDb: number;
  maxDb: number;
  peakAbsDb: number;
}
