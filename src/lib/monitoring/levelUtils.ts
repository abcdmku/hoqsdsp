export const DEFAULT_MIN_DB = -60;
export const DEFAULT_MAX_DB = 0;
export const DEFAULT_WARNING_DB = -12;
export const DEFAULT_CLIP_DB = -3;

export type MeterZone = 'safe' | 'warn' | 'clip';

export function clampDb(db: number, minDb = DEFAULT_MIN_DB, maxDb = DEFAULT_MAX_DB): number {
  return Math.max(minDb, Math.min(maxDb, db));
}

export function dbToPercent(db: number, minDb = DEFAULT_MIN_DB, maxDb = DEFAULT_MAX_DB): number {
  const clamped = clampDb(db, minDb, maxDb);
  return ((clamped - minDb) / (maxDb - minDb)) * 100;
}

export function clampPercent(percent: number, max = 99.9): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(max, percent));
}

export function meterZoneForDb(db: number, warningDb = DEFAULT_WARNING_DB, clipDb = DEFAULT_CLIP_DB): MeterZone {
  if (db > clipDb) return 'clip';
  if (db > warningDb) return 'warn';
  return 'safe';
}
