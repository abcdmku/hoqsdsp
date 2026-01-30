import type { ChannelLevels } from '../../../types';
import { DEFAULT_LEVEL } from './constants';
import type { ChannelLevelState } from './types';

export function updatePeakHold(
  channels: ChannelLevelState[],
  newLevels: ChannelLevels[],
  prefix: string,
  now: number,
  timestamps: Map<string, number>,
  decayMs: number,
  decayRate: number,
): ChannelLevelState[] {
  return newLevels.map((newLevel, index) => {
    const key = `${prefix}-${index}`;
    const existing = channels[index] ?? DEFAULT_LEVEL;
    const lastPeakTime = timestamps.get(key) ?? 0;

    let newPeakHold = existing.peakHold;
    if (newLevel.peak > newPeakHold) {
      newPeakHold = newLevel.peak;
      timestamps.set(key, now);
    } else if (now - lastPeakTime > decayMs) {
      newPeakHold = Math.max(newPeakHold - decayRate, newLevel.peak);
    }

    return {
      peak: newLevel.peak,
      rms: newLevel.rms,
      peakHold: newPeakHold,
    };
  });
}

export function applyPeakHoldDecay(
  channels: ChannelLevelState[],
  prefix: string,
  now: number,
  timestamps: Map<string, number>,
  decayMs: number,
  decayRate: number,
): ChannelLevelState[] {
  let needsUpdate = false;
  const next = channels.map((ch, index) => {
    const key = `${prefix}-${index}`;
    const lastPeakTime = timestamps.get(key) ?? 0;
    if (now - lastPeakTime > decayMs && ch.peakHold > ch.peak) {
      needsUpdate = true;
      return { ...ch, peakHold: Math.max(ch.peakHold - decayRate, ch.peak) };
    }
    return ch;
  });

  return needsUpdate ? next : channels;
}
