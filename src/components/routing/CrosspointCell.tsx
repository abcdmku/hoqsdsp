import { cn } from '../../lib/utils';
import type { MixerSource } from '../../types';

export interface CrosspointCellProps {
  source: MixerSource | undefined;
  isSelected: boolean;
  isFocused: boolean;
  inputIndex: number;
  outputIndex: number;
  onClick: () => void;
  onToggle: () => void;
  onPhaseToggle: () => void;
}

export function CrosspointCell({
  source,
  isSelected,
  isFocused,
  inputIndex,
  outputIndex,
  onClick,
  onToggle,
  onPhaseToggle,
}: CrosspointCellProps) {
  const isConnected = !!source && !source.mute;
  const isMuted = source?.mute;
  const isInverted = source?.inverted;

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && source) {
      onPhaseToggle();
    } else {
      onClick();
    }
  };

  const handleDoubleClick = () => {
    onToggle();
  };

  const formatGain = (gain: number): string => {
    if (gain === 0) return '0';
    return gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1);
  };

  return (
    <button
      type="button"
      className={cn(
        'w-16 h-10 flex items-center justify-center border',
        'transition-colors focus:outline-none',
        isSelected && 'ring-2 ring-dsp-accent ring-inset',
        isFocused && 'ring-2 ring-dsp-accent',
        isConnected
          ? 'bg-dsp-accent/20 border-dsp-accent/50 text-white'
          : isMuted
            ? 'bg-gray-600/20 border-gray-600/50 text-gray-500'
            : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="gridcell"
      aria-label={`Input ${inputIndex + 1} to Output ${outputIndex + 1}${source ? `, gain ${formatGain(source.gain)} dB${source.inverted ? ', phase inverted' : ''}${source.mute ? ', muted' : ''}` : ', not connected'}`}
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
    >
      {source ? (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'w-2 h-2 rounded-sm',
              source.mute ? 'bg-gray-500' : 'bg-dsp-accent'
            )}
          />
          <span className="text-xs font-mono">
            {formatGain(source.gain)}
          </span>
          {isInverted && <span className="text-meter-red text-xs">φ</span>}
        </div>
      ) : null}
    </button>
  );
}
