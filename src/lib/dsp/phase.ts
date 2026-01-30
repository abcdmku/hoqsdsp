import type { Complex } from './complex';

export function phaseRad(value: Complex): number {
  return Math.atan2(value.im, value.re);
}

export function unwrapPhase(phases: number[]): number[] {
  if (phases.length === 0) return [];
  const out = new Array<number>(phases.length);
  let prev = phases[0] ?? 0;
  let acc = prev;
  out[0] = acc;

  for (let i = 1; i < phases.length; i++) {
    const current = phases[i] ?? 0;
    let delta = current - prev;

    // Wrap delta to [-pi, pi)
    if (delta >= Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    acc += delta;
    out[i] = acc;
    prev = current;
  }

  return out;
}

export function groupDelaySeconds(unwrappedPhaseRad: number[], freqsHz: number[]): number[] {
  const n = Math.min(unwrappedPhaseRad.length, freqsHz.length);
  if (n === 0) return [];

  const out = new Array<number>(n).fill(0);
  if (n === 1) return out;

  const tauAt = (i0: number, i2: number): number => {
    const f0 = freqsHz[i0] ?? 0;
    const f2 = freqsHz[i2] ?? 0;
    const p0 = unwrappedPhaseRad[i0] ?? 0;
    const p2 = unwrappedPhaseRad[i2] ?? 0;

    const df = f2 - f0;
    if (df === 0) return 0;

    // dphi/df (rad/Hz), central difference using endpoints
    const dphiDf = (p2 - p0) / df;
    // tau = -dphi/dw = -(1/(2pi)) dphi/df
    return -dphiDf / (2 * Math.PI);
  };

  out[0] = tauAt(0, 1);
  for (let i = 1; i < n - 1; i++) {
    out[i] = tauAt(i - 1, i + 1);
  }
  out[n - 1] = tauAt(n - 2, n - 1);
  return out;
}
