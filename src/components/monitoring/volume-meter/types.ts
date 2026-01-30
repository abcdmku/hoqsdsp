import type { VolumeMeterSize } from './constants';

export interface VolumeMeterProps {
  level: number;
  peak?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: VolumeMeterSize;
  mode?: 'gradient' | 'segmented';
  showScale?: boolean;
  showValue?: boolean;
  valuePosition?: 'top' | 'bottom' | 'left' | 'right';
  clipping?: boolean;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  flexible?: boolean;
  className?: string;
}

export interface StereoVolumeMeterProps {
  leftLevel: number;
  rightLevel: number;
  leftPeak?: number;
  rightPeak?: number;
  orientation?: 'vertical' | 'horizontal';
  size?: VolumeMeterSize;
  mode?: 'gradient' | 'segmented';
  showScale?: boolean;
  showValue?: boolean;
  clipping?: boolean;
  showChannelLabels?: boolean;
  className?: string;
}

export interface MultiChannelVolumeMeterProps {
  levels: number[];
  peaks?: number[];
  labels?: string[];
  orientation?: 'vertical' | 'horizontal';
  size?: VolumeMeterSize;
  mode?: 'gradient' | 'segmented';
  showScale?: boolean;
  clippingChannels?: boolean[];
  className?: string;
}
