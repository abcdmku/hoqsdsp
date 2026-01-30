import type { ChannelLevelState, LevelState } from './types';

export const DEFAULT_LEVEL: ChannelLevelState = {
  peak: -60,
  rms: -60,
  peakHold: -60,
};

export const DEFAULT_STATE: LevelState = {
  capture: [],
  playback: [],
  clippedSamples: 0,
  lastUpdated: 0,
};
