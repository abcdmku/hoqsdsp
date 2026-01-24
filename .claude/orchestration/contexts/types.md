# Agent Context: Type Definitions

## Your Role
You are defining the TypeScript type system for the CamillaDSP Frontend. Your types will be used by all other agents, so accuracy and completeness are critical.

## Reference Documentation
- CamillaDSP WebSocket API: https://github.com/HEnquist/camilladsp/blob/master/websocket.md
- CamillaDSP Configuration: https://henquist.github.io/

## Task 1.2.1: CamillaDSP Configuration Types

Create `src/types/camilla.types.ts`:

```typescript
// Device Configuration
export interface CamillaConfig {
  devices: DevicesConfig;
  mixers?: Record<string, MixerConfig>;
  filters?: Record<string, FilterConfig>;
  pipeline: PipelineStep[];
  title?: string;
  description?: string;
}

export interface DevicesConfig {
  samplerate: number;
  chunksize: number;
  queuelimit?: number;
  silence_threshold?: number;
  silence_timeout?: number;
  target_level?: number;
  adjust_period?: number;
  enable_rate_adjust?: boolean;
  enable_resampling?: boolean;
  resampler_type?: ResamplerType;
  capture_samplerate?: number;
  capture: CaptureDevice;
  playback: PlaybackDevice;
}

export type CaptureDeviceType =
  | 'Alsa' | 'CoreAudio' | 'Wasapi' | 'Jack'
  | 'Pulse' | 'Bluez' | 'File' | 'Stdin'
  | 'Signalgenerator' | 'Wavfile';

export type PlaybackDeviceType =
  | 'Alsa' | 'CoreAudio' | 'Wasapi' | 'Jack'
  | 'Pulse' | 'File' | 'Stdout';

export type SampleFormat =
  | 'S16LE' | 'S24LE' | 'S24LE3' | 'S32LE'
  | 'FLOAT32LE' | 'FLOAT64LE';

export type ResamplerType =
  | 'Synchronous' | 'FastAsync' | 'BalancedAsync'
  | 'AccurateAsync' | 'FreeAsync';

// ... continue with all types
```

## Task 1.2.2: WebSocket Message Types

Create `src/types/websocket.types.ts`:

```typescript
// Commands (sent to CamillaDSP)
export type WSCommand =
  // No-argument commands
  | 'GetVersion'
  | 'GetState'
  | 'GetStopReason'
  | 'GetConfig'
  | 'GetConfigJson'
  | 'Reload'
  | 'Stop'
  | 'Exit'
  | 'GetVolume'
  | 'GetMute'
  | 'ToggleMute'
  | 'GetSignalLevels'
  | 'GetProcessingLoad'
  | 'GetBufferLevel'
  | 'GetCaptureRate'
  | 'GetRateAdjust'
  | 'GetClippedSamples'
  | 'ResetClippedSamples'
  | 'GetFaders'
  | 'GetSupportedDeviceTypes'
  // Commands with parameters
  | { SetConfig: string }
  | { SetConfigJson: string }
  | { ValidateConfig: string }
  | { ReadConfig: string }
  | { SetVolume: number }
  | { AdjustVolume: number | AdjustVolumeParams }
  | { SetMute: boolean }
  | { GetFaderVolume: FaderIndex }
  | { SetFaderVolume: SetFaderVolumeParams }
  | { AdjustFaderVolume: AdjustFaderVolumeParams }
  | { GetFaderMute: FaderIndex }
  | { SetFaderMute: SetFaderMuteParams }
  | { ToggleFaderMute: FaderIndex }
  | { SetUpdateInterval: number }
  | { GetSignalLevelsSince: number }
  | { GetAvailableCaptureDevices: string }
  | { GetAvailablePlaybackDevices: string };

export type FaderIndex = 0 | 1 | 2 | 3 | 4; // Main, Aux1-4

export interface AdjustVolumeParams {
  value: number;
  min?: number;
  max?: number;
}

// Response types
export interface WSResponse<T = unknown> {
  result: 'Ok' | 'Error';
  value?: T;
}

export type ProcessingState =
  | 'Running' | 'Paused' | 'Inactive' | 'Starting' | 'Stalled';

export type StopReason =
  | 'None' | 'Done' | 'CaptureError' | 'PlaybackError'
  | 'CaptureFormatChange' | 'PlaybackFormatChange';

export interface SignalLevels {
  playback_peak: number[];
  playback_rms: number[];
  capture_peak: number[];
  capture_rms: number[];
}

export interface FaderState {
  volume: number;
  mute: boolean;
}

export interface DeviceInfo {
  name: string | null;
  device: string;
}
```

## Task 1.2.3: UI State Types

Create `src/types/ui.types.ts`:

```typescript
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface DSPUnit {
  id: string;
  name: string;
  address: string;
  port: number;
  status: ConnectionStatus;
  version?: string;
  lastSeen?: number;
}

export interface UIState {
  activeUnitId: string | null;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  expertMode: boolean;
  activeModal: ModalType | null;
}

export type ModalType =
  | { type: 'addUnit' }
  | { type: 'editFilter'; filterId: string }
  | { type: 'editMixer'; mixerId: string }
  | { type: 'importConfig' }
  | { type: 'exportConfig' }
  | { type: 'settings' };
```

## Task 1.2.4: Filter Parameter Types

Create `src/types/filters.types.ts`:

```typescript
export type FilterConfig =
  | BiquadFilter
  | ConvolutionFilter
  | DelayFilter
  | GainFilter
  | VolumeFilter
  | DitherFilter
  | DiffEqFilter
  | CompressorFilter
  | LoudnessFilter
  | NoiseGateFilter;

export type BiquadType =
  | 'Highpass' | 'Lowpass' | 'Peaking' | 'Notch'
  | 'Bandpass' | 'Allpass' | 'Highshelf' | 'Lowshelf'
  | 'HighpassFO' | 'LowpassFO'
  | 'LinkwitzRileyHighpass' | 'LinkwitzRileyLowpass'
  | 'ButterworthHighpass' | 'ButterworthLowpass'
  | 'GeneralNotch' | 'Tilt' | 'FivePointPeq' | 'GraphicEqualizer'
  | 'Free';

export interface BiquadFilter {
  type: 'Biquad';
  parameters: BiquadParameters;
}

export interface BiquadParameters {
  type: BiquadType;
  freq?: number;
  q?: number;
  gain?: number;
  slope?: number;
  // For Free type (raw coefficients)
  a1?: number;
  a2?: number;
  b0?: number;
  b1?: number;
  b2?: number;
}

// ... Define all other filter types
```

## Quality Requirements
- Use discriminated unions for filter types
- All optional properties should have `?`
- Use `readonly` arrays where mutation is not needed
- Export type guards for runtime validation
- Include JSDoc comments for complex types

## Validation
Run `npm run typecheck` to ensure all types compile correctly.
