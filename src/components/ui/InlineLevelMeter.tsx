import * as React from 'react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface InlineLevelMeterProps {
  /** Level in dB */
  level: number;
  /** Peak hold level in dB */
  peakHold?: number;
  /** Minimum dB value for the meter range (default: -100) */
  minDb?: number;
  /** Maximum dB value for the meter range (default: 0) */
  maxDb?: number;
  /** Show the dB value */
  showValue?: boolean;
  /** Position of the dB value */
  valuePosition?: 'left' | 'right' | 'top' | 'bottom';
  /** Orientation of the meter bar */
  orientation?: 'horizontal' | 'vertical';
  /** Show scale labels for the tick marks */
  showScale?: boolean;
  /** Custom dB scale marks (defaults to a sensible technical set) */
  scaleMarks?: number[];
  /** Position of the scale labels */
  scalePosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Smoothing time in milliseconds (0 = no smoothing) */
  smoothingMs?: number;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for the meter bar container */
  meterClassName?: string;
}

/**
 * Hook to smooth a value over time using exponential decay
 */
function useSmoothedValue(targetValue: number, smoothingMs: number): number {
  const [smoothedValue, setSmoothedValue] = useState(targetValue);
  const targetRef = useRef(targetValue);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    targetRef.current = targetValue;
  }, [targetValue]);

  useEffect(() => {
    if (smoothingMs <= 0) return;

    lastTimeRef.current = performance.now();

    const animate = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setSmoothedValue((current) => {
        // If target is at minimum (no signal), decay slowly
        // If target is higher, rise quickly
        const target = targetRef.current;
        const isRising = target > current;
        // Rise time is faster (1/4 of smoothing), fall time uses full smoothing
        const effectiveSmoothing = isRising ? smoothingMs / 4 : smoothingMs;

        // Exponential smoothing factor
        const alpha = 1 - Math.exp(-deltaTime / effectiveSmoothing);
        const newValue = current + alpha * (target - current);

        // Snap to target if very close
        if (Math.abs(newValue - target) < 0.1) {
          return target;
        }

        return newValue;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [smoothingMs]);

  return smoothingMs > 0 ? smoothedValue : targetValue;
}

/**
 * Format dB value for display
 */
function formatDb(db: number, minDb: number): string {
  if (db <= minDb) return '-∞';
  if (db > 0) return `+${db.toFixed(1)}`;
  return db.toFixed(1);
}

/**
 * Get color for level
 */
function getLevelColor(db: number): string {
  if (db > -3) return 'var(--color-meter-red)';
  if (db > -12) return 'linear-gradient(to right, var(--color-meter-green), var(--color-meter-yellow))';
  return 'var(--color-meter-green)';
}

/**
 * Get vertical color gradient
 */
function getVerticalLevelColor(db: number): string {
  if (db > -3) return 'var(--color-meter-red)';
  if (db > -12) return 'linear-gradient(to top, var(--color-meter-green), var(--color-meter-yellow))';
  return 'var(--color-meter-green)';
}

interface MeterGridLine {
  db: number;
  opacity: number;
}

function getDefaultGridLines(minDb: number, maxDb: number): MeterGridLine[] {
  const candidates = [maxDb, 6, 3, 0, -3, -6, -12, -20, -40, -60, minDb];
  const unique = Array.from(new Set(candidates));

  return unique
    .filter((db) => db >= minDb && db <= maxDb)
    .sort((a, b) => a - b)
    .map((db) => ({
      db,
      opacity: db === maxDb || db === minDb || db === -20 || db === -40 || db === -60 ? 0.22 : 0.12,
    }));
}

function formatScaleDb(db: number): string {
  if (db === 0) return '0';
  if (db > 0) return `+${String(db)}`;
  return String(db);
}

/**
 * Inline level meter component with optional dB value display.
 * Designed for use in compact UIs like channel cards.
 */
export const InlineLevelMeter = React.memo(function InlineLevelMeter({
  level,
  peakHold,
  minDb = -100,
  maxDb = 0,
  showValue = false,
  valuePosition = 'right',
  orientation = 'horizontal',
  showScale = false,
  scaleMarks,
  scalePosition,
  smoothingMs = 0,
  className,
  meterClassName,
}: InlineLevelMeterProps) {
  // Apply smoothing to the level value
  const smoothedLevel = useSmoothedValue(level, smoothingMs);

  const range = maxDb - minDb;
  const levelPercent = Math.max(0, Math.min(100, ((smoothedLevel - minDb) / range) * 100));
  const peakPercent = peakHold !== undefined
    ? Math.max(0, Math.min(100, ((peakHold - minDb) / range) * 100))
    : undefined;

  const gridLines = useMemo(() => getDefaultGridLines(minDb, maxDb), [minDb, maxDb]);
  const effectiveScaleMarks = useMemo(() => {
    if (scaleMarks && scaleMarks.length > 0) {
      return scaleMarks.filter((db) => db >= minDb && db <= maxDb).sort((a, b) => a - b);
    }
    return gridLines.map((l) => l.db);
  }, [gridLines, maxDb, minDb, scaleMarks]);

  const isHorizontal = orientation === 'horizontal';
  const isVerticalLayout = valuePosition === 'top' || valuePosition === 'bottom';
  const effectiveScalePosition = scalePosition ?? (isHorizontal ? 'bottom' : 'right');
  const normalizedScalePosition: InlineLevelMeterProps['scalePosition'] = isHorizontal
    ? (effectiveScalePosition === 'top' ? 'top' : 'bottom')
    : (effectiveScalePosition === 'left' ? 'left' : 'right');

  const valueElement = showValue && (
    <span
      className={cn(
        'font-mono text-[12px] tabular-nums text-dsp-text-muted shrink-0',
        smoothedLevel > -3 && 'text-meter-red',
        // Width for consistent alignment
        isHorizontal ? (isVerticalLayout ? 'w-full text-center' : 'w-10 text-right') : 'text-center'
      )}
    >
      {formatDb(smoothedLevel, minDb)}
    </span>
  );

  const scaleElement = showScale && effectiveScaleMarks.length > 0 && (
    <div
      className={cn(
        'pointer-events-none relative font-mono tabular-nums text-[9px] leading-none text-dsp-text-muted',
        isHorizontal ? 'h-4 w-full' : 'h-full w-8'
      )}
      aria-hidden="true"
    >
      {effectiveScaleMarks.map((db) => {
        const percentRaw = ((db - minDb) / range) * 100;
        const percent = Math.max(0, Math.min(100, percentRaw));

        return (
          <span
            key={db}
            className="absolute"
            style={
              isHorizontal
                ? {
                    left: `${percent}%`,
                    transform:
                      percent <= 0 ? 'translateX(0)' : percent >= 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }
                : {
                    bottom: `${percent}%`,
                    transform:
                      percent <= 0 ? 'translateY(0)' : percent >= 100 ? 'translateY(-100%)' : 'translateY(50%)',
                  }
            }
          >
            {formatScaleDb(db)}
          </span>
        );
      })}
    </div>
  );

  const meterBar = (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm bg-dsp-primary/30',
        isHorizontal ? 'h-2.5 min-w-12 w-full' : 'w-2.5 min-h-12 h-full',
        meterClassName
      )}
    >
      {/* Level bar */}
      <div
        className={cn(
          'absolute',
          isHorizontal ? 'inset-y-0 left-0' : 'inset-x-0 bottom-0'
        )}
        style={{
          [isHorizontal ? 'width' : 'height']: `${levelPercent}%`,
          background: isHorizontal ? getLevelColor(smoothedLevel) : getVerticalLevelColor(smoothedLevel),
          // Use CSS transition only when not using JS smoothing
          transition: smoothingMs > 0 ? 'none' : 'all 75ms',
        }}
      />

      {/* dB grid lines */}
      <div className="pointer-events-none absolute inset-0">
        {gridLines.map(({ db, opacity }) => {
          const percentRaw = ((db - minDb) / range) * 100;
          const percent = Math.max(0, Math.min(99.9, percentRaw));

          return (
            <div
              key={db}
              className={cn(
                'absolute',
                isHorizontal ? 'top-0 bottom-0 w-px' : 'left-0 right-0 h-px'
              )}
              style={{
                backgroundColor: 'var(--color-dsp-text)',
                opacity,
                [isHorizontal ? 'left' : 'bottom']: `${percent}%`,
              }}
            />
          );
        })}
      </div>

      {/* Peak hold indicator */}
      {peakPercent !== undefined && peakPercent > levelPercent && (
        <div
          className={cn(
            'absolute bg-white/80',
            isHorizontal ? 'inset-y-0 w-0.5' : 'inset-x-0 h-0.5'
          )}
          style={{
            [isHorizontal ? 'left' : 'bottom']: `${peakPercent}%`,
          }}
        />
      )}
    </div>
  );

  const embedSideValue = isHorizontal && showScale && (valuePosition === 'left' || valuePosition === 'right');

  const meterWithScale = showScale ? (
    isHorizontal ? (
      embedSideValue ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {valuePosition === 'left' && valueElement}
          <div className="flex min-w-0 flex-1 flex-col">
            {normalizedScalePosition === 'top' && scaleElement}
            {meterBar}
            {normalizedScalePosition === 'bottom' && scaleElement}
          </div>
          {valuePosition === 'right' && valueElement}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          {normalizedScalePosition === 'top' && scaleElement}
          {meterBar}
          {normalizedScalePosition === 'bottom' && scaleElement}
        </div>
      )
    ) : (
      <div className="flex min-h-0 flex-1 flex-row items-center gap-1">
        {normalizedScalePosition === 'left' && scaleElement}
        {meterBar}
        {normalizedScalePosition === 'right' && scaleElement}
      </div>
    )
  ) : (
    <div className={cn(isHorizontal ? 'min-w-0 flex-1' : 'min-h-0 flex-1')}>
      {meterBar}
    </div>
  );

  return (
    <div
      className={cn(
        'flex gap-1',
        isVerticalLayout ? 'items-stretch' : 'items-center',
        isVerticalLayout ? 'flex-col' : 'flex-row',
        className
      )}
      role="meter"
      aria-valuenow={level}
      aria-valuemin={minDb}
      aria-valuemax={maxDb}
      aria-label="Level meter"
    >
      {!embedSideValue && (valuePosition === 'left' || valuePosition === 'top') && valueElement}
      {meterWithScale}
      {!embedSideValue && (valuePosition === 'right' || valuePosition === 'bottom') && valueElement}
    </div>
  );
});
