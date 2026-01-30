import * as React from 'react';
import { cn } from '../../../lib/utils';
import { MultiChannelMeter } from './MultiChannelMeter';
import type { MeterBridgeProps } from './types';

export const MeterBridge = React.memo(function MeterBridge({
  capture,
  playback,
  clippedSamples = 0,
  onClippingReset,
  className,
}: MeterBridgeProps) {
  return (
    <div className={cn('flex gap-6 rounded-lg bg-dsp-surface p-4', className)}>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-dsp-text-muted">Capture</span>
        <MultiChannelMeter
          channels={capture.map((ch, i) => ({ ...ch, label: `Capture channel ${i + 1}` }))}
          orientation="vertical"
          size={150}
          groupLabel="Capture channels"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-dsp-text-muted">Playback</span>
        <MultiChannelMeter
          channels={playback.map((ch, i) => ({ ...ch, label: `Playback channel ${i + 1}` }))}
          clippedSamples={clippedSamples}
          orientation="vertical"
          size={150}
          showScale
          onClippingReset={onClippingReset}
          groupLabel="Playback channels"
        />
      </div>
    </div>
  );
});
