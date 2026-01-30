export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function nextPowerOfTwo(n: number): number {
  if (!Number.isFinite(n) || n <= 1) return 1;
  let v = Math.ceil(n);
  if (isPowerOfTwo(v)) return v;
  v -= 1;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  // For n > 2^32, this won't work, but our use cases are well below that.
  return v + 1;
}

export function fftRadix2(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n !== im.length) throw new Error('re and im must have same length');
  if (!isPowerOfTwo(n)) throw new Error('FFT length must be power of two');
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tmpRe = re[i] ?? 0;
      const tmpIm = im[i] ?? 0;
      re[i] = re[j] ?? 0;
      im[i] = im[j] ?? 0;
      re[j] = tmpRe;
      im[j] = tmpIm;
    }

    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Cooley–Tukey decimation-in-time radix-2 FFT
  const sign = inverse ? 1 : -1;
  for (let size = 2; size <= n; size <<= 1) {
    const halfsize = size >> 1;
    const theta = sign * (2 * Math.PI / size);
    const wStepRe = Math.cos(theta);
    const wStepIm = Math.sin(theta);

    for (let start = 0; start < n; start += size) {
      let wRe = 1;
      let wIm = 0;

      for (let k = 0; k < halfsize; k++) {
        const i = start + k;
        const j2 = i + halfsize;

        const rRe = re[j2] ?? 0;
        const rIm = im[j2] ?? 0;

        const tRe = rRe * wRe - rIm * wIm;
        const tIm = rRe * wIm + rIm * wRe;

        const lRe = re[i] ?? 0;
        const lIm = im[i] ?? 0;

        re[i] = lRe + tRe;
        im[i] = lIm + tIm;
        re[j2] = lRe - tRe;
        im[j2] = lIm - tIm;

        const nextWRe = wRe * wStepRe - wIm * wStepIm;
        const nextWIm = wRe * wStepIm + wIm * wStepRe;
        wRe = nextWRe;
        wIm = nextWIm;
      }
    }
  }

  // Normalize inverse transform
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = (re[i] ?? 0) / n;
      im[i] = (im[i] ?? 0) / n;
    }
  }
}

