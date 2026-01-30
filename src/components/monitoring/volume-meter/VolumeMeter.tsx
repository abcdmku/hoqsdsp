import * as React from 'react';
import { cn } from '../../../lib/utils';
import { clampPercent, dbToPercent, meterZoneForDb } from '../../../lib/monitoring/levelUtils';
import { SIZE_PRESETS, getGridLines, getScaleMarks, getSegmentCount } from './constants';
import type { VolumeMeterProps } from './types';

const COLOR_BY_ZONE = {
  safe: 'var(--color-meter-green)',
  warn: 'var(--color-meter-yellow)',
  clip: 'var(--color-meter-red)',
} as const;

function getColorForLevel(db: number): string {
  return COLOR_BY_ZONE[meterZoneForDb(db)];
}

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
  const effectiveValuePosition = valuePosition ?? (orientation === 'vertical' ? 'bottom' : 'right');
  const preset = SIZE_PRESETS[size];
  const isVertical = orientation === 'vertical';
  const levelPercent = dbToPercent(level);
  const peakPercent = peak !== undefined ? dbToPercent(peak) : undefined;
  const gridLines = React.useMemo(() => getGridLines(size), [size]);
  const scaleMarks = getScaleMarks(size);
  const segmentCount = getSegmentCount(size);
  const activeSegments = Math.round((levelPercent / 100) * segmentCount);

  const meterContent = (
    <div className="relative h-full w-full overflow-hidden rounded-sm bg-dsp-primary/20">
      {mode === 'segmented' ? (
        <div className={cn('flex h-full w-full gap-px', isVertical ? 'flex-col-reverse' : 'flex-row')}>
          {Array.from({ length: segmentCount }, (_, i) => {
            const isActive = i < activeSegments;
            const segmentDb = -60 + ((i + 1) / segmentCount) * 60;
            const color = isActive ? getColorForLevel(segmentDb) : 'var(--color-dsp-primary)';
            const opacity = isActive ? 1 : 0.18;

            return (
              <div
                key={i}
                className="flex-1 rounded-[1px]"
                style={{ backgroundColor: color, opacity, transition: 'opacity 50ms ease-out' }}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={cn('absolute', isVertical ? 'bottom-0 left-0 right-0' : 'left-0 top-0 bottom-0')}
          style={{
            [isVertical ? 'height' : 'width']: `${String(levelPercent)}%`,
            background: isVertical
              ? 'linear-gradient(to top, var(--color-meter-green) 0%, var(--color-meter-green) 80%, var(--color-meter-yellow) 90%, var(--color-meter-red) 100%)'
              : 'linear-gradient(to right, var(--color-meter-green) 0%, var(--color-meter-green) 80%, var(--color-meter-yellow) 90%, var(--color-meter-red) 100%)',
            transition: 'height 50ms ease-out, width 50ms ease-out',
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0">
        {gridLines.map(({ db, opacity, thicknessPx }) => {
          const position = clampPercent(dbToPercent(db));

          return (
            <div
              key={db}
              className={cn('absolute', isVertical ? 'left-0 right-0' : 'top-0 bottom-0')}
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

      {peakPercent !== undefined && peakPercent > levelPercent && (
        <div
          className={cn('absolute bg-white/80', isVertical ? 'left-0 right-0 h-[2px]' : 'top-0 bottom-0 w-[2px]')}
          style={{
            [isVertical ? 'bottom' : 'left']: `${String(clampPercent(peakPercent))}%`,
            transition: 'bottom 50ms ease-out, left 50ms ease-out',
          }}
        />
      )}

      {clipping && (
        <div
          className={cn('absolute animate-pulse bg-meter-red', isVertical ? 'left-0 right-0 top-0 h-[3px]' : 'top-0 bottom-0 right-0 w-[3px]')}
        />
      )}
    </div>
  );

  const scaleElement = showScale && size !== 'xs' && (
    <div
      className={cn('flex text-dsp-text-muted', isVertical ? 'h-full flex-col-reverse justify-between' : 'w-full flex-row justify-between')}
      style={{ fontSize: preset.fontSize }}
    >
      {scaleMarks.map((mark) => (
        <span key={mark} className="font-mono leading-none" style={{ width: isVertical ? 'auto' : undefined }}>
          {mark === 0 ? '0' : mark}
        </span>
      ))}
    </div>
  );

  const valueElement = showValue && (
    <span className={cn('font-mono tabular-nums text-dsp-text', clipping && 'text-meter-red')} style={{ fontSize: preset.fontSize }}>
      {level > -60 ? level.toFixed(1) : '-\u221E'}
    </span>
  );

  const labelElement = label && (
    <span className="truncate text-dsp-text-muted" style={{ fontSize: preset.fontSize }}>
      {label}
    </span>
  );

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
          ? labelPosition === 'left' || labelPosition === 'right'
            ? 'flex-row'
            : 'flex-col'
          : labelPosition === 'top' || labelPosition === 'bottom'
            ? 'flex-col'
            : 'flex-row',
        className,
      )}
      role="meter"
      aria-valuenow={level}
      aria-valuemin={-60}
      aria-valuemax={0}
      aria-label={label ?? 'Volume level'}
    >
      {labelPosition === 'top' && labelElement}
      {labelPosition === 'left' && labelElement}
      {showValue && effectiveValuePosition === 'top' && valueElement}
      {showValue && effectiveValuePosition === 'left' && valueElement}

      <div className={cn('flex gap-1', isVertical ? 'flex-row items-stretch' : 'flex-col items-stretch', !isVertical && flexible && 'w-full flex-1')}>
        {showScale && isVertical && scaleElement}
        <div
          style={!isVertical && flexible ? { height: preset.barWidth } : meterStyle}
          className={cn(isVertical ? 'flex-shrink-0' : 'flex-1', !isVertical && flexible && 'w-full')}
        >
          {meterContent}
        </div>
        {showScale && !isVertical && scaleElement}
      </div>

      {showValue && effectiveValuePosition === 'bottom' && valueElement}
      {showValue && effectiveValuePosition === 'right' && valueElement}
      {labelPosition === 'bottom' && labelElement}
      {labelPosition === 'right' && labelElement}
    </div>
  );
});
