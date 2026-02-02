// WebSocket Communication Types

// Commands (sent to CamillaDSP)
export type WSCommand =
  | 'GetVersion'
  | 'GetState'
  | 'GetConfig'
  | 'GetConfigJson'
  | 'GetConfigName'
  | 'GetPreviousConfig'
  | 'GetSignalLevels'
  | 'GetSignalLevelsSinceLast'
  | 'GetSignalPeaksSinceLast'
  | 'GetSignalRange'
  | 'GetCaptureSignalPeak'
  | 'GetPlaybackSignalPeak'
  | 'GetCaptureSignalRms'
  | 'GetPlaybackSignalRms'
  | 'GetCaptureSampleRate'
  | 'GetUpdateInterval'
  | 'GetRateAdjust'
  | 'GetBufferLevel'
  | 'GetClippedSamples'
  | 'GetProcessingLoad'
  | 'GetVolume'
  | 'GetMute'
  | 'GetSupportedDeviceTypes'
  | { GetAvailableCaptureDevices: string }
  | { GetAvailablePlaybackDevices: string }
  | 'Stop'
  | 'Exit'
  | { SetConfig: string }
  | { SetConfigJson: string }
  | { SetConfigName: string }
  | { SetVolume: number }
  | { SetMute: boolean }
  | { SetUpdateInterval: number }
  | { Reload: string | null }
  | { GetFaderVolume: number }
  | { SetFaderVolume: { fader: number; vol: number } }
  | { GetFaderMute: number }
  | { SetFaderMute: { fader: number; mute: boolean } }
  | { GetFadersVolume: number[] }
  | { SetFadersVolume: { fader: number; vol: number }[] }
  | { AdjustFadersVolume: { fader: number; vol: number }[] };

// Response wrappers
// CamillaDSP v3 uses an externally-tagged response keyed by command name,
// and an inner enum-like object with either `Ok` or `Err`/`Error`.
// Example: {"GetVersion": {"Ok": "3.0.0"}}
//          {"GetVersion": {"Err": "Command failed"}}
//          {"GetVersion": {"Error": "Command failed"}}
export type WSResponse<T = unknown> = { Ok: T } | { Err: unknown } | { Error: unknown };

// Back-compat: some implementations/older versions used a {result,value} wrapper.
export interface WSLegacyResponse<T = unknown> {
  result: 'Ok' | 'Error';
  value?: T;
}

export type WSWrappedResponse = Record<string, WSResponse | WSLegacyResponse>;

// Processing state
export type ProcessingState =
  | 'Running'
  | 'Paused'
  | 'Inactive'
  | 'Starting'
  | 'Stalled';

// Signal levels - raw response from CamillaDSP API
export interface SignalLevelsRaw {
  capture_peak: number[];
  capture_rms: number[];
  playback_peak: number[];
  playback_rms: number[];
}

// Signal levels - normalized format for the app
export interface SignalLevels {
  capture: ChannelLevels[];
  playback: ChannelLevels[];
}

export interface ChannelLevels {
  peak: number;
  rms: number;
}

/** Transform raw CamillaDSP signal levels to normalized format */
export function normalizeSignalLevels(raw: SignalLevelsRaw): SignalLevels {
  const captureCount = Math.max(raw.capture_peak?.length ?? 0, raw.capture_rms?.length ?? 0);
  const playbackCount = Math.max(raw.playback_peak?.length ?? 0, raw.playback_rms?.length ?? 0);

  const capture: ChannelLevels[] = [];
  for (let i = 0; i < captureCount; i++) {
    capture.push({
      peak: raw.capture_peak?.[i] ?? -100,
      rms: raw.capture_rms?.[i] ?? -100,
    });
  }

  const playback: ChannelLevels[] = [];
  for (let i = 0; i < playbackCount; i++) {
    playback.push({
      peak: raw.playback_peak?.[i] ?? -100,
      rms: raw.playback_rms?.[i] ?? -100,
    });
  }

  return { capture, playback };
}

/**
 * Normalize CamillaDSP buffer level to a percentage (0-100).
 *
 * CamillaDSP returns different units depending on version/config:
 * - Fraction (0..1)
 * - Percent (0..100)
 * - Per-mille (0..1000) commonly seen with rate adjust enabled
 */
export function normalizeBufferLevel(raw: number): number {
  if (!Number.isFinite(raw)) return 0;

  let percent: number;
  if (raw <= 1) {
    percent = raw * 100;
  } else if (raw <= 100) {
    percent = raw;
  } else if (raw <= 1000) {
    percent = raw / 10;
  } else {
    // Unknown scale (some implementations may return raw samples).
    // Clamp to keep UI sane rather than rendering huge percentages.
    percent = 100;
  }

  return Math.max(0, Math.min(100, percent));
}

// Signal range (min/max since last query)
export interface SignalRange {
  capture: ChannelRange[];
  playback: ChannelRange[];
}

export interface ChannelRange {
  peak_range: [number, number];
  rms_range: [number, number];
}

// Connection status for manager
export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// Pending request tracking
export interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  command: WSCommand;
}

// Priority levels for message queue
export type MessagePriority = 'high' | 'normal' | 'low';

export interface QueuedMessage {
  command: WSCommand;
  priority: MessagePriority;
  timestamp: number;
}
