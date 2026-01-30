import * as React from 'react';
import { cn } from '../../../lib/utils';
import { SIZE_PRESETS } from './constants';
import type { StereoVolumeMeterProps } from './types';
import { VolumeMeter } from './VolumeMeter';

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
        className,
      )}
      role="group"
      aria-label="Stereo volume meter"
    >
      {showChannelLabels && size !== 'xs' && (
        <div
          className={cn(
            'flex text-dsp-text-muted',
            isVertical ? 'flex-row gap-0.5' : 'flex-col gap-0.5',
          )}
          style={{ fontSize: preset.fontSize - 1 }}
        >
          <span className="text-center" style={{ width: preset.barWidth }}>L</span>
          <span className="text-center" style={{ width: preset.barWidth }}>R</span>
        </div>
      )}

      <div className={cn('flex', isVertical ? 'flex-row gap-0.5' : 'flex-col gap-0.5')}>
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
            clipping && 'text-meter-red',
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
