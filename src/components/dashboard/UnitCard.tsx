import * as React from 'react';
import { Volume2, VolumeX, Settings, Wifi, WifiOff, AlertCircle, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { StereoVolumeMeter, MultiChannelVolumeMeter } from '../monitoring/VolumeMeter';
import type { ChannelLevelState } from '../../features/realtime';
import type { DSPUnit, ConnectionStatus } from '../../types';

export interface UnitCardProps {
  unit: DSPUnit;
  status: ConnectionStatus;
  /** Optional version string from CamillaDSP */
  version?: string;
  /** Last seen timestamp */
  lastSeen?: number;
  /** Current volume in dB */
  volume?: number;
  /** Mute state */
  muted?: boolean;
  /** Sample rate from device */
  sampleRate?: number;
  /** Processing load percentage (0-100) */
  processingLoad?: number;
  /** Buffer fill level percentage (0-100) */
  bufferLevel?: number;
  /** Input channel count */
  inputChannels?: number;
  /** Output channel count */
  outputChannels?: number;
  /** Signal levels for all input channels */
  inputLevels?: ChannelLevelState[];
  /** Signal levels for all output channels */
  outputLevels?: ChannelLevelState[];
  /** Whether clipping has been detected */
  clipping?: boolean;
  /** Whether this unit is currently selected */
  isSelected?: boolean;
  /** Callback when unit card is clicked */
  onClick?: () => void;
  /** Callback when volume changes */
  onVolumeChange?: (volume: number) => void;
  /** Callback when mute is toggled */
  onMuteToggle?: () => void;
  /** Callback when settings button is clicked */
  onSettingsClick?: () => void;
  /** Whether the unit has a loaded configuration */
  hasConfig?: boolean;
  /** Callback when auto setup button is clicked */
  onAutoSetup?: () => void;
  /** Whether auto setup is currently running */
  isAutoSetupRunning?: boolean;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  connected: { color: 'bg-status-online', icon: Wifi, label: 'Connected' },
  connecting: { color: 'bg-meter-yellow animate-pulse', icon: Wifi, label: 'Connecting...' },
  disconnected: { color: 'bg-status-offline', icon: WifiOff, label: 'Disconnected' },
  error: { color: 'bg-status-error', icon: AlertCircle, label: 'Error' },
};

/**
 * Format a timestamp to a human-readable "time ago" string.
 * This is a pure function that takes both the timestamp and current time.
 */
function formatTimeDiff(timestamp: number, now: number): string {
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}

/**
 * Card component displaying a single CamillaDSP unit.
 * Shows status, metrics, and quick controls.
 */
export const UnitCard = React.memo(function UnitCard({
  unit,
  status,
  version,
  lastSeen,
  volume = 0,
  muted = false,
  sampleRate,
  processingLoad,
  bufferLevel,
  inputChannels,
  outputChannels,
  inputLevels,
  outputLevels,
  clipping = false,
  isSelected = false,
  onClick,
  onVolumeChange,
  onMuteToggle,
  onSettingsClick,
  hasConfig,
  onAutoSetup,
  isAutoSetupRunning = false,
  className,
}: UnitCardProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
  const isOnline = status === 'connected';

  // Track time for "last seen" display - use state so we can update it
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());

  // Update time periodically when offline to keep "last seen" fresh
  React.useEffect(() => {
    if (isOnline || !lastSeen) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute
    return () => { clearInterval(interval); };
  }, [isOnline, lastSeen]);

  const handleVolumeChange = (values: number[]) => {
    if (onVolumeChange && values[0] !== undefined) {
      onVolumeChange(values[0]);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-dsp-surface p-4 transition-all',
        isSelected
          ? 'border-dsp-accent ring-1 ring-dsp-accent'
          : 'border-dsp-primary/30 hover:border-dsp-primary/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-dsp-text">
            {unit.name}
          </h3>
          <p className="text-xs text-dsp-text-muted">
            {unit.address}:{unit.port}
          </p>
        </div>

        {/* Status indicator */}
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', statusInfo.color)} />
            <StatusIcon className={cn(
              'h-4 w-4',
              status === 'error' ? 'text-status-error' : 'text-dsp-text-muted'
            )} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusInfo.label}</p>
            {!isOnline && lastSeen && (
              <p className="text-xs text-dsp-text-muted">
                Last seen: {formatTimeDiff(lastSeen, currentTime)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Zone badge */}
      {unit.zone && (
        <span className="mb-3 inline-block rounded bg-dsp-primary/50 px-2 py-0.5 text-xs text-dsp-text-muted">
          {unit.zone}
        </span>
      )}

      {/* Metrics row */}
      {isOnline && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          {sampleRate !== undefined && (
            <div className="flex flex-col">
              <span className="text-dsp-text-muted">Sample Rate</span>
              <span className="font-medium text-dsp-text">
                {(sampleRate / 1000).toFixed(1)} kHz
              </span>
            </div>
          )}
          {inputChannels !== undefined && outputChannels !== undefined && (
            <div className="flex flex-col">
              <span className="text-dsp-text-muted">Channels</span>
              <span className="font-medium text-dsp-text">
                {inputChannels} → {outputChannels}
              </span>
            </div>
          )}
          {processingLoad !== undefined && (
            <div className="flex flex-col">
              <span className="text-dsp-text-muted">CPU Load</span>
              <span className={cn(
                'font-medium',
                processingLoad > 80 ? 'text-meter-red' :
                processingLoad > 50 ? 'text-meter-yellow' : 'text-meter-green'
              )}>
                {processingLoad.toFixed(1)}%
              </span>
            </div>
          )}
          {bufferLevel !== undefined && (
            <div className="flex flex-col">
              <span className="text-dsp-text-muted">Buffer</span>
              <span className={cn(
                'font-medium',
                bufferLevel < 20 ? 'text-meter-red' :
                bufferLevel < 50 ? 'text-meter-yellow' : 'text-meter-green'
              )}>
                {bufferLevel.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Level meters */}
      {isOnline && (inputLevels ?? outputLevels) && (
        <div className="mb-3 flex items-center gap-4">
          {inputLevels && inputLevels.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-dsp-text-muted">IN</span>
              {inputLevels.length <= 2 ? (
                <StereoVolumeMeter
                  leftLevel={inputLevels[0]?.peak ?? -60}
                  rightLevel={inputLevels[1]?.peak ?? inputLevels[0]?.peak ?? -60}
                  leftPeak={inputLevels[0]?.peakHold}
                  rightPeak={inputLevels[1]?.peakHold ?? inputLevels[0]?.peakHold}
                  size="xs"
                  orientation="vertical"
                  mode="gradient"
                  clipping={clipping}
                />
              ) : (
                <MultiChannelVolumeMeter
                  levels={inputLevels.map((l) => l.peak)}
                  peaks={inputLevels.map((l) => l.peakHold)}
                  size="xs"
                  orientation="vertical"
                  mode="gradient"
                  clippingChannels={inputLevels.map(() => clipping)}
                />
              )}
            </div>
          )}
          {outputLevels && outputLevels.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-dsp-text-muted">OUT</span>
              {outputLevels.length <= 2 ? (
                <StereoVolumeMeter
                  leftLevel={outputLevels[0]?.peak ?? -60}
                  rightLevel={outputLevels[1]?.peak ?? outputLevels[0]?.peak ?? -60}
                  leftPeak={outputLevels[0]?.peakHold}
                  rightPeak={outputLevels[1]?.peakHold ?? outputLevels[0]?.peakHold}
                  size="xs"
                  orientation="vertical"
                  mode="gradient"
                  clipping={clipping}
                />
              ) : (
                <MultiChannelVolumeMeter
                  levels={outputLevels.map((l) => l.peak)}
                  peaks={outputLevels.map((l) => l.peakHold)}
                  size="xs"
                  orientation="vertical"
                  mode="gradient"
                  clippingChannels={outputLevels.map(() => clipping)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Volume control */}
      {isOnline && onVolumeChange && (
        <div className="mb-3 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md hover:bg-dsp-primary/50"
              onClick={(e) => {
                e.stopPropagation();
                onMuteToggle?.();
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-meter-red" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {muted ? 'Unmute' : 'Mute'}
            </TooltipContent>
          </Tooltip>

          <Slider
            value={[volume]}
            min={-60}
            max={0}
            step={0.5}
            disabled={muted}
            onValueChange={handleVolumeChange}
            className="flex-1"
            aria-label="Volume"
            onClick={(e) => { e.stopPropagation(); }}
          />

          <span className={cn(
            'w-12 text-right text-xs font-mono',
            muted ? 'text-dsp-text-muted' : 'text-dsp-text'
          )}>
            {volume.toFixed(1)} dB
          </span>
        </div>
      )}

      {/* Version info */}
      {isOnline && version && (
        <p className="mb-2 text-[10px] text-dsp-text-muted">
          CamillaDSP {version}
        </p>
      )}

      {/* Auto Setup button - always shown when connected */}
      {isOnline && onAutoSetup && (
        <Button
          variant={hasConfig === false ? 'default' : 'outline'}
          size="sm"
          className="mt-2 w-full"
          disabled={isAutoSetupRunning}
          onClick={(e) => {
            e.stopPropagation();
            onAutoSetup();
          }}
        >
          <Zap className="mr-2 h-4 w-4" />
          {isAutoSetupRunning ? 'Setting up...' : 'Auto Setup'}
        </Button>
      )}

      {/* Settings button */}
      {onSettingsClick && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      )}
    </div>
  );
});
