import * as React from 'react';
import { cn } from '../../lib/utils';

// Size presets with dimensions
const SIZE_PRESETS = {
  xs: { width: 4, height: 24, barWidth: 2, fontSize: 8 },
  sm: { width: 8, height: 40, barWidth: 4, fontSize: 9 },
  md: { width: 12, height: 64, barWidth: 6, fontSize: 10 },
  lg: { width: 20, height: 120, barWidth: 10, fontSize: 11 },
} as const;

export type VolumeMeterSize = keyof typeof SIZE_PRESETS;

export interface VolumeMeterProps {
  /** Level in dB (-60 to 0) */
  level: number;
  /** Optional peak hold level */
  peak?: number;
  /** Orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Size preset */
  size?: VolumeMeterSize;
  /** Display mode */
  mode?: 'gradient' | 'segmented';
  /** Show dB scale labels */
  showScale?: boolean;
  /** Show current dB value */
  showValue?: boolean;
  /** Position of the dB value display */
  valuePosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Clipping detected */
  clipping?: boolean;
  /** Label text */
  label?: string;
  /** Label position */
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Allow meter bar to flex/expand to fill available space (for horizontal meters) */
  flexible?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Convert dB level to percentage (0-100).
 * Uses a linear dBFS scale for consistent markings.
 */
function levelToPercent(db: number): number {
  const clamped = Math.max(-60, Math.min(0, db));
  const normalized = (clamped + 60) / 60; // 0 to 1
  return normalized * 100;
}

/**
 * Get gradient color based on dB level.
 * Green: -60 to -12 dB
 * Yellow: -12 to -3 dB
 * Red: above -3 dB
 */
function getColorForLevel(db: number): string {
  if (db > -3) return 'var(--color-meter-red)';
  if (db > -12) return 'var(--color-meter-yellow)';
  return 'var(--color-meter-green)';
}

interface MeterGridLine {
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
    // Denser markings near the top for a more technical feel
    [-54, -42, -30, -21, -18, -15, -9]
  ),
};

function clampDisplayPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(99.9, percent));
}

/**
 * Professional-looking volume meter component with multiple display options.
 *
 * Features:
 * - 4 size presets (xs, sm, md, lg)
 * - Gradient or segmented display modes
 * - Peak hold indicator with visual styling
 * - Clipping indicator that pulses red
 * - Optional dB scale labels
 * - Optional current dB value display
 * - Smooth CSS transitions at 60fps
 */
export const VolumeMeter = React.memo(function VolumeMeter({
  level,
  peak,
  orientation = 'vertical',
  size = 'md',
  mode = 'gradient',
  showScale = false,
  showValue = false,
  valuePosition,
  clipping = false,
  label,
  labelPosition = 'bottom',
  flexible = false,
  className,
}: VolumeMeterProps) {
  // Default valuePosition based on orientation if not specified
  const effectiveValuePosition = valuePosition ?? (orientation === 'vertical' ? 'bottom' : 'right');
  const preset = SIZE_PRESETS[size];
  const isVertical = orientation === 'vertical';
  const levelPercent = levelToPercent(level);
  const peakPercent = peak !== undefined ? levelToPercent(peak) : undefined;
  const gridLines = React.useMemo(() => GRID_LINES[size], [size]);

  // Scale marks for display
  const scaleMarks = size === 'lg' ? [-60, -48, -36, -24, -12, -6, -3, 0] :
                     size === 'md' ? [-60, -36, -12, -3, 0] :
                     [-60, -12, 0];

  // Segmented mode: create discrete LED-style segments
  const segmentCount = size === 'lg' ? 24 : size === 'md' ? 16 : size === 'sm' ? 10 : 6;
  const activeSegments = Math.round((levelPercent / 100) * segmentCount);

  const meterContent = (
    <div className="relative h-full w-full overflow-hidden rounded-sm bg-dsp-primary/20">
      {/* Active level */}
      {mode === 'segmented' ? (
        <div
          className={cn(
            'flex h-full w-full gap-px',
            isVertical ? 'flex-col-reverse' : 'flex-row'
          )}
        >
          {Array.from({ length: segmentCount }, (_, i) => {
            const isActive = i < activeSegments;
            const segmentDb = -60 + ((i + 1) / segmentCount) * 60;
            const color = isActive ? getColorForLevel(segmentDb) : 'var(--color-dsp-primary)';
            const opacity = isActive ? 1 : 0.18;

            return (
              <div
                key={i}
                className="flex-1 rounded-[1px]"
                style={{
                  backgroundColor: color,
                  opacity,
                  transition: 'opacity 50ms ease-out',
                }}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            'absolute',
            isVertical ? 'bottom-0 left-0 right-0' : 'left-0 top-0 bottom-0'
          )}
          style={{
            [isVertical ? 'height' : 'width']: `${String(levelPercent)}%`,
            background: isVertical
              ? 'linear-gradient(to top, var(--color-meter-green) 0%, var(--color-meter-green) 80%, var(--color-meter-yellow) 90%, var(--color-meter-red) 100%)'
              : 'linear-gradient(to right, var(--color-meter-green) 0%, var(--color-meter-green) 80%, var(--color-meter-yellow) 90%, var(--color-meter-red) 100%)',
            transition: 'height 50ms ease-out, width 50ms ease-out',
          }}
        />
      )}

      {/* dB grid lines */}
      <div className="pointer-events-none absolute inset-0">
        {gridLines.map(({ db, opacity, thicknessPx }) => {
          const position = clampDisplayPercent(levelToPercent(db));

          return (
            <div
              key={db}
              className={cn(
                'absolute',
                isVertical ? 'left-0 right-0' : 'top-0 bottom-0'
              )}
              style={{
                backgroundColor: 'var(--color-dsp-text)',
                opacity,
                [isVertical ? 'height' : 'width']: `${String(thicknessPx)}px`,
                [isVertical ? 'bottom' : 'left']: `${String(position)}%`,
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
            isVertical ? 'left-0 right-0 h-[2px]' : 'top-0 bottom-0 w-[2px]'
          )}
          style={{
            [isVertical ? 'bottom' : 'left']: `${String(clampDisplayPercent(peakPercent))}%`,
            transition: 'bottom 50ms ease-out, left 50ms ease-out',
          }}
        />
      )}

      {/* Clipping indicator */}
      {clipping && (
        <div
          className={cn(
            'absolute bg-meter-red animate-pulse',
            isVertical ? 'left-0 right-0 top-0 h-[3px]' : 'top-0 bottom-0 right-0 w-[3px]'
          )}
        />
      )}
    </div>
  );

  // Build the scale element if needed
  const scaleElement = showScale && size !== 'xs' && (
    <div
      className={cn(
        'flex text-dsp-text-muted',
        isVertical
          ? 'flex-col-reverse justify-between h-full'
          : 'flex-row justify-between w-full'
      )}
      style={{ fontSize: preset.fontSize }}
    >
      {scaleMarks.map((mark) => (
        <span
          key={mark}
          className="font-mono leading-none"
          style={{ width: isVertical ? 'auto' : undefined }}
        >
          {mark === 0 ? '0' : mark}
        </span>
      ))}
    </div>
  );

  // Value display
  const valueElement = showValue && (
    <span
      className={cn(
        'font-mono text-dsp-text tabular-nums',
        clipping && 'text-meter-red'
      )}
      style={{ fontSize: preset.fontSize }}
    >
      {level > -60 ? level.toFixed(1) : '-\u221E'}
    </span>
  );

  // Label element
  const labelElement = label && (
    <span
      className="text-dsp-text-muted truncate"
      style={{ fontSize: preset.fontSize }}
    >
      {label}
    </span>
  );

  // Container dimensions
  const meterStyle: React.CSSProperties = {
    width: isVertical ? preset.barWidth : undefined,
    height: isVertical ? preset.height : preset.barWidth,
    minWidth: isVertical ? undefined : flexible ? undefined : preset.height,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        isVertical
          ? (labelPosition === 'left' || labelPosition === 'right')
            ? 'flex-row'
            : 'flex-col'
          : (labelPosition === 'top' || labelPosition === 'bottom')
            ? 'flex-col'
            : 'flex-row',
        className
      )}
      role="meter"
      aria-valuenow={level}
      aria-valuemin={-60}
      aria-valuemax={0}
      aria-label={label ?? 'Volume level'}
    >
      {/* Top/Left positioned elements */}
      {labelPosition === 'top' && labelElement}
      {labelPosition === 'left' && labelElement}
      {showValue && effectiveValuePosition === 'top' && valueElement}
      {showValue && effectiveValuePosition === 'left' && valueElement}

      {/* Main meter area with optional scale */}
      <div
        className={cn(
          'flex gap-1',
          isVertical ? 'flex-row items-stretch' : 'flex-col items-stretch',
          !isVertical && flexible && 'flex-1 w-full'
        )}
      >
        {showScale && isVertical && scaleElement}
        <div
          style={!isVertical && flexible ? { height: preset.barWidth } : meterStyle}
          className={cn(
            isVertical ? 'flex-shrink-0' : 'flex-1',
            !isVertical && flexible && 'w-full'
          )}
        >
          {meterContent}
        </div>
        {showScale && !isVertical && scaleElement}
      </div>

      {/* Bottom/Right positioned elements */}
      {showValue && effectiveValuePosition === 'bottom' && valueElement}
      {showValue && effectiveValuePosition === 'right' && valueElement}
      {labelPosition === 'bottom' && labelElement}
      {labelPosition === 'right' && labelElement}
    </div>
  );
});

export interface StereoVolumeMeterProps {
  /** Left channel level in dB */
  leftLevel: number;
  /** Right channel level in dB */
  rightLevel: number;
  /** Left channel peak in dB */
  leftPeak?: number;
  /** Right channel peak in dB */
  rightPeak?: number;
  /** Orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Size preset */
  size?: VolumeMeterSize;
  /** Display mode */
  mode?: 'gradient' | 'segmented';
  /** Show dB scale labels */
  showScale?: boolean;
  /** Show current dB values */
  showValue?: boolean;
  /** Clipping detected */
  clipping?: boolean;
  /** Show L/R labels */
  showChannelLabels?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Stereo volume meter showing L/R channels side by side.
 */
export const StereoVolumeMeter = React.memo(function StereoVolumeMeter({
  leftLevel,
  rightLevel,
  leftPeak,
  rightPeak,
  orientation = 'vertical',
  size = 'md',
  mode = 'gradient',
  showScale = false,
  showValue = false,
  clipping = false,
  showChannelLabels = false,
  className,
}: StereoVolumeMeterProps) {
  const preset = SIZE_PRESETS[size];
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'flex items-end',
        isVertical ? 'flex-row gap-0.5' : 'flex-col gap-0.5',
        className
      )}
      role="group"
      aria-label="Stereo volume meter"
    >
      {showChannelLabels && size !== 'xs' && (
        <div
          className={cn(
            'flex text-dsp-text-muted',
            isVertical ? 'flex-row gap-0.5' : 'flex-col gap-0.5'
          )}
          style={{ fontSize: preset.fontSize - 1 }}
        >
          <span className="text-center" style={{ width: preset.barWidth }}>L</span>
          <span className="text-center" style={{ width: preset.barWidth }}>R</span>
        </div>
      )}

      <div className={cn(
        'flex',
        isVertical ? 'flex-row gap-0.5' : 'flex-col gap-0.5'
      )}>
        <VolumeMeter
          level={leftLevel}
          peak={leftPeak}
          orientation={orientation}
          size={size}
          mode={mode}
          showScale={showScale && isVertical}
          showValue={false}
          clipping={clipping}
        />
        <VolumeMeter
          level={rightLevel}
          peak={rightPeak}
          orientation={orientation}
          size={size}
          mode={mode}
          showScale={false}
          showValue={false}
          clipping={clipping}
        />
      </div>

      {showValue && (
        <div
          className={cn(
            'flex font-mono text-dsp-text tabular-nums',
            isVertical ? 'flex-row gap-1' : 'flex-col gap-0.5',
            clipping && 'text-meter-red'
          )}
          style={{ fontSize: preset.fontSize }}
        >
          <span>{leftLevel > -60 ? leftLevel.toFixed(1) : '-\u221E'}</span>
          <span>{rightLevel > -60 ? rightLevel.toFixed(1) : '-\u221E'}</span>
        </div>
      )}
    </div>
  );
});

export interface MultiChannelVolumeMeterProps {
  /** Channel levels in dB */
  levels: number[];
  /** Channel peak values in dB */
  peaks?: number[];
  /** Channel labels */
  labels?: string[];
  /** Orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Size preset */
  size?: VolumeMeterSize;
  /** Display mode */
  mode?: 'gradient' | 'segmented';
  /** Show dB scale labels */
  showScale?: boolean;
  /** Clipping detected per channel */
  clippingChannels?: boolean[];
  /** Additional class name */
  className?: string;
}

/**
 * Multi-channel volume meter for displaying arbitrary number of channels.
 */
export const MultiChannelVolumeMeter = React.memo(function MultiChannelVolumeMeter({
  levels,
  peaks,
  labels,
  orientation = 'vertical',
  size = 'sm',
  mode = 'gradient',
  showScale = false,
  clippingChannels,
  className,
}: MultiChannelVolumeMeterProps) {
  const preset = SIZE_PRESETS[size];
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'flex items-end gap-0.5',
        isVertical ? 'flex-row' : 'flex-col',
        className
      )}
      role="group"
      aria-label="Multi-channel volume meter"
    >
      {showScale && isVertical && (
        <div
          className="flex flex-col-reverse justify-between h-full text-dsp-text-muted"
          style={{ fontSize: preset.fontSize, height: preset.height }}
        >
          <span>-60</span>
          <span>-12</span>
          <span>0</span>
        </div>
      )}

      {levels.map((level, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center',
            isVertical ? 'flex-col gap-0.5' : 'flex-row gap-0.5'
          )}
        >
          <VolumeMeter
            level={level}
            peak={peaks?.[index]}
            orientation={orientation}
            size={size}
            mode={mode}
            showScale={false}
            showValue={false}
            clipping={clippingChannels?.[index]}
          />
          {labels?.[index] && size !== 'xs' && (
            <span
              className="text-dsp-text-muted text-center truncate"
              style={{ fontSize: preset.fontSize - 1, maxWidth: preset.barWidth * 3 }}
            >
              {labels[index]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});
