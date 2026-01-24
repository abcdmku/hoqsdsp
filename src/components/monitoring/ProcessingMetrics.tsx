import * as React from 'react';
import { Cpu, HardDrive, Activity, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ProcessingMetricsProps {
  /** CPU processing load as percentage (0-100) */
  processingLoad: number;
  /** Buffer fill level as percentage (0-100) */
  bufferLevel: number;
  /** Capture sample rate in Hz */
  captureSampleRate: number;
  /** Rate adjust factor (for resampling) */
  rateAdjust?: number;
  /** Whether to show rate adjust (useful for async resampling) */
  showRateAdjust?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical' | 'compact';
  /** Additional class names */
  className?: string;
}

// Thresholds for color coding
const CPU_WARNING_THRESHOLD = 50;
const CPU_CRITICAL_THRESHOLD = 80;
const BUFFER_LOW_CRITICAL = 20;
const BUFFER_LOW_WARNING = 30;
const BUFFER_HIGH_WARNING = 80;
const BUFFER_HIGH_CRITICAL = 90;

/**
 * Get color class for CPU load
 */
function getCpuLoadColor(load: number): string {
  if (load > CPU_CRITICAL_THRESHOLD) return 'text-meter-red';
  if (load > CPU_WARNING_THRESHOLD) return 'text-meter-yellow';
  return 'text-meter-green';
}

/**
 * Get color class for buffer level.
 * Buffer should stay in a healthy middle range.
 * Too low = underrun risk, too high = latency/overflow risk.
 */
function getBufferLevelColor(level: number): string {
  if (level < BUFFER_LOW_CRITICAL || level > BUFFER_HIGH_CRITICAL) return 'text-meter-red';
  if (level < BUFFER_LOW_WARNING || level > BUFFER_HIGH_WARNING) return 'text-meter-yellow';
  return 'text-meter-green';
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass?: string;
  compact?: boolean;
}

const MetricItem = React.memo(function MetricItem({
  icon,
  label,
  value,
  colorClass,
  compact = false,
}: MetricItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        compact && 'gap-1'
      )}
      title={label}
    >
      <span className={cn('w-4 h-4 flex-shrink-0', colorClass)}>
        {icon}
      </span>
      {!compact && (
        <span className="text-dsp-text-muted text-xs">
          {label}:
        </span>
      )}
      <span className={cn('text-xs font-medium', colorClass)}>
        {value}
      </span>
    </div>
  );
});

interface ProgressBarProps {
  value: number;
  colorClass: string;
  className?: string;
}

const ProgressBar = React.memo(function ProgressBar({
  value,
  colorClass,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        'h-1.5 bg-dsp-bg rounded-full overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-200',
          colorClass.replace('text-', 'bg-')
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
});

/**
 * Processing metrics display component.
 * Shows CPU load, buffer level, and sample rate with color-coded indicators.
 */
export const ProcessingMetrics = React.memo(function ProcessingMetrics({
  processingLoad,
  bufferLevel,
  captureSampleRate,
  rateAdjust = 1.0,
  showRateAdjust = false,
  layout = 'horizontal',
  className,
}: ProcessingMetricsProps) {
  const cpuColor = getCpuLoadColor(processingLoad);
  const bufferColor = getBufferLevelColor(bufferLevel);

  const sampleRateFormatted = captureSampleRate > 0
    ? `${(captureSampleRate / 1000).toFixed(1)} kHz`
    : '-- kHz';

  const rateAdjustFormatted = `${rateAdjust.toFixed(4)}x`;

  if (layout === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 text-dsp-text-muted',
          className
        )}
        role="status"
        aria-label="Processing metrics"
      >
        <MetricItem
          icon={<Cpu className="w-4 h-4" />}
          label="CPU"
          value={`${processingLoad.toFixed(1)}%`}
          colorClass={cpuColor}
          compact
        />
        <MetricItem
          icon={<HardDrive className="w-4 h-4" />}
          label="Buffer"
          value={`${bufferLevel.toFixed(0)}%`}
          colorClass={bufferColor}
          compact
        />
        <MetricItem
          icon={<Activity className="w-4 h-4" />}
          label="Sample Rate"
          value={sampleRateFormatted}
          compact
        />
        {showRateAdjust && (
          <MetricItem
            icon={<RefreshCw className="w-4 h-4" />}
            label="Rate Adjust"
            value={rateAdjustFormatted}
            compact
          />
        )}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 p-3 bg-dsp-surface rounded-lg',
          className
        )}
        role="status"
        aria-label="Processing metrics"
      >
        {/* CPU Load */}
        <div className="space-y-1">
          <MetricItem
            icon={<Cpu className="w-4 h-4" />}
            label="CPU Load"
            value={`${processingLoad.toFixed(1)}%`}
            colorClass={cpuColor}
          />
          <ProgressBar value={processingLoad} colorClass={cpuColor} />
        </div>

        {/* Buffer Level */}
        <div className="space-y-1">
          <MetricItem
            icon={<HardDrive className="w-4 h-4" />}
            label="Buffer"
            value={`${bufferLevel.toFixed(0)}%`}
            colorClass={bufferColor}
          />
          <ProgressBar value={bufferLevel} colorClass={bufferColor} />
        </div>

        {/* Sample Rate */}
        <MetricItem
          icon={<Activity className="w-4 h-4" />}
          label="Sample Rate"
          value={sampleRateFormatted}
        />

        {/* Rate Adjust */}
        {showRateAdjust && (
          <MetricItem
            icon={<RefreshCw className="w-4 h-4" />}
            label="Rate Adjust"
            value={rateAdjustFormatted}
          />
        )}
      </div>
    );
  }

  // Default: horizontal layout
  return (
    <div
      className={cn(
        'flex items-center gap-6',
        className
      )}
      role="status"
      aria-label="Processing metrics"
    >
      <MetricItem
        icon={<Cpu className="w-4 h-4" />}
        label="CPU"
        value={`${processingLoad.toFixed(1)}%`}
        colorClass={cpuColor}
      />
      <MetricItem
        icon={<HardDrive className="w-4 h-4" />}
        label="Buffer"
        value={`${bufferLevel.toFixed(0)}%`}
        colorClass={bufferColor}
      />
      <MetricItem
        icon={<Activity className="w-4 h-4" />}
        label="Sample Rate"
        value={sampleRateFormatted}
      />
      {showRateAdjust && (
        <MetricItem
          icon={<RefreshCw className="w-4 h-4" />}
          label="Rate Adjust"
          value={rateAdjustFormatted}
        />
      )}
    </div>
  );
});

export interface ProcessingMetricsCardProps extends ProcessingMetricsProps {
  /** Card title */
  title?: string;
}

/**
 * Processing metrics in a card layout with title.
 */
export const ProcessingMetricsCard = React.memo(function ProcessingMetricsCard({
  title = 'Processing',
  ...props
}: ProcessingMetricsCardProps) {
  return (
    <div className="p-4 bg-dsp-surface rounded-lg border border-dsp-primary/30">
      <h3 className="text-sm font-medium text-dsp-text-muted mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <ProcessingMetrics {...props} layout="vertical" />
    </div>
  );
});

export interface StatusBarMetricsProps {
  /** CPU processing load as percentage (0-100) */
  processingLoad: number;
  /** Buffer fill level as percentage (0-100) */
  bufferLevel: number;
  /** Capture sample rate in Hz */
  captureSampleRate: number;
  /** Additional class names */
  className?: string;
}

/**
 * Compact processing metrics designed for the status bar.
 * Shows just the essential metrics in a single line.
 */
export const StatusBarMetrics = React.memo(function StatusBarMetrics({
  processingLoad,
  bufferLevel,
  captureSampleRate,
  className,
}: StatusBarMetricsProps) {
  const cpuColor = getCpuLoadColor(processingLoad);
  const bufferColor = getBufferLevelColor(bufferLevel);

  return (
    <div
      className={cn(
        'flex items-center gap-6 text-xs text-dsp-text-muted',
        className
      )}
      role="status"
      aria-label="Processing status"
    >
      <div className="flex items-center gap-2">
        <Cpu className={cn('w-4 h-4', cpuColor)} />
        <span>CPU: {processingLoad.toFixed(1)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <HardDrive className={cn('w-4 h-4', bufferColor)} />
        <span>Buffer: {bufferLevel.toFixed(0)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4" />
        <span>
          {captureSampleRate > 0
            ? `${(captureSampleRate / 1000).toFixed(1)} kHz`
            : '-- kHz'}
        </span>
      </div>
    </div>
  );
});
