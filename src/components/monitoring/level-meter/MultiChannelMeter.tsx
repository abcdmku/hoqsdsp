import * as React from 'react';
import { cn } from '../../../lib/utils';
import { LevelMeter } from './LevelMeter';
import type { MultiChannelMeterProps } from './types';

export const MultiChannelMeter = React.memo(function MultiChannelMeter({
  channels,
  clippedSamples,
  orientation = 'vertical',
  size = 200,
  showScale = false,
  onClippingReset,
  groupLabel,
  className,
}: MultiChannelMeterProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn('flex gap-1', isHorizontal ? 'flex-col' : 'flex-row', className)}
      role="group"
      aria-label={groupLabel ?? 'Channel meters'}
    >
      {channels.map((channel, index) => (
        <LevelMeter
          key={index}
          rms={channel.rms}
          peak={channel.peak}
          peakHold={channel.peakHold}
          clippedSamples={index === 0 ? clippedSamples : undefined}
          orientation={orientation}
          size={size}
          showScale={showScale && index === channels.length - 1}
          label={channel.label ?? `Channel ${index + 1}`}
          onClippingReset={index === 0 ? onClippingReset : undefined}
        />
      ))}
    </div>
  );
});
