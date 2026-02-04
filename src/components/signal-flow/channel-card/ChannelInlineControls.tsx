import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChannelSide } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import type { DitherParameters } from '../../../types';
import { DitherSettingsDropdown } from '../../filters/DitherSettingsDropdown';
import { InlineNumberField } from './InlineNumberField';
import type { DelayDisplayUnit } from './delayUtils';

const HOVER_DELAY_MS = 400;

interface DitherControlProps {
  label: string;
  ditherEnabled: boolean;
  ditherBits: number;
  ditherType?: DitherParameters['type'];
  ditherAmplitude?: number;
  onToggleDither: () => void;
  onUpdateDitherBits: (bits: number, options?: { debounce?: boolean }) => void;
  onUpdateDitherType?: (type: DitherParameters['type'], options?: { debounce?: boolean }) => void;
  onUpdateDitherAmplitude?: (amplitude: number, options?: { debounce?: boolean }) => void;
}

function DitherControl({
  label,
  ditherEnabled,
  ditherBits,
  ditherType,
  ditherAmplitude,
  onToggleDither,
  onUpdateDitherBits,
  onUpdateDitherType,
  onUpdateDitherAmplitude,
}: DitherControlProps) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownOpenRef = useRef(false);
  const prevEnabledRef = useRef(ditherEnabled);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // Collapse when clicking outside or pressing Escape
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpenRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setPinned(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dropdownOpenRef.current) {
        setExpanded(false);
        setPinned(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  // Auto-expand and pin when dither becomes enabled
  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = ditherEnabled;

    // Avoid auto-opening on initial mount/navigation when already enabled.
    // Only expand when transitioning from disabled -> enabled.
    if (!wasEnabled && ditherEnabled) {
      setExpanded(true);
      setPinned(true);
    }
  }, [ditherEnabled]);

  const handleDthClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!ditherEnabled) {
        // Not enabled → enable (will auto-expand+pin via useEffect)
        onToggleDither();
      } else if (expanded && pinned) {
        // Enabled + expanded + pinned → disable
        onToggleDither();
        setExpanded(false);
        setPinned(false);
      } else if (expanded && !pinned) {
        // Enabled + expanded but not pinned (hover-opened) → pin it
        setPinned(true);
      } else {
        // Enabled + collapsed → expand + pin
        setExpanded(true);
        setPinned(true);
      }
    },
    [ditherEnabled, expanded, pinned, onToggleDither],
  );

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!expanded && ditherEnabled) {
      hoverTimeoutRef.current = setTimeout(() => {
        setExpanded(true);
        // Don't pin - this is a hover-open
      }, HOVER_DELAY_MS);
    }
  }, [expanded, ditherEnabled]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (expanded && !pinned && !dropdownOpenRef.current) {
      leaveTimeoutRef.current = setTimeout(() => {
        setExpanded(false);
      }, 150);
    }
  }, [expanded, pinned]);

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    dropdownOpenRef.current = open;
    // Pin when opening dropdown (user is interacting)
    if (open) {
      setPinned(true);
    }
  }, []);

  // Pin when user interacts with any control
  const handleInteraction = useCallback(() => {
    if (expanded && !pinned) {
      setPinned(true);
    }
  }, [expanded, pinned]);

  const showSettings = expanded && ditherEnabled;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'flex h-7 items-center overflow-hidden rounded-md border',
        ditherEnabled
          ? 'border-filter-dither/50'
          : 'border-dsp-primary/30',
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <button
        type="button"
        className={cn(
          'inline-flex h-full items-center px-2 text-xs transition-colors',
          ditherEnabled
            ? 'bg-filter-dither/15 text-filter-dither'
            : 'bg-dsp-surface text-dsp-text-muted hover:bg-dsp-bg/50 hover:text-dsp-text',
        )}
        aria-pressed={ditherEnabled}
        aria-label={`${label} dither ${ditherEnabled ? 'on' : 'off'}`}
        onClick={handleDthClick}
      >
        DTH
      </button>

      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.div
            className="flex items-center overflow-hidden"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="h-4 w-px bg-filter-dither/30" />
            <select
              value={ditherBits}
              onChange={(e) => {
                handleInteraction();
                const bits = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(bits)) return;
                onUpdateDitherBits(bits, { debounce: true });
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction();
              }}
              onFocus={handleInteraction}
              className="h-7 bg-dsp-surface px-2 font-mono text-xs text-dsp-text outline-none hover:bg-dsp-bg/50"
              aria-label={`${label} dither bits`}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={32}>32</option>
            </select>

            {onUpdateDitherType && ditherType && (
              <>
                <div className="h-4 w-px bg-filter-dither/30" />
                <DitherSettingsDropdown
                  ditherType={ditherType}
                  amplitude={ditherAmplitude}
                  onTypeChange={(type) => onUpdateDitherType(type, { debounce: true })}
                  onAmplitudeChange={onUpdateDitherAmplitude ? (amp) => onUpdateDitherAmplitude(amp, { debounce: true }) : undefined}
                  onOpenChange={handleDropdownOpenChange}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface ChannelInlineControlsProps {
  label: string;
  side: ChannelSide;
  gainDb: number;
  phaseInverted: boolean;
  delayDisplayValue: number;
  delayUnit: DelayDisplayUnit;
  ditherEnabled: boolean;
  ditherBits: number;
  ditherType?: DitherParameters['type'];
  ditherAmplitude?: number;
  onApplyGain: (gainDb: number, inverted: boolean, options?: { debounce?: boolean }) => void;
  onApplyDelay: (value: number, unit: DelayDisplayUnit, options?: { debounce?: boolean }) => void;
  onDelayUnitChange: (unit: DelayDisplayUnit) => void;
  onToggleDither: () => void;
  onUpdateDitherBits: (bits: number, options?: { debounce?: boolean }) => void;
  onUpdateDitherType?: (type: DitherParameters['type'], options?: { debounce?: boolean }) => void;
  onUpdateDitherAmplitude?: (amplitude: number, options?: { debounce?: boolean }) => void;
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
  ditherType,
  ditherAmplitude,
  onApplyGain,
  onApplyDelay,
  onDelayUnitChange,
  onToggleDither,
  onUpdateDitherBits,
  onUpdateDitherType,
  onUpdateDitherAmplitude,
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
        <DitherControl
          label={label}
          ditherEnabled={ditherEnabled}
          ditherBits={ditherBits}
          ditherType={ditherType}
          ditherAmplitude={ditherAmplitude}
          onToggleDither={onToggleDither}
          onUpdateDitherBits={onUpdateDitherBits}
          onUpdateDitherType={onUpdateDitherType}
          onUpdateDitherAmplitude={onUpdateDitherAmplitude}
        />
      )}

      {children}
    </div>
  );
}
