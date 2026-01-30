export function wrapRadToPi(rad: number): number {
  const twoPi = 2 * Math.PI;
  let wrapped = rad % twoPi;
  if (wrapped >= Math.PI) wrapped -= twoPi;
  if (wrapped < -Math.PI) wrapped += twoPi;
  return wrapped;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
