import * as React from 'react';
import { cn } from '../../lib/utils';

export interface MiniMeterProps {
  /** Current level in dB (-60 to 0) */
  level: number;
  /** Peak hold level in dB */
  peak?: number;
  /** Orientation of the meter */
  orientation?: 'horizontal' | 'vertical';
  /** Whether clipping has been detected */
  clipping?: boolean;
  /** Label for accessibility */
  label?: string;
  className?: string;
}

/**
 * Compact level meter for use in unit cards and channel strips.
 * Shows peak/RMS levels with color coding:
 * - Green: Normal (-60 to -12 dB)
 * - Yellow: High (-12 to -3 dB)
 * - Red: Clipping (above -3 dB)
 */
export const MiniMeter = React.memo(function MiniMeter({
  level,
  peak,
  orientation = 'vertical',
  clipping = false,
  label,
  className,
}: MiniMeterProps) {
  // Convert dB to percentage (0-100)
  const levelToPercent = (db: number): number => {
    // Clamp to -60 to 0 range
    const clamped = Math.max(-60, Math.min(0, db));
    // Linear scale for simplicity in mini meter
    return ((clamped + 60) / 60) * 100;
  };

  const levelPercent = levelToPercent(level);
  const peakPercent = peak !== undefined ? levelToPercent(peak) : undefined;

  // Determine color based on level
  const getColor = (db: number): string => {
    if (db > -3) return 'bg-meter-red';
    if (db > -12) return 'bg-meter-yellow';
    return 'bg-meter-green';
  };

  const meterColor = getColor(level);
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm bg-dsp-bg',
        isHorizontal ? 'h-2 w-full' : 'h-full w-2',
        className
      )}
      role="meter"
      aria-valuenow={level}
      aria-valuemin={-60}
      aria-valuemax={0}
      aria-label={label ?? 'Audio level'}
    >
      {/* Level bar */}
      <div
        className={cn(
          'absolute transition-all duration-75',
          meterColor,
          isHorizontal
            ? 'left-0 top-0 h-full'
            : 'bottom-0 left-0 w-full'
        )}
        style={
          isHorizontal
            ? { width: `${String(levelPercent)}%` }
            : { height: `${String(levelPercent)}%` }
        }
      />

      {/* Peak indicator */}
      {peakPercent !== undefined && (
        <div
          className={cn(
            'absolute bg-dsp-text',
            isHorizontal
              ? 'top-0 h-full w-px'
              : 'left-0 h-px w-full'
          )}
          style={
            isHorizontal
              ? { left: `${String(peakPercent)}%` }
              : { bottom: `${String(peakPercent)}%` }
          }
        />
      )}

      {/* Clipping indicator */}
      {clipping && (
        <div
          className={cn(
            'absolute bg-meter-red animate-pulse',
            isHorizontal
              ? 'right-0 top-0 h-full w-1'
              : 'left-0 top-0 h-1 w-full'
          )}
        />
      )}
    </div>
  );
});

export interface StereoMiniMeterProps {
  /** Left channel level in dB */
  leftLevel: number;
  /** Right channel level in dB */
  rightLevel: number;
  /** Left channel peak in dB */
  leftPeak?: number;
  /** Right channel peak in dB */
  rightPeak?: number;
  /** Orientation of the meters */
  orientation?: 'horizontal' | 'vertical';
  /** Whether clipping has been detected */
  clipping?: boolean;
  /** Label for accessibility */
  label?: string;
  className?: string;
}

/**
 * Stereo pair of mini meters for showing L/R levels.
 */
export const StereoMiniMeter = React.memo(function StereoMiniMeter({
  leftLevel,
  rightLevel,
  leftPeak,
  rightPeak,
  orientation = 'vertical',
  clipping = false,
  label,
  className,
}: StereoMiniMeterProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'flex gap-0.5',
        isHorizontal ? 'flex-col' : 'flex-row',
        className
      )}
      aria-label={label ?? 'Stereo audio level'}
    >
      <MiniMeter
        level={leftLevel}
        peak={leftPeak}
        orientation={orientation}
        clipping={clipping}
        label="Left channel level"
      />
      <MiniMeter
        level={rightLevel}
        peak={rightPeak}
        orientation={orientation}
        clipping={clipping}
        label="Right channel level"
      />
    </div>
  );
});
