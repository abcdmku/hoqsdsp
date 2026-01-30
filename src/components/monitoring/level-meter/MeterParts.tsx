import * as React from 'react';
import { cn } from '../../../lib/utils';
import { dbToPercent, meterZoneForDb } from '../../../lib/monitoring/levelUtils';
import { SCALE_MARKS } from './constants';

const ZONE_CLASS = {
  safe: 'bg-meter-green',
  warn: 'bg-meter-yellow',
  clip: 'bg-meter-red',
} as const;

function getMeterClass(db: number): string {
  return ZONE_CLASS[meterZoneForDb(db)];
}

interface MeterBarProps {
  value: number;
  isHorizontal: boolean;
  className?: string;
  testId?: string;
}

export const MeterBar = React.memo(function MeterBar({
  value,
  isHorizontal,
  className,
  testId,
}: MeterBarProps) {
  const percent = dbToPercent(value);
  const color = getMeterClass(value);

  return (
    <div
      className={cn(
        'absolute transition-all duration-[16ms] ease-linear',
        color,
        isHorizontal ? 'left-0 top-0 h-full' : 'bottom-0 left-0 w-full',
        className,
      )}
      style={isHorizontal ? { width: `${percent}%` } : { height: `${percent}%` }}
      data-testid={testId}
    />
  );
});

interface PeakIndicatorProps {
  value: number;
  isHorizontal: boolean;
}

export const PeakIndicator = React.memo(function PeakIndicator({
  value,
  isHorizontal,
}: PeakIndicatorProps) {
  const percent = dbToPercent(value);
  const color = getMeterClass(value);

  return (
    <div
      className={cn('absolute', color, isHorizontal ? 'top-0 h-full w-0.5' : 'left-0 h-0.5 w-full')}
      style={isHorizontal ? { left: `${percent}%` } : { bottom: `${percent}%` }}
      data-testid="peak-indicator"
    />
  );
});

interface ClippingIndicatorProps {
  clippedSamples: number;
  isHorizontal: boolean;
  onClick?: () => void;
}

export const ClippingIndicator = React.memo(function ClippingIndicator({
  clippedSamples,
  isHorizontal,
  onClick,
}: ClippingIndicatorProps) {
  const hasClipped = clippedSamples > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute flex items-center justify-center text-[8px] font-bold',
        hasClipped
          ? 'animate-pulse cursor-pointer bg-meter-red text-white'
          : 'cursor-default bg-dsp-surface text-dsp-text-muted',
        isHorizontal ? 'right-0 top-0 h-full w-6 border-l border-dsp-bg' : 'left-0 top-0 h-4 w-full border-b border-dsp-bg',
      )}
      title={hasClipped ? `${clippedSamples} clipped samples - click to reset` : 'No clipping'}
      aria-label={hasClipped ? `Clipping detected: ${clippedSamples} samples. Click to reset.` : 'No clipping detected'}
      disabled={!onClick}
      data-testid="clipping-indicator"
    >
      {hasClipped ? 'CLIP' : ''}
    </button>
  );
});

interface MeterScaleProps {
  isHorizontal: boolean;
}

export const MeterScale = React.memo(function MeterScale({ isHorizontal }: MeterScaleProps) {
  return (
    <div
      className={cn(
        'absolute flex text-[8px] text-dsp-text-muted',
        isHorizontal
          ? 'bottom-0 left-0 right-0 h-3 flex-row justify-between px-1'
          : 'right-0 top-0 bottom-0 w-4 flex-col-reverse justify-between py-1',
      )}
      aria-hidden="true"
    >
      {SCALE_MARKS.map((db) => (
        <span key={db} className={cn(isHorizontal ? '' : 'text-right')}>
          {db === 0 ? '0' : db}
        </span>
      ))}
    </div>
  );
});
