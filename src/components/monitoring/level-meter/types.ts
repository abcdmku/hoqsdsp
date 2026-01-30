export interface LevelMeterProps {
  rms: number;
  peak: number;
  peakHold?: number;
  clippedSamples?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: number;
  showScale?: boolean;
  label?: string;
  onClippingReset?: () => void;
  className?: string;
}

export interface MultiChannelMeterProps {
  channels: {
    rms: number;
    peak: number;
    peakHold?: number;
    label?: string;
  }[];
  clippedSamples?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: number;
  showScale?: boolean;
  onClippingReset?: () => void;
  groupLabel?: string;
  className?: string;
}

export interface MeterBridgeProps {
  capture: {
    rms: number;
    peak: number;
    peakHold?: number;
  }[];
  playback: {
    rms: number;
    peak: number;
    peakHold?: number;
  }[];
  clippedSamples?: number;
  onClippingReset?: () => void;
  className?: string;
}
