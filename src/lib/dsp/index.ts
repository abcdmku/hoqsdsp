export {
  calculateCoefficients,
  calculateComplexResponse,
  calculateResponse,
  calculateBiquadComplexResponse,
  calculateBiquadResponse,
  type BiquadCoefficients,
} from './biquad';

export {
  generateFrequencies,
  calculateFilterResponse,
  calculateCompositeResponse,
  formatFrequency,
  formatGain,
  FREQUENCY_POINTS,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  type FrequencyPoint,
} from './response';

export { designFir, calculateFirResponse, calculateFirComplexResponse, firMagnitudeAt, type ComplexFrequencyPoint, type FirDesignOptions, type FirShape, type FirWindowType } from './fir';

export { calculateFilterComplexResponse, calculateFilterChainComplexResponse } from './filterChain';

export type { Complex } from './complex';
export { COMPLEX_ONE, COMPLEX_ZERO, complexAbs, complexAdd, complexConj, complexDiv, complexExpj, complexFromPolar, complexMul, complexNormalize, complexScale, complexSub } from './complex';

export { groupDelaySeconds, phaseRad, unwrapPhase } from './phase';

export { designFirPhaseCorrection, type FirPhaseCorrectionBand, type FirPhaseCorrectionDesignOptions, type FirPhaseCorrectionDesignResult, type FirPhaseCorrectionMagnitudeGate } from './firPhaseCorrection';
