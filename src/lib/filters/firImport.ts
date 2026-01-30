export type FirImportSourceType = 'wav' | 'text';

export interface FirImportMeta {
  source: FirImportSourceType;
  filename: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  format?: 'pcm' | 'float' | 'unknown';
}

export interface FirImportStats {
  min: number;
  max: number;
  peak: number;
}

export interface FirImportResult {
  taps: number[];
  meta: FirImportMeta;
  stats: FirImportStats;
}

const RIFF_MAGIC = 0x46464952; // 'RIFF' (LE)
const WAVE_MAGIC = 0x45564157; // 'WAVE' (LE)

const FMT_CHUNK = 0x20746d66; // 'fmt ' (LE)
const DATA_CHUNK = 0x61746164; // 'data' (LE)

const WAVE_FORMAT_PCM = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT = 0x0003;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;

export function importFirFromText(
  text: string,
  filename = 'coefficients.txt',
): FirImportResult {
  const lines = text.split(/\r?\n/);
  const taps: number[] = [];

  for (const rawLine of lines) {
    const lineWithoutComment = rawLine.replace(/(#|\/\/).*$/, '').trim();
    if (!lineWithoutComment) continue;

    // Skip header-ish lines (keep e/E for scientific notation)
    if (/[a-df-zA-DF-Z]/.test(lineWithoutComment)) continue;

    const matches = lineWithoutComment.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
    if (!matches || matches.length === 0) continue;

    const value = Number.parseFloat(matches[matches.length - 1]!);
    if (!Number.isFinite(value)) continue;

    taps.push(value);
  }

  if (taps.length === 0) {
    throw new Error('No coefficients found in text');
  }

  return {
    taps,
    meta: { source: 'text', filename },
    stats: computeFirStats(taps),
  };
}

export interface ImportFirFromWavOptions {
  channel?: number;
  /** If enabled, scales taps so peak(|x|) becomes 1.0 (if peak > 0). */
  normalize?: boolean;
}

export function importFirFromWav(
  buffer: ArrayBuffer,
  filename = 'impulse.wav',
  options: ImportFirFromWavOptions = {},
): FirImportResult {
  const view = new DataView(buffer);
  if (view.byteLength < 12) {
    throw new Error('Invalid WAV: file too small');
  }

  const riff = view.getUint32(0, true);
  const wave = view.getUint32(8, true);
  if (riff !== RIFF_MAGIC || wave !== WAVE_MAGIC) {
    throw new Error('Invalid WAV: missing RIFF/WAVE header');
  }

  let fmtOffset: number | null = null;
  let fmtSize = 0;
  let dataOffset: number | null = null;
  let dataSize = 0;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const chunkId = view.getUint32(offset, true);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkDataOffset + chunkSize > view.byteLength) {
      throw new Error('Invalid WAV: chunk size exceeds file length');
    }

    if (chunkId === FMT_CHUNK) {
      fmtOffset = chunkDataOffset;
      fmtSize = chunkSize;
    } else if (chunkId === DATA_CHUNK) {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    // Chunks are word-aligned
    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (fmtOffset === null) throw new Error('Invalid WAV: missing fmt chunk');
  if (dataOffset === null) throw new Error('Invalid WAV: missing data chunk');
  if (fmtSize < 16) throw new Error('Invalid WAV: fmt chunk too small');

  const baseAudioFormat = view.getUint16(fmtOffset, true);
  const numChannels = view.getUint16(fmtOffset + 2, true);
  const sampleRate = view.getUint32(fmtOffset + 4, true);
  const blockAlign = view.getUint16(fmtOffset + 12, true);
  const bitsPerSample = view.getUint16(fmtOffset + 14, true);

  let audioFormat = baseAudioFormat;
  if (baseAudioFormat === WAVE_FORMAT_EXTENSIBLE) {
    // WAVE_FORMAT_EXTENSIBLE (requires 40-byte fmt chunk)
    if (fmtSize < 40) throw new Error('Invalid WAV: extensible fmt chunk too small');
    const subFormat = view.getUint32(fmtOffset + 24, true);
    if (subFormat === WAVE_FORMAT_PCM || subFormat === WAVE_FORMAT_IEEE_FLOAT) {
      audioFormat = subFormat;
    } else {
      audioFormat = 0;
    }
  }

  if (numChannels === 0) throw new Error('Invalid WAV: channels must be > 0');
  if (blockAlign === 0) throw new Error('Invalid WAV: blockAlign must be > 0');

  const channel = options.channel ?? 0;
  if (!Number.isInteger(channel) || channel < 0 || channel >= numChannels) {
    throw new Error(`Invalid WAV: channel ${String(channel)} out of range (0-${String(numChannels - 1)})`);
  }

  const bytesPerFrame = blockAlign;
  const totalFrames = Math.floor(dataSize / bytesPerFrame);
  if (totalFrames <= 0) throw new Error('Invalid WAV: no samples found');

  const bytesPerSample = Math.floor(bytesPerFrame / numChannels);
  if (bytesPerSample <= 0) throw new Error('Invalid WAV: invalid bytes per sample');

  const taps = new Array<number>(totalFrames);

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let peak = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const sampleOffset = dataOffset + frame * bytesPerFrame + channel * bytesPerSample;
    const value = readWavSample(view, sampleOffset, audioFormat, bitsPerSample);

    taps[frame] = value;
    if (value < min) min = value;
    if (value > max) max = value;
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
  }

  if (options.normalize && peak > 0) {
    const scale = 1 / peak;
    min *= scale;
    max *= scale;
    peak = 1;
    for (let i = 0; i < taps.length; i++) {
      taps[i] = taps[i]! * scale;
    }
  }

  return {
    taps,
    meta: {
      source: 'wav',
      filename,
      sampleRate,
      channels: numChannels,
      bitDepth: bitsPerSample,
      format:
        audioFormat === WAVE_FORMAT_PCM
          ? 'pcm'
          : audioFormat === WAVE_FORMAT_IEEE_FLOAT
            ? 'float'
            : 'unknown',
    },
    stats: { min, max, peak },
  };
}

function readWavSample(
  view: DataView,
  offset: number,
  audioFormat: number,
  bitsPerSample: number,
): number {
  if (audioFormat === WAVE_FORMAT_IEEE_FLOAT) {
    if (bitsPerSample === 32) return view.getFloat32(offset, true);
    if (bitsPerSample === 64) return view.getFloat64(offset, true);
    throw new Error(`Unsupported WAV float bit depth: ${String(bitsPerSample)}`);
  }

  if (audioFormat === WAVE_FORMAT_PCM) {
    switch (bitsPerSample) {
      case 8: {
        // 8-bit PCM is unsigned
        const v = view.getUint8(offset);
        return (v - 128) / 128;
      }
      case 16:
        return view.getInt16(offset, true) / 32768;
      case 24: {
        // 24-bit little-endian signed integer (3 bytes)
        const b0 = view.getUint8(offset);
        const b1 = view.getUint8(offset + 1);
        const b2 = view.getUint8(offset + 2);
        let v = b0 | (b1 << 8) | (b2 << 16);
        // Sign extend from 24 to 32 bits
        if (v & 0x800000) v |= 0xff000000;
        return v / 8388608; // 2^23
      }
      case 32:
        return view.getInt32(offset, true) / 2147483648;
      default:
        throw new Error(`Unsupported WAV PCM bit depth: ${String(bitsPerSample)}`);
    }
  }

  throw new Error(`Unsupported WAV format: ${String(audioFormat)}`);
}

function computeFirStats(taps: number[]): FirImportStats {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let peak = 0;

  for (const v of taps) {
    if (v < min) min = v;
    if (v > max) max = v;
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
  }

  return { min, max, peak };
}
