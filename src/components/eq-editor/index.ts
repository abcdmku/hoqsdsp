export { EQEditor } from './EQEditor';
export type { EQEditorProps } from './types';
export { EQCanvas } from './EQCanvas';
export type { EQCanvasProps } from './EQCanvas';
export { EQNode } from './EQNode';
export { BandSelector } from './BandSelector';
export { BandParameters } from './BandParameters';
export {
  type EQBand,
  type CanvasDimensions,
  type BandSelectorProps,
  type BandParametersProps,
  FREQUENCY_MARKERS,
  GAIN_MARKERS,
  BAND_COLORS,
  getBandColor,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandFrequency,
  getBandGain,
  getBandQ,
  hasGain,
  hasQ,
  hasSlope,
} from './types';
