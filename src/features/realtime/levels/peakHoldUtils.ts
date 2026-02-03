import type { ChannelLevels } from '../../../types';
import { DEFAULT_LEVEL } from './constants';
import type { ChannelLevelState } from './types';

// Cache keys to avoid string allocation on every frame
const keyCache = new Map<string, string>();
function getKey(prefix: string, index: number): string {
  const cacheKey = `${prefix}-${index}`;
  let key = keyCache.get(cacheKey);
  if (!key) {
    key = cacheKey;
    keyCache.set(cacheKey, key);
  }
  return key;
}

export function updatePeakHold(
  channels: ChannelLevelState[],
  newLevels: ChannelLevels[],
  prefix: string,
  now: number,
  timestamps: Map<string, number>,
  decayMs: number,
  decayRate: number,
): ChannelLevelState[] {
  // Only allocate new array if something changed
  let result: ChannelLevelState[] | null = null;

  for (let index = 0; index < newLevels.length; index++) {
    const newLevel = newLevels[index];
    if (!newLevel) continue;

    const key = getKey(prefix, index);
    const existing = channels[index] ?? DEFAULT_LEVEL;
    const lastPeakTime = timestamps.get(key) ?? 0;

    let newPeakHold = existing.peakHold;
    if (newLevel.peak > newPeakHold) {
      newPeakHold = newLevel.peak;
      timestamps.set(key, now);
    } else if (now - lastPeakTime > decayMs) {
      newPeakHold = Math.max(newPeakHold - decayRate, newLevel.peak);
    }

    // Check if anything changed
    const changed = newLevel.peak !== existing.peak ||
                    newLevel.rms !== existing.rms ||
                    newPeakHold !== existing.peakHold;

    if (changed) {
      if (!result) {
        // Copy previous items unchanged, then we'll update this one
        result = channels.slice(0, index);
      }
      result.push({
        peak: newLevel.peak,
        rms: newLevel.rms,
        peakHold: newPeakHold,
      });
    } else if (result) {
      // No change but we already started a new array
      result.push(existing);
    }
  }

  return result ?? channels;
}

export function applyPeakHoldDecay(
  channels: ChannelLevelState[],
  prefix: string,
  now: number,
  timestamps: Map<string, number>,
  decayMs: number,
  decayRate: number,
): ChannelLevelState[] {
  let next: ChannelLevelState[] | null = null;

  for (let index = 0; index < channels.length; index++) {
    const ch = channels[index];
    if (!ch) continue;

    const key = getKey(prefix, index);
    const lastPeakTime = timestamps.get(key) ?? 0;
    if (now - lastPeakTime <= decayMs || ch.peakHold <= ch.peak) {
      continue;
    }

    if (!next) {
      next = channels.slice();
    }

    next[index] = { ...ch, peakHold: Math.max(ch.peakHold - decayRate, ch.peak) };
  }

  return next ?? channels;
}
