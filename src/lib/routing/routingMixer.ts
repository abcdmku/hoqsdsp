import type { CamillaConfig, MixerConfig, MixerMapping, MixerSource } from '../../types';

const ROUTING_MIXER_NAME = 'routing';

export function createDefaultRoutingMixer(inChannels: number, outChannels: number): MixerConfig {
  const routeCount = Math.min(inChannels, outChannels);
  const mapping: MixerMapping[] = Array.from({ length: routeCount }, (_, idx) => ({
    dest: idx,
    sources: [{ channel: idx, gain: 0 }],
  }));

  return {
    channels: { in: inChannels, out: outChannels },
    mapping,
  };
}

export function normalizeRoutingMixer(mixer: MixerConfig, inChannels: number, outChannels: number): MixerConfig {
  const byDest = new Map<number, Map<number, MixerSource>>();

  for (const entry of mixer.mapping) {
    if (!Number.isFinite(entry.dest)) continue;
    const dest = entry.dest;
    if (dest < 0 || dest >= outChannels) continue;

    const byChannel = byDest.get(dest) ?? new Map<number, MixerSource>();
    for (const rawSource of entry.sources) {
      if (!Number.isFinite(rawSource.channel)) continue;
      const channel = rawSource.channel;
      if (channel < 0 || channel >= inChannels) continue;

      const gain = typeof rawSource.gain === 'number' && Number.isFinite(rawSource.gain) ? rawSource.gain : 0;
      byChannel.set(channel, {
        channel,
        gain,
        ...(rawSource.inverted ? { inverted: true } : {}),
        ...(rawSource.mute ? { mute: true } : {}),
      });
    }

    if (byChannel.size > 0) {
      byDest.set(dest, byChannel);
    }
  }

  const mapping: MixerMapping[] = [...byDest.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dest, sourcesByChannel]) => ({
      dest,
      sources: [...sourcesByChannel.values()].sort((a, b) => a.channel - b.channel),
    }));

  return {
    channels: { in: inChannels, out: outChannels },
    mapping,
  };
}

export function patchConfigWithRoutingMixer(config: CamillaConfig, mixer: MixerConfig): CamillaConfig {
  const inChannels = config.devices.capture.channels;
  const outChannels = config.devices.playback.channels;

  const normalized = normalizeRoutingMixer(mixer, inChannels, outChannels);

  return {
    ...config,
    mixers: {
      ...(config.mixers ?? {}),
      [ROUTING_MIXER_NAME]: normalized,
    },
  };
}

export function ensureRoutingMixerStep(config: CamillaConfig): CamillaConfig {
  const hasRoutingStep = config.pipeline.some((step) => step.type === 'Mixer' && step.name === ROUTING_MIXER_NAME);
  if (hasRoutingStep) return config;

  return {
    ...config,
    pipeline: [...config.pipeline, { type: 'Mixer', name: ROUTING_MIXER_NAME }],
  };
}

