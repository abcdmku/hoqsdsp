export interface Complex {
  re: number;
  im: number;
}

export const COMPLEX_ONE: Complex = { re: 1, im: 0 };
export const COMPLEX_ZERO: Complex = { re: 0, im: 0 };

export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function complexSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function complexScale(a: Complex, scale: number): Complex {
  return { re: a.re * scale, im: a.im * scale };
}

export function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.im * b.re + a.re * b.im,
  };
}

export function complexConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

export function complexAbs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

export function complexDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return COMPLEX_ZERO;
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function complexFromPolar(magnitude: number, phaseRad: number): Complex {
  return { re: magnitude * Math.cos(phaseRad), im: magnitude * Math.sin(phaseRad) };
}

export function complexExpj(phaseRad: number): Complex {
  return complexFromPolar(1, phaseRad);
}

export function complexNormalize(a: Complex, eps = 1e-12): Complex {
  const mag = complexAbs(a);
  if (mag <= eps) return COMPLEX_ONE;
  return complexScale(a, 1 / mag);
}

