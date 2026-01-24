import type { CamillaConfig, FilterConfig } from '../../types';

export type ChannelSide = 'input' | 'output';

export interface DeviceGroup {
  id: string;
  label: string;
}

export interface ProcessingSummary {
  biquadCount: number;
  hasDelay: boolean;
  hasGain: boolean;
  hasConv: boolean;
  hasCompressor: boolean;
  hasDither: boolean;
  hasNoiseGate: boolean;
  hasLoudness: boolean;
}

export interface ChannelProcessingFilter {
  name: string;
  config: FilterConfig;
}

export interface ChannelProcessing {
  filters: ChannelProcessingFilter[];
}

export interface ChannelNode {
  side: ChannelSide;
  deviceId: string;
  channelIndex: number;
  label: string;
  processing: ChannelProcessing;
  processingSummary: ProcessingSummary;
}

export interface RouteEndpoint {
  deviceId: string;
  channelIndex: number;
}

export interface RouteEdge {
  from: RouteEndpoint;
  to: RouteEndpoint;
  gain: number;
  inverted: boolean;
  mute: boolean;
}

export interface SignalFlowModel {
  inputGroups: DeviceGroup[];
  outputGroups: DeviceGroup[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  routes: RouteEdge[];
}

export type SignalFlowWarningCode =
  | 'missing_routing_mixer_config'
  | 'missing_routing_mixer_step'
  | 'non_canonical_mixers'
  | 'route_out_of_range'
  | 'route_wrong_device'
  | 'filter_out_of_range'
  | 'unresolved_filter'
  | 'global_filter_step';

export interface SignalFlowWarning {
  code: SignalFlowWarningCode;
  message: string;
  path?: string;
}

export interface FromConfigResult {
  model: SignalFlowModel;
  warnings: SignalFlowWarning[];
  representable: boolean;
}

export interface ToConfigResult {
  config: CamillaConfig;
  warnings: SignalFlowWarning[];
  representable: boolean;
}

export function emptyProcessingSummary(): ProcessingSummary {
  return {
    biquadCount: 0,
    hasDelay: false,
    hasGain: false,
    hasConv: false,
    hasCompressor: false,
    hasDither: false,
    hasNoiseGate: false,
    hasLoudness: false,
  };
}

export function emptyChannelProcessing(): ChannelProcessing {
  return { filters: [] };
}

export function processingSummaryFromFilters(filters: ChannelProcessingFilter[]): ProcessingSummary {
  const summary = emptyProcessingSummary();
  for (const filter of filters) {
    switch (filter.config.type) {
      case 'Biquad':
        summary.biquadCount += 1;
        break;
      case 'Delay':
        summary.hasDelay = true;
        break;
      case 'Gain':
        summary.hasGain = true;
        break;
      case 'Conv':
        summary.hasConv = true;
        break;
      case 'Compressor':
        summary.hasCompressor = true;
        break;
      case 'Dither':
        summary.hasDither = true;
        break;
      case 'NoiseGate':
        summary.hasNoiseGate = true;
        break;
      case 'Loudness':
        summary.hasLoudness = true;
        break;
      default:
        break;
    }
  }
  return summary;
}
