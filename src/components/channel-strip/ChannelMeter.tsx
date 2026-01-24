import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ChannelMeterProps {
  /** Current level in dB (-60 to 0) */
  level: number;
  /** Peak hold level in dB */
  peak?: number;
  /** Meter label (e.g., "In", "Out", "L", "R") */
  label?: string;
  /** Orientation of the meter */
  orientation?: 'horizontal' | 'vertical';
  /** Whether clipping has been detected */
  clipping?: boolean;
  /** Number of clipped samples (for tooltip display) */
  clippedSamples?: number;
  /** Show scale markings */
  showScale?: boolean;
  className?: string;
}

// Scale markings for vertical meter (dB values)
const SCALE_MARKS = [0, -6, -12, -24, -48];

/**
 * Channel Level Meter - displays audio level with peak hold and color coding.
 *
 * Color coding:
 * - Green: Normal levels (-60 to -12 dB)
 * - Yellow: High levels (-12 to -3 dB)
 * - Red: Near clipping (above -3 dB)
 *
 * Features:
 * - Smooth level animation
 * - Peak hold indicator
 * - Clipping indicator with sample count
 * - Optional dB scale markings
 */
export const ChannelMeter = React.memo(function ChannelMeter({
  level,
  peak,
  label,
  orientation = 'vertical',
  clipping = false,
  clippedSamples,
  showScale = false,
  className,
}: ChannelMeterProps) {
  // Convert dB to percentage (0-100)
  // Using logarithmic scale for more natural meter response
  const levelToPercent = React.useCallback((db: number): number => {
    // Clamp to -60 to 0 range
    const clamped = Math.max(-60, Math.min(0, db));
    // Linear scale for simplicity
    return ((clamped + 60) / 60) * 100;
  }, []);

  const levelPercent = levelToPercent(level);
  const peakPercent = peak !== undefined ? levelToPercent(peak) : undefined;

  // Determine segment colors based on level
  const getSegmentColor = (segmentDb: number): string => {
    if (segmentDb > -3) return 'bg-meter-red';
    if (segmentDb > -12) return 'bg-meter-yellow';
    return 'bg-meter-green';
  };

  // Generate gradient segments for the meter
  const renderMeterBar = () => {
    // For a more realistic meter, we use segmented display
    const segments = [];
    const numSegments = 30;
    const dbRange = 60;
    const dbPerSegment = dbRange / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const segmentDb = -dbRange + (i * dbPerSegment);
      const segmentPercent = ((i + 1) / numSegments) * 100;
      const isActive = levelPercent >= segmentPercent - (100 / numSegments);
      const color = getSegmentColor(segmentDb);

      segments.push(
        <div
          key={i}
          className={cn(
            'transition-opacity duration-75',
            orientation === 'vertical' ? 'h-full flex-1' : 'w-full flex-1',
            isActive ? color : 'bg-dsp-bg/50'
          )}
        />
      );
    }

    return segments;
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'h-3 flex-row items-stretch' : 'w-4 flex-col-reverse items-stretch',
        showScale && !isHorizontal && 'mr-6',
        className
      )}
      role="meter"
      aria-valuenow={level}
      aria-valuemin={-60}
      aria-valuemax={0}
      aria-label={label ? `${label} level` : 'Audio level'}
    >
      {/* Label */}
      {label && (
        <div
          className={cn(
            'flex items-center justify-center text-[10px] font-medium text-dsp-text-muted',
            isHorizontal ? 'w-8 pr-1' : 'h-4 pb-1'
          )}
        >
          {label}
        </div>
      )}

      {/* Meter container */}
      <div
        className={cn(
          'relative flex overflow-hidden rounded-sm bg-dsp-bg',
          isHorizontal ? 'h-full flex-1 flex-row gap-px' : 'w-full flex-1 flex-col-reverse gap-px'
        )}
      >
        {/* Segmented meter bar */}
        {renderMeterBar()}

        {/* Peak indicator */}
        {peakPercent !== undefined && (
          <div
            className={cn(
              'absolute bg-dsp-text',
              isHorizontal
                ? 'top-0 h-full w-0.5'
                : 'left-0 h-0.5 w-full'
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
              'absolute animate-pulse bg-meter-red',
              isHorizontal
                ? 'right-0 top-0 h-full w-1'
                : 'left-0 top-0 h-1 w-full'
            )}
            title={clippedSamples !== undefined ? `${String(clippedSamples)} clipped samples` : 'Clipping detected'}
          />
        )}
      </div>

      {/* Scale markings (vertical only) */}
      {showScale && !isHorizontal && (
        <div className="absolute -right-5 flex h-full flex-col justify-between text-[8px] text-dsp-text-muted">
          {SCALE_MARKS.map((db) => (
            <span key={db} className="leading-none">
              {db}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export interface StereoChannelMeterProps {
  /** Left channel level in dB */
  leftLevel: number;
  /** Right channel level in dB */
  rightLevel: number;
  /** Left channel peak in dB */
  leftPeak?: number;
  /** Right channel peak in dB */
  rightPeak?: number;
  /** Label for the stereo pair */
  label?: string;
  /** Orientation of the meters */
  orientation?: 'horizontal' | 'vertical';
  /** Whether clipping has been detected */
  clipping?: boolean;
  /** Show scale markings */
  showScale?: boolean;
  className?: string;
}

/**
 * Stereo Channel Meter - displays L/R level meters side by side.
 */
export const StereoChannelMeter = React.memo(function StereoChannelMeter({
  leftLevel,
  rightLevel,
  leftPeak,
  rightPeak,
  label,
  orientation = 'vertical',
  clipping = false,
  showScale = false,
  className,
}: StereoChannelMeterProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'flex-col gap-0.5' : 'flex-row gap-0.5',
        className
      )}
      aria-label={label ? `${label} stereo level` : 'Stereo audio level'}
    >
      {label && (
        <div
          className={cn(
            'flex items-center justify-center text-[10px] font-medium text-dsp-text-muted',
            isHorizontal ? 'pb-1' : 'pr-1 writing-vertical'
          )}
        >
          {label}
        </div>
      )}
      <div className={cn('flex', isHorizontal ? 'flex-col gap-0.5' : 'flex-row gap-0.5')}>
        <ChannelMeter
          level={leftLevel}
          peak={leftPeak}
          orientation={orientation}
          clipping={clipping}
          label="L"
        />
        <ChannelMeter
          level={rightLevel}
          peak={rightPeak}
          orientation={orientation}
          clipping={clipping}
          showScale={showScale}
          label="R"
        />
      </div>
    </div>
  );
});
