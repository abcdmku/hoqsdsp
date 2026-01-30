import type { ChannelLevels } from '../../../types';

export interface LevelState {
  capture: ChannelLevelState[];
  playback: ChannelLevelState[];
  clippedSamples: number;
  lastUpdated: number;
}

export interface ChannelLevelState extends ChannelLevels {
  peakHold: number;
}

export interface UseLevelsOptions {
  wsManager?: { send: <T>(cmd: string) => Promise<T> };
  enabled?: boolean;
  peakHoldDecay?: number;
  peakHoldDecayRate?: number;
  pollInterval?: number;
}

export interface UseLevelsResult {
  levels: LevelState;
  resetClipping: () => void;
  isPolling: boolean;
}
