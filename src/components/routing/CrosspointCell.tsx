import { cn } from '../../lib/utils';
import type { MixerSource } from '../../types';

export type CrosspointToolPreview =
  | { kind: 'gain'; gain: number }
  | { kind: 'phase'; inverted: boolean }
  | { kind: 'mute'; mute: boolean }
  | { kind: 'disconnect' }
  | null;

export interface CrosspointCellProps {
  source: MixerSource | undefined;
  isSelected: boolean;
  isFocused: boolean;
  inputIndex: number;
  outputIndex: number;
  className?: string;
  dataCellId?: string;
  preview?: CrosspointToolPreview;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggle: () => void;
}

export function CrosspointCell({
  source,
  isSelected,
  isFocused,
  inputIndex,
  outputIndex,
  className,
  dataCellId,
  preview = null,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onToggle,
}: CrosspointCellProps) {
  const isConnected = !!source && !source.mute;
  const isMuted = source?.mute;
  const isInverted = source?.inverted;

  const handleDoubleClick = () => {
    onToggle();
  };

  const formatGainValue = (gain: number): string => {
    return gain === 0 ? '0.0' : gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1);
  };

  const formatGainLabel = (gain: number): string => `${formatGainValue(gain)} dB`;

  const previewColorClass =
    preview?.kind === 'disconnect'
      ? 'border-meter-red/80 bg-meter-red/30'
      : preview?.kind === 'mute'
        ? 'border-dsp-primary/80 bg-dsp-primary/30'
        : 'border-dsp-accent/80 bg-dsp-accent/30';

  const previewLabel = (() => {
    if (!preview) return null;
    switch (preview.kind) {
      case 'gain':
        return formatGainLabel(preview.gain);
      case 'phase':
        return preview.inverted ? `180\u00B0` : `0\u00B0`;
      case 'mute':
        return preview.mute ? 'Mute' : 'Unmute';
      case 'disconnect':
        return 'Disconnect';
    }
  })();

  return (
    <button
      type="button"
      className={cn(
        'relative w-16 h-10 flex items-center justify-center border',
        'transition-colors focus:outline-none',
        'border-dsp-primary/30',
        isSelected && 'ring-2 ring-dsp-accent/50 ring-inset',
        isFocused && 'ring-2 ring-dsp-accent/35',
        isConnected
          ? 'bg-dsp-accent/20 border-dsp-accent/50 text-dsp-text'
          : isMuted
            ? 'bg-dsp-primary/15 border-dsp-primary/40 text-dsp-text-muted'
            : 'bg-transparent text-dsp-text-muted hover:bg-dsp-primary/15 hover:border-dsp-primary/50',
        className,
      )}
      data-cell-id={dataCellId}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="gridcell"
      aria-label={`Input ${inputIndex + 1} to Output ${outputIndex + 1}${
        source
          ? `, gain ${formatGainValue(source.gain)} dB${source.inverted ? ', phase inverted' : ''}${source.mute ? ', muted' : ''}`
          : ', not connected'
      }`}
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
    >
      {preview && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm border-2 border-dashed text-dsp-text',
            previewColorClass,
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              'text-[10px] font-semibold tracking-wide',
              preview.kind === 'gain' && 'font-mono',
            )}
          >
            {previewLabel}
          </span>
        </div>
      )}
      {source ? (
        <div className={cn('flex items-center gap-1', preview && 'opacity-0')}>
          <span className="text-xs font-mono tabular-nums">{formatGainLabel(source.gain)}</span>
          {isInverted && (
            <span className="text-meter-red text-[10px] font-mono tabular-nums" aria-label="Phase 180 degrees">
              {`180\u00B0`}
            </span>
          )}
        </div>
      ) : null}
    </button>
  );
}
