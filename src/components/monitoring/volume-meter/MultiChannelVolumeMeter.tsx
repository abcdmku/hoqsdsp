import * as React from 'react';
import { cn } from '../../../lib/utils';
import { SIZE_PRESETS } from './constants';
import type { MultiChannelVolumeMeterProps } from './types';
import { VolumeMeter } from './VolumeMeter';

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
        className,
      )}
      role="group"
      aria-label="Multi-channel volume meter"
    >
      {showScale && isVertical && (
        <div
          className="flex h-full flex-col-reverse justify-between text-dsp-text-muted"
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
          className={cn('flex items-center', isVertical ? 'flex-col gap-0.5' : 'flex-row gap-0.5')}
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
              className="truncate text-center text-dsp-text-muted"
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
