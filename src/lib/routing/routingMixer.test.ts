import { describe, expect, it } from 'vitest';
import type { CamillaConfig, MixerConfig } from '../../types';
import { ensureRoutingMixerStep, normalizeRoutingMixer, patchConfigWithRoutingMixer } from './routingMixer';

describe('routingMixer', () => {
  describe('normalizeRoutingMixer', () => {
    it('filters out-of-range entries and normalizes optional fields', () => {
      const mixer: MixerConfig = {
        channels: { in: 99, out: 99 },
        mapping: [
          {
            dest: 1,
            sources: [
              { channel: 0, gain: 0, inverted: false, mute: true },
              { channel: 9, gain: 0 }, // out of range (channel)
            ],
          },
          {
            dest: 0,
            sources: [{ channel: 1, gain: 1, inverted: true, mute: false }],
          },
          {
            dest: 0,
            sources: [{ channel: 1, gain: 2 }], // duplicate (dest+channel), should override
          },
          {
            dest: 5,
            sources: [{ channel: 0, gain: 0 }], // out of range (dest)
          },
        ],
      };

      const result = normalizeRoutingMixer(mixer, 2, 2);

      expect(result.channels).toEqual({ in: 2, out: 2 });
      expect(result.mapping).toEqual([
        {
          dest: 0,
          sources: [{ channel: 1, gain: 2 }],
        },
        {
          dest: 1,
          sources: [{ channel: 0, gain: 0, mute: true }],
        },
      ]);
    });
  });

  describe('patchConfigWithRoutingMixer', () => {
    it('uses device channel counts as source of truth', () => {
      const config: CamillaConfig = {
        devices: {
          samplerate: 48000,
          chunksize: 1024,
          capture: { type: 'Alsa', channels: 4, device: 'hw:0' },
          playback: { type: 'Alsa', channels: 1, device: 'hw:0' },
        },
        mixers: {},
        pipeline: [],
      };

      const mixer: MixerConfig = {
        channels: { in: 2, out: 2 },
        mapping: [
          { dest: 0, sources: [{ channel: 0, gain: 0 }, { channel: 3, gain: 0 }] },
          { dest: 1, sources: [{ channel: 0, gain: 0 }] }, // out of range (dest)
        ],
      };

      const next = patchConfigWithRoutingMixer(config, mixer);

      expect(next.mixers?.routing?.channels).toEqual({ in: 4, out: 1 });
      expect(next.mixers?.routing?.mapping).toEqual([
        { dest: 0, sources: [{ channel: 0, gain: 0 }, { channel: 3, gain: 0 }] },
      ]);
    });
  });

  describe('ensureRoutingMixerStep', () => {
    it('adds the routing mixer step if missing', () => {
      const config: CamillaConfig = {
        devices: {
          samplerate: 48000,
          chunksize: 1024,
          capture: { type: 'Alsa', channels: 2, device: 'hw:0' },
          playback: { type: 'Alsa', channels: 2, device: 'hw:0' },
        },
        mixers: {
          routing: { channels: { in: 2, out: 2 }, mapping: [] },
        },
        pipeline: [],
      };

      const next = ensureRoutingMixerStep(config);
      expect(next.pipeline).toEqual([{ type: 'Mixer', name: 'routing' }]);

      const idempotent = ensureRoutingMixerStep(next);
      expect(idempotent.pipeline).toEqual([{ type: 'Mixer', name: 'routing' }]);
    });
  });
});

