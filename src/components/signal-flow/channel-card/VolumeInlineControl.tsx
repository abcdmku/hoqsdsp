import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '../../../lib/utils';
import { InlineNumberField } from './InlineNumberField';

const MIN_MS = 0;
const MAX_MS = 5000;

function clampMs(value: number): number {
  if (!Number.isFinite(value)) return MIN_MS;
  return Math.min(MAX_MS, Math.max(MIN_MS, Math.round(value)));
}

interface VolumeInlineControlProps {
  label: string;
  rampEnabled: boolean;
  rampTimeMs: number;
  disabled?: boolean;
  onRampTimeChange?: (nextRampTimeMs: number, options?: { debounce?: boolean }) => void;
  onToggleRamp?: (enabled: boolean, rampTimeMs: number, options?: { debounce?: boolean }) => void;
}

export function VolumeInlineControl({
  label,
  rampEnabled,
  rampTimeMs,
  disabled = false,
  onRampTimeChange,
  onToggleRamp,
}: VolumeInlineControlProps) {
  const handleToggleClick = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onToggleRamp?.(!rampEnabled, clampMs(rampTimeMs), { debounce: true });
    },
    [disabled, onToggleRamp, rampEnabled, rampTimeMs],
  );

  return (
    <div
      className={cn(
        'inline-flex h-7 shrink-0 items-center overflow-hidden rounded-md border',
        disabled
          ? 'border-dsp-primary/20'
          : rampEnabled
            ? 'border-filter-gain/50'
            : 'border-dsp-primary/30',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          'inline-flex h-full items-center gap-1.5 px-2 font-mono text-xs transition-colors',
          disabled
            ? 'cursor-not-allowed bg-dsp-surface text-dsp-text-muted/60'
            : rampEnabled
              ? 'bg-filter-gain/20 text-filter-gain'
              : 'bg-dsp-surface text-dsp-text-muted hover:bg-dsp-bg/50 hover:text-dsp-text',
        )}
        aria-pressed={rampEnabled}
        aria-label={`${label} ramp time`}
        title="Volume ramp time (ms)"
        onClick={handleToggleClick}
      >
        <span>RAMP</span>
      </button>

      <div
        className={cn(
          'flex h-full w-14 items-center border-l px-1',
          disabled
            ? 'border-dsp-primary/20 bg-dsp-surface text-dsp-text-muted/60'
            : rampEnabled
              ? 'border-filter-gain/30 bg-filter-gain/10'
              : 'border-dsp-primary/20 bg-dsp-surface',
        )}
      >
        <InlineNumberField
          value={clampMs(rampTimeMs)}
          precision={0}
          min={MIN_MS}
          max={MAX_MS}
          disabled={disabled}
          ariaLabel={`${label} ramp time ms`}
          onCommit={(next) => {
            onRampTimeChange?.(clampMs(next), { debounce: true });
          }}
          className="h-full w-8 bg-transparent px-0.5 text-right font-mono text-xs text-dsp-text outline-none selection:bg-dsp-accent/30 disabled:text-dsp-text-muted/60"
        />
        <span className="text-[10px] text-dsp-text-muted">ms</span>
      </div>
    </div>
  );
}
