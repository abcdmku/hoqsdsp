import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LevelMeterProps {
  /** Current RMS level in dB (typically -60 to 0) */
  rms: number;
  /** Current peak level in dB (typically -60 to 0) */
  peak: number;
  /** Peak hold level in dB (decays over time) */
  peakHold?: number;
  /** Number of clipped samples since last reset */
  clippedSamples?: number;
  /** Whether the meter is vertical or horizontal */
  orientation?: 'vertical' | 'horizontal';
  /** Height/width of the meter in pixels (depending on orientation) */
  size?: number;
  /** Show scale labels */
  showScale?: boolean;
  /** Label for accessibility */
  label?: string;
  /** Callback when clipping indicator is clicked (to reset count) */
  onClippingReset?: () => void;
  className?: string;
}

// dB thresholds for color coding
const THRESHOLD_WARNING = -12; // Yellow zone starts here
const THRESHOLD_CLIP = -3; // Red zone starts here
const MIN_DB = -60;
const MAX_DB = 0;

/**
 * Convert dB value to percentage (0-100)
 * Uses a pseudo-logarithmic scale for better visual representation
 */
function dbToPercent(db: number): number {
  // Clamp to valid range
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  // Linear scale for simplicity (could use IEC 60268-18 scale later)
  return ((clamped - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
}

/**
 * Get the color class based on dB level
 */
function getMeterColor(db: number): string {
  if (db > THRESHOLD_CLIP) return 'bg-meter-red';
  if (db > THRESHOLD_WARNING) return 'bg-meter-yellow';
  return 'bg-meter-green';
}

interface MeterBarProps {
  value: number;
  isHorizontal: boolean;
  className?: string;
  testId?: string;
}

const MeterBar = React.memo(function MeterBar({
  value,
  isHorizontal,
  className,
  testId,
}: MeterBarProps) {
  const percent = dbToPercent(value);
  const color = getMeterColor(value);

  return (
    <div
      className={cn(
        'absolute transition-all duration-[16ms] ease-linear',
        color,
        isHorizontal ? 'left-0 top-0 h-full' : 'bottom-0 left-0 w-full',
        className
      )}
      style={
        isHorizontal
          ? { width: `${percent}%` }
          : { height: `${percent}%` }
      }
      data-testid={testId}
    />
  );
});

interface PeakIndicatorProps {
  value: number;
  isHorizontal: boolean;
}

const PeakIndicator = React.memo(function PeakIndicator({
  value,
  isHorizontal,
}: PeakIndicatorProps) {
  const percent = dbToPercent(value);
  const color = getMeterColor(value);

  return (
    <div
      className={cn(
        'absolute',
        color,
        isHorizontal
          ? 'top-0 h-full w-0.5'
          : 'left-0 h-0.5 w-full'
      )}
      style={
        isHorizontal
          ? { left: `${percent}%` }
          : { bottom: `${percent}%` }
      }
      data-testid="peak-indicator"
    />
  );
});

interface ClippingIndicatorProps {
  clippedSamples: number;
  isHorizontal: boolean;
  onClick?: () => void;
}

const ClippingIndicator = React.memo(function ClippingIndicator({
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
          ? 'bg-meter-red text-white animate-pulse cursor-pointer'
          : 'bg-dsp-surface text-dsp-text-muted cursor-default',
        isHorizontal
          ? 'right-0 top-0 h-full w-6 border-l border-dsp-bg'
          : 'left-0 top-0 h-4 w-full border-b border-dsp-bg'
      )}
      title={
        hasClipped
          ? `${clippedSamples} clipped samples - click to reset`
          : 'No clipping'
      }
      aria-label={
        hasClipped
          ? `Clipping detected: ${clippedSamples} samples. Click to reset.`
          : 'No clipping detected'
      }
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

const MeterScale = React.memo(function MeterScale({
  isHorizontal,
}: MeterScaleProps) {
  const marks = [0, -3, -6, -12, -24, -48, -60];

  return (
    <div
      className={cn(
        'absolute flex text-[8px] text-dsp-text-muted',
        isHorizontal
          ? 'bottom-0 left-0 right-0 h-3 flex-row justify-between px-1'
          : 'right-0 top-0 bottom-0 w-4 flex-col-reverse justify-between py-1'
      )}
      aria-hidden="true"
    >
      {marks.map((db) => (
        <span
          key={db}
          className={cn(
            isHorizontal ? '' : 'text-right'
          )}
        >
          {db === 0 ? '0' : db}
        </span>
      ))}
    </div>
  );
});

/**
 * Professional level meter component with peak/RMS display.
 * Color coding:
 * - Green: Normal (-60 to -12 dB)
 * - Yellow: Warning (-12 to -3 dB)
 * - Red: Clipping (above -3 dB)
 */
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
      className={cn(
        'relative flex',
        isHorizontal ? 'flex-col' : 'flex-row',
        className
      )}
      role="meter"
      aria-valuenow={peak}
      aria-valuemin={MIN_DB}
      aria-valuemax={MAX_DB}
      aria-label={label ?? 'Audio level meter'}
    >
      {/* Meter body */}
      <div
        className={cn(
          'relative overflow-hidden rounded-sm bg-dsp-bg border border-dsp-primary/30',
          isHorizontal ? 'flex-row' : 'flex-col'
        )}
        style={meterStyle}
      >
        {/* RMS bar (wider, dimmer) */}
        <MeterBar
          value={rms}
          isHorizontal={isHorizontal}
          className="opacity-60"
          testId="rms-bar"
        />

        {/* Peak bar (narrower, brighter) - layered on top */}
        <MeterBar
          value={peak}
          isHorizontal={isHorizontal}
          className={cn(
            'opacity-90',
            isHorizontal ? 'h-1/2 top-1/4' : 'w-1/2 left-1/4'
          )}
          testId="peak-bar"
        />

        {/* Peak hold indicator */}
        {peakHold !== undefined && (
          <PeakIndicator
            value={peakHold}
            isHorizontal={isHorizontal}
          />
        )}

        {/* Clipping indicator */}
        {clippedSamples !== undefined && (
          <ClippingIndicator
            clippedSamples={clippedSamples}
            isHorizontal={isHorizontal}
            onClick={onClippingReset}
          />
        )}
      </div>

      {/* Scale labels */}
      {showScale && (
        <MeterScale isHorizontal={isHorizontal} />
      )}
    </div>
  );
});

export interface MultiChannelMeterProps {
  /** Array of channel levels */
  channels: {
    rms: number;
    peak: number;
    peakHold?: number;
    label?: string;
  }[];
  /** Number of clipped samples (shared across channels) */
  clippedSamples?: number;
  /** Meter orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Size of each meter */
  size?: number;
  /** Show scale on the last meter */
  showScale?: boolean;
  /** Callback when clipping indicator is clicked */
  onClippingReset?: () => void;
  /** Labels for capture vs playback */
  groupLabel?: string;
  className?: string;
}

/**
 * Multi-channel level meter group for displaying capture or playback meters.
 */
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
      className={cn(
        'flex gap-1',
        isHorizontal ? 'flex-col' : 'flex-row',
        className
      )}
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

export interface MeterBridgeProps {
  /** Capture (input) channel levels */
  capture: {
    rms: number;
    peak: number;
    peakHold?: number;
  }[];
  /** Playback (output) channel levels */
  playback: {
    rms: number;
    peak: number;
    peakHold?: number;
  }[];
  /** Number of clipped samples */
  clippedSamples?: number;
  /** Callback when clipping indicator is clicked */
  onClippingReset?: () => void;
  className?: string;
}

/**
 * Full meter bridge showing capture and playback meters side by side.
 */
export const MeterBridge = React.memo(function MeterBridge({
  capture,
  playback,
  clippedSamples = 0,
  onClippingReset,
  className,
}: MeterBridgeProps) {
  return (
    <div
      className={cn(
        'flex gap-6 p-4 bg-dsp-surface rounded-lg',
        className
      )}
    >
      {/* Capture meters */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-dsp-text-muted uppercase tracking-wider">
          Capture
        </span>
        <MultiChannelMeter
          channels={capture.map((ch, i) => ({
            ...ch,
            label: `Capture channel ${i + 1}`,
          }))}
          orientation="vertical"
          size={150}
          groupLabel="Capture channels"
        />
      </div>

      {/* Playback meters */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-dsp-text-muted uppercase tracking-wider">
          Playback
        </span>
        <MultiChannelMeter
          channels={playback.map((ch, i) => ({
            ...ch,
            label: `Playback channel ${i + 1}`,
          }))}
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
