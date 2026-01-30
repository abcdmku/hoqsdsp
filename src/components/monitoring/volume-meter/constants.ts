export const SIZE_PRESETS = {
  xs: { width: 4, height: 24, barWidth: 2, fontSize: 8 },
  sm: { width: 8, height: 40, barWidth: 4, fontSize: 9 },
  md: { width: 12, height: 64, barWidth: 6, fontSize: 10 },
  lg: { width: 20, height: 120, barWidth: 10, fontSize: 11 },
} as const;

export type VolumeMeterSize = keyof typeof SIZE_PRESETS;

export interface MeterGridLine {
  db: number;
  opacity: number;
  thicknessPx: number;
}

function buildGridLines(major: number[], minor: number[]): MeterGridLine[] {
  const map = new Map<number, MeterGridLine>();
  for (const db of major) {
    map.set(db, { db, opacity: 0.28, thicknessPx: 1 });
  }
  for (const db of minor) {
    if (!map.has(db)) {
      map.set(db, { db, opacity: 0.14, thicknessPx: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.db - b.db);
}

const GRID_LINES: Record<VolumeMeterSize, MeterGridLine[]> = {
  xs: buildGridLines([-60, -12, 0], []),
  sm: buildGridLines([-60, -24, -12, 0], [-48, -36, -18, -6]),
  md: buildGridLines([-60, -36, -12, -3, 0], [-48, -24, -18, -6]),
  lg: buildGridLines(
    [-60, -48, -36, -24, -12, -6, -3, 0],
    [-54, -42, -30, -21, -18, -15, -9],
  ),
};

export function getGridLines(size: VolumeMeterSize): MeterGridLine[] {
  return GRID_LINES[size];
}

export function getScaleMarks(size: VolumeMeterSize): number[] {
  if (size === 'lg') return [-60, -48, -36, -24, -12, -6, -3, 0];
  if (size === 'md') return [-60, -36, -12, -3, 0];
  return [-60, -12, 0];
}

export function getSegmentCount(size: VolumeMeterSize): number {
  if (size === 'lg') return 24;
  if (size === 'md') return 16;
  if (size === 'sm') return 10;
  return 6;
}
