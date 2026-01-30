import type { ChannelLevelState } from './types';
import { DEFAULT_LEVEL } from './constants';
import { useLevels } from './useLevels';

export function useChannelLevel(
  wsManager: { send: <T>(cmd: string) => Promise<T> } | undefined,
  channel: 'capture' | 'playback',
  index: number,
  enabled = true,
): ChannelLevelState {
  const { levels } = useLevels({ wsManager, enabled });
  const channels = channel === 'capture' ? levels.capture : levels.playback;
  return channels[index] ?? DEFAULT_LEVEL;
}
