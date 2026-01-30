import * as React from 'react';
import { cn } from '../../../lib/utils';
import { DEFAULT_MAX_DB, DEFAULT_MIN_DB } from '../../../lib/monitoring/levelUtils';
import { ClippingIndicator, MeterBar, MeterScale, PeakIndicator } from './MeterParts';
import type { LevelMeterProps } from './types';

export const LevelMeter = React.memo(function LevelMeter({
  rms,
  peak,
  peakHold,
  clippedSamples,
  orientation = 'vertical',
  size = 200,
  showScale = false,
  label,
  onClippingReset,
  className,
}: LevelMeterProps) {
  const isHorizontal = orientation === 'horizontal';

  const meterStyle = isHorizontal
    ? { width: size, height: 16 }
    : { width: 16, height: size };

  return (
    <div
      className={cn('relative flex', isHorizontal ? 'flex-col' : 'flex-row', className)}
      role="meter"
      aria-valuenow={peak}
      aria-valuemin={DEFAULT_MIN_DB}
      aria-valuemax={DEFAULT_MAX_DB}
      aria-label={label ?? 'Audio level meter'}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-sm border border-dsp-primary/30 bg-dsp-bg',
          isHorizontal ? 'flex-row' : 'flex-col',
        )}
        style={meterStyle}
      >
        <MeterBar value={rms} isHorizontal={isHorizontal} className="opacity-60" testId="rms-bar" />

        <MeterBar
          value={peak}
          isHorizontal={isHorizontal}
          className={cn('opacity-90', isHorizontal ? 'top-1/4 h-1/2' : 'left-1/4 w-1/2')}
          testId="peak-bar"
        />

        {peakHold !== undefined && <PeakIndicator value={peakHold} isHorizontal={isHorizontal} />}

        {clippedSamples !== undefined && (
          <ClippingIndicator
            clippedSamples={clippedSamples}
            isHorizontal={isHorizontal}
            onClick={onClippingReset}
          />
        )}
      </div>

      {showScale && <MeterScale isHorizontal={isHorizontal} />}
    </div>
  );
});
