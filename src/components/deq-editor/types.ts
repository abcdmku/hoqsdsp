import type { BiquadParameters, DeqBandDynamicsUiSettingsV1 } from '../../types';
import { hasGain } from '../eq-editor/types';

export interface DeqBand {
  id: string;
  enabled: boolean;
  parameters: BiquadParameters;
  dynamics: Required<DeqBandDynamicsUiSettingsV1>;
}

export const DEFAULT_DEQ_DYNAMICS: Required<DeqBandDynamicsUiSettingsV1> = {
  enabled: false,
  mode: 'downward',
  rangeDb: 6,
  thresholdDb: -24,
  ratio: 2,
  attackMs: 10,
  releaseMs: 150,
};

export function normalizeDeqDynamics(
  dynamics?: DeqBandDynamicsUiSettingsV1,
): Required<DeqBandDynamicsUiSettingsV1> {
  return {
    ...DEFAULT_DEQ_DYNAMICS,
    ...(dynamics ?? {}),
  };
}

export function applyDynamicsExtreme(
  params: BiquadParameters,
  dynamics: Required<DeqBandDynamicsUiSettingsV1>,
): BiquadParameters {
  if (!dynamics.enabled) return params;
  if (!hasGain(params.type)) return params;
  if (!('gain' in params)) return params;
  const range = Number.isFinite(dynamics.rangeDb) ? dynamics.rangeDb : 0;
  const delta = dynamics.mode === 'upward' ? range : -range;
  return { ...params, gain: params.gain + delta };
}

