import type { ReactNode } from 'react';
import type { ChannelSide } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import { InlineNumberField } from './InlineNumberField';
import type { DelayDisplayUnit } from './delayUtils';

interface ChannelInlineControlsProps {
  label: string;
  side: ChannelSide;
  gainDb: number;
  phaseInverted: boolean;
  delayDisplayValue: number;
  delayUnit: DelayDisplayUnit;
  ditherEnabled: boolean;
  ditherBits: number;
  onApplyGain: (gainDb: number, inverted: boolean, options?: { debounce?: boolean }) => void;
  onApplyDelay: (value: number, unit: DelayDisplayUnit, options?: { debounce?: boolean }) => void;
  onDelayUnitChange: (unit: DelayDisplayUnit) => void;
  onToggleDither: () => void;
  onUpdateDitherBits: (bits: number, options?: { debounce?: boolean }) => void;
  children?: ReactNode;
}

export function ChannelInlineControls({
  label,
  side,
  gainDb,
  phaseInverted,
  delayDisplayValue,
  delayUnit,
  ditherEnabled,
  ditherBits,
  onApplyGain,
  onApplyDelay,
  onDelayUnitChange,
  onToggleDither,
  onUpdateDitherBits,
  children,
}: ChannelInlineControlsProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
      <div
        className="flex items-center gap-2"
        title={side === 'input'
          ? 'Input channel gain - affects all routes from this input'
          : 'Output channel gain - affects total output after all routes are summed'}
      >
        <span className="text-dsp-text-muted">{side === 'input' ? 'In' : 'Out'} Gain</span>
        <div
          className={cn(
            'flex h-7 items-center overflow-hidden rounded-md border bg-dsp-surface',
            Math.abs(gainDb) > 0.0001 ? 'border-filter-gain/50' : 'border-dsp-primary/30',
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <InlineNumberField
            value={gainDb}
            precision={1}
            min={-120}
            max={24}
            ariaLabel={`${label} gain`}
            onCommit={(next) => {
              onApplyGain(next, phaseInverted, { debounce: true });
            }}
            className="h-full w-14 bg-transparent px-1.5 text-right font-mono text-xs text-dsp-text outline-none focus:bg-dsp-bg/50 selection:bg-dsp-accent/30"
          />
          <span className="pr-2 text-[10px] text-dsp-text-muted">dB</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-dsp-text-muted">Delay</span>
        <div
          className={cn(
            'flex h-7 items-center overflow-hidden rounded-md border bg-dsp-surface',
            delayDisplayValue > 0.0001 ? 'border-filter-delay/50' : 'border-dsp-primary/30',
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <InlineNumberField
            value={delayDisplayValue}
            precision={delayUnit === 'ms' ? 2 : 2}
            min={0}
            ariaLabel={`${label} delay`}
            onCommit={(next) => {
              onApplyDelay(next, delayUnit, { debounce: true });
            }}
            className="h-full w-20 bg-transparent px-2 text-right font-mono text-xs text-dsp-text outline-none"
          />
          <select
            value={delayUnit}
            onChange={(e) => {
              onDelayUnitChange(e.target.value as DelayDisplayUnit);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-full bg-dsp-bg/40 px-2 text-xs text-dsp-text-muted outline-none"
            aria-label={`${label} delay unit`}
          >
            <option value="ms">ms</option>
            <option value="ft">ft</option>
            <option value="in">in</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        className={cn(
          'inline-flex h-7 items-center rounded-md border px-2 font-mono text-xs transition-colors',
          phaseInverted
            ? 'border-filter-gain/50 bg-filter-gain/15 text-filter-gain'
            : 'border-dsp-primary/30 bg-dsp-surface text-dsp-text-muted hover:border-dsp-primary/50 hover:text-dsp-text',
        )}
        aria-pressed={phaseInverted}
        aria-label={`${label} phase ${phaseInverted ? '180' : '0'} degrees`}
        title="Click to toggle phase (0 deg / 180 deg)"
        onClick={(e) => {
          e.stopPropagation();
          onApplyGain(gainDb, !phaseInverted);
        }}
      >
        {phaseInverted ? '180 deg' : '0 deg'}
      </button>

      {side === 'output' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2 text-xs transition-colors',
              ditherEnabled
                ? 'border-filter-dither/50 bg-filter-dither/15 text-filter-dither'
                : 'border-dsp-primary/30 bg-dsp-surface text-dsp-text-muted hover:border-dsp-primary/50 hover:text-dsp-text',
            )}
            aria-pressed={ditherEnabled}
            aria-label={`${label} dither ${ditherEnabled ? 'on' : 'off'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDither();
            }}
          >
            DTH
          </button>

          {ditherEnabled && (
            <select
              value={ditherBits}
              onChange={(e) => {
                const bits = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(bits)) return;
                onUpdateDitherBits(bits, { debounce: true });
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="h-7 rounded-md border border-filter-dither/40 bg-dsp-surface px-2 font-mono text-xs text-dsp-text outline-none"
              aria-label={`${label} dither bits`}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={32}>32</option>
            </select>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
