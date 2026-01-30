import { describe, expect, it } from 'vitest';
import { importFirFromText, importFirFromWav } from './firImport';

function buildWavPcm16Mono(samples: number[], sampleRate = 48000): ArrayBuffer {
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');

  // fmt chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const s of samples) {
    view.setInt16(offset, s, true);
    offset += 2;
  }

  return buffer;
}

function buildWavFloat32(
  channelsSamples: number[][],
  sampleRate = 48000,
): ArrayBuffer {
  const channels = channelsSamples.length;
  if (channels === 0) throw new Error('channelsSamples must include at least one channel');
  const frames = channelsSamples[0]!.length;
  for (let ch = 0; ch < channels; ch++) {
    if (channelsSamples[ch]?.length !== frames) {
      throw new Error('All channels must have the same number of frames');
    }
  }
  const bitsPerSample = 32;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');

  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true); // IEEE float
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let ch = 0; ch < channels; ch++) {
      const value = channelsSamples[ch]![frame]!;
      view.setFloat32(offset, value, true);
      offset += 4;
    }
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

describe('firImport', () => {
  describe('importFirFromText', () => {
    it('parses one coefficient per line', () => {
      const result = importFirFromText('0.1\n0.2\n0.3\n', 'coeffs.txt');
      expect(result.taps).toEqual([0.1, 0.2, 0.3]);
      expect(result.meta).toEqual({ source: 'text', filename: 'coeffs.txt' });
      expect(result.stats.peak).toBeCloseTo(0.3);
    });

    it('parses index/value columns by taking last number', () => {
      const text = [
        '# rePhase export',
        'Sample Rate: 48000 Hz',
        '0 0.1',
        '1 0.2',
        '2 0.3',
      ].join('\n');

      const result = importFirFromText(text, 'rephase.txt');
      expect(result.taps).toEqual([0.1, 0.2, 0.3]);
    });

    it('throws when no coefficients found', () => {
      expect(() => importFirFromText('hello world\n', 'bad.txt')).toThrow(
        /No coefficients/,
      );
    });
  });

  describe('importFirFromWav', () => {
    it('imports PCM16 mono samples', () => {
      const buffer = buildWavPcm16Mono([0, 16384, -16384], 44100);
      const result = importFirFromWav(buffer, 'impulse.wav');

      expect(result.meta.source).toBe('wav');
      expect(result.meta.filename).toBe('impulse.wav');
      expect(result.meta.sampleRate).toBe(44100);
      expect(result.meta.channels).toBe(1);
      expect(result.meta.bitDepth).toBe(16);
      expect(result.meta.format).toBe('pcm');

      expect(result.taps).toHaveLength(3);
      expect(result.taps[0]).toBeCloseTo(0);
      expect(result.taps[1]).toBeCloseTo(0.5, 5);
      expect(result.taps[2]).toBeCloseTo(-0.5, 5);
    });

    it('imports float32 stereo and selects channel', () => {
      const buffer = buildWavFloat32(
        [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        48000,
      );
      const result = importFirFromWav(buffer, 'stereo.wav', { channel: 1 });

      expect(result.meta.channels).toBe(2);
      expect(result.meta.format).toBe('float');
      expect(result.taps).toHaveLength(2);
      expect(result.taps[0]).toBeCloseTo(0.3, 6);
      expect(result.taps[1]).toBeCloseTo(0.4, 6);
    });

    it('normalizes peak when requested', () => {
      const buffer = buildWavFloat32([[0.5, -2.0]], 48000);
      const result = importFirFromWav(buffer, 'norm.wav', { normalize: true });

      expect(result.stats.peak).toBeCloseTo(1);
      expect(result.taps[0]).toBeCloseTo(0.25);
      expect(result.taps[1]).toBeCloseTo(-1);
    });
  });
});
