import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../lib/signalflow';
import { cn } from '../../lib/utils';
import type { DelayFilter, DitherFilter, FilterConfig, FilterType, GainFilter } from '../../types';
import { FILTER_UI, INPUT_FILTER_TYPES, OUTPUT_FILTER_TYPES, filterColorClasses } from './filterUi';
import { ColorPicker } from '../ui/ColorPicker';
import { InlineLevelMeter } from '../ui/InlineLevelMeter';

export interface ChannelCardProps {
  node: ChannelNode;
  side: ChannelSide;
  portKey: string;
  selected?: boolean;
  portHighlighted?: boolean;
  portDisabled?: boolean;
  channelColor?: string;
  connectionCount?: number;
  sampleRate?: number;
  /** Current signal level in dB (-60 to 0) */
  level?: number;
  /** Peak hold level in dB */
  peakHold?: number;
  onSelect?: () => void;
  onPortPointerDown?: (endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenFilter?: (type: FilterType, point?: { x: number; y: number }) => void;
  onOpenChannelSettings?: (point?: { x: number; y: number }) => void;
  onColorChange?: (color: string) => void;
  onLabelChange?: (label: string) => void;
  onOpenConnections?: (point?: { x: number; y: number }) => void;
  onUpdateFilters?: (filters: ChannelNode['processing']['filters'], options?: { debounce?: boolean }) => void;
}

type DelayDisplayUnit = 'ms' | 'ft' | 'in' | 'cm' | 'm';

const SPEED_OF_SOUND_MM_PER_MS = 343; // ~343 m/s
const MM_PER_IN = 25.4;
const MM_PER_FT = 12 * MM_PER_IN;
const MM_PER_CM = 10;
const MM_PER_M = 1000;

function delayDistanceMmFromValue(value: number, unit: Exclude<DelayDisplayUnit, 'ms'>): number {
  switch (unit) {
    case 'ft':
      return value * MM_PER_FT;
    case 'in':
      return value * MM_PER_IN;
    case 'cm':
      return value * MM_PER_CM;
    case 'm':
      return value * MM_PER_M;
    default:
      return value;
  }
}

function delayDistanceValueFromMm(mm: number, unit: Exclude<DelayDisplayUnit, 'ms'>): number {
  switch (unit) {
    case 'ft':
      return mm / MM_PER_FT;
    case 'in':
      return mm / MM_PER_IN;
    case 'cm':
      return mm / MM_PER_CM;
    case 'm':
      return mm / MM_PER_M;
    default:
      return mm;
  }
}

function delayMsFromSamples(samples: number, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  return (samples * 1000) / sampleRate;
}

function delayDistanceMmFromMs(ms: number): number {
  return ms * SPEED_OF_SOUND_MM_PER_MS;
}

function delayMsFromDistanceMm(mm: number): number {
  return mm / SPEED_OF_SOUND_MM_PER_MS;
}

interface InlineNumberFieldProps {
  value: number;
  precision: number;
  min?: number;
  max?: number;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
  onFocus?: () => void;
}

function InlineNumberField({
  value,
  precision,
  min = -Infinity,
  max = Infinity,
  ariaLabel,
  className,
  disabled,
  onCommit,
  onFocus,
}: InlineNumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = useCallback(
    (next: number) => Math.min(max, Math.max(min, next)),
    [max, min],
  );

  const commit = useCallback(() => {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed)) {
      onCommit(clamp(parsed));
    }
    setDraft(null);
  }, [clamp, draft, onCommit]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? value.toFixed(precision)}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onFocus={(e) => {
        onFocus?.();
        setDraft(value.toFixed(precision));
        e.currentTarget.select();
      }}
      onBlur={() => {
        commit();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
          return;
        }

        if (e.key === 'Escape') {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    />
  );
}


export function ChannelCard({
  node,
  side,
  portKey,
  selected = false,
  portHighlighted = false,
  portDisabled = false,
  channelColor,
  connectionCount = 0,
  sampleRate = 48000,
  level,
  peakHold,
  onSelect,
  onPortPointerDown,
  onOpenFilter,
  onOpenChannelSettings: _onOpenChannelSettings,
  onColorChange,
  onLabelChange,
  onOpenConnections,
  onUpdateFilters,
}: ChannelCardProps) {
  const endpoint: RouteEndpoint = { deviceId: node.deviceId, channelIndex: node.channelIndex };
  const portSide: 'left' | 'right' = side === 'input' ? 'right' : 'left';

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editingLabel, setEditingLabel] = useState(node.label);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const lastDitherParamsRef = useRef<DitherFilter['parameters']>({ type: 'Simple', bits: 16 });

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleLabelSave = () => {
    const trimmed = editingLabel.trim();
    if (trimmed && trimmed !== node.label) {
      onLabelChange?.(trimmed);
    } else {
      setEditingLabel(node.label);
    }
    setIsEditingLabel(false);
  };

  const acceptedFilterTypes = side === 'input' ? INPUT_FILTER_TYPES : OUTPUT_FILTER_TYPES;
  const activeCounts = useMemo(() => {
    const counts = new Map<FilterType, number>();
    for (const filter of node.processing.filters) {
      counts.set(filter.config.type, (counts.get(filter.config.type) ?? 0) + 1);
    }
    return counts;
  }, [node.processing.filters]);

  const delayFilter = useMemo(() => {
    const filter = node.processing.filters.find((f) => f.config.type === 'Delay')?.config ?? null;
    return filter?.type === 'Delay' ? filter : null;
  }, [node.processing.filters]);

  const gainFilter = useMemo(() => {
    const filter = node.processing.filters.find((f) => f.config.type === 'Gain')?.config ?? null;
    return filter?.type === 'Gain' ? filter : null;
  }, [node.processing.filters]);

  const ditherFilter = useMemo(() => {
    const filter = node.processing.filters.find((f) => f.config.type === 'Dither')?.config ?? null;
    return filter?.type === 'Dither' ? filter : null;
  }, [node.processing.filters]);

  const [delayUnit, setDelayUnit] = useState<DelayDisplayUnit>(() => {
    if (!delayFilter) return 'ms';
    if (delayFilter.parameters.unit === 'ms' || delayFilter.parameters.unit === 'samples') return 'ms';
    return 'ft';
  });

  const delayMs = useMemo(() => {
    if (!delayFilter) return 0;
    switch (delayFilter.parameters.unit) {
      case 'ms':
        return delayFilter.parameters.delay;
      case 'samples':
        return delayMsFromSamples(delayFilter.parameters.delay, sampleRate);
      case 'mm':
        return delayMsFromDistanceMm(delayFilter.parameters.delay);
      default:
        return 0;
    }
  }, [delayFilter, sampleRate]);

  const delayDisplayValue = useMemo(() => {
    if (delayUnit === 'ms') return delayMs;
    const distanceMm = delayFilter?.parameters.unit === 'mm'
      ? delayFilter.parameters.delay
      : delayDistanceMmFromMs(delayMs);
    return delayDistanceValueFromMm(distanceMm, delayUnit);
  }, [delayFilter, delayMs, delayUnit]);

  const gainDb = useMemo(() => {
    if (!gainFilter) return 0;
    const { gain, scale } = gainFilter.parameters;
    if (scale === 'linear') {
      if (gain <= 0) return -120;
      return 20 * Math.log10(gain);
    }
    return gain;
  }, [gainFilter]);

  const phaseInverted = gainFilter?.parameters.inverted ?? false;

  const ditherEnabled = ditherFilter ? ditherFilter.parameters.type !== 'None' : false;

  useEffect(() => {
    if (ditherFilter && ditherFilter.parameters.type !== 'None') {
      lastDitherParamsRef.current = ditherFilter.parameters;
    }
  }, [ditherFilter]);

  const upsertSingleFilterOfType = useCallback(
    (config: FilterConfig, options?: { debounce?: boolean }) => {
      const type = config.type;
      const current = node.processing.filters;
      const index = current.findIndex((filter) => filter.config.type === type);
      const next =
        index >= 0
          ? current.map((filter, idx) => (idx === index ? { ...filter, config } : filter))
          : [
              ...current,
              {
                name: `sf-${node.side}-ch${String(node.channelIndex + 1)}-${type.toLowerCase()}-${String(Date.now())}`,
                config,
              },
            ];
      onUpdateFilters?.(next, options);
    },
    [node.channelIndex, node.processing.filters, node.side, onUpdateFilters],
  );

  const removeFirstFilterOfType = useCallback(
    (type: FilterType, options?: { debounce?: boolean }) => {
      const current = node.processing.filters;
      const index = current.findIndex((filter) => filter.config.type === type);
      if (index < 0) return;
      const next = [...current.slice(0, index), ...current.slice(index + 1)];
      onUpdateFilters?.(next, options);
    },
    [node.processing.filters, onUpdateFilters],
  );

  const applyDelay = useCallback(
    (value: number, unit: DelayDisplayUnit, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(value) || value < 0) return;

      const subsample = delayFilter?.parameters.subsample ?? true;

      if (unit === 'ms') {
        if (value <= 0) {
          removeFirstFilterOfType('Delay', options);
          return;
        }

        const config: DelayFilter = {
          type: 'Delay',
          parameters: { delay: value, unit: 'ms', subsample },
        };
        upsertSingleFilterOfType(config, options);
        return;
      }

      const mm = delayDistanceMmFromValue(value, unit);
      if (mm <= 0) {
        removeFirstFilterOfType('Delay', options);
        return;
      }

      const config: DelayFilter = {
        type: 'Delay',
        parameters: { delay: mm, unit: 'mm', subsample },
      };
      upsertSingleFilterOfType(config, options);
    },
    [delayFilter, removeFirstFilterOfType, upsertSingleFilterOfType],
  );

  const applyGain = useCallback(
    (nextGainDb: number, nextInverted: boolean, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(nextGainDb)) return;
      if (Math.abs(nextGainDb) < 0.0001 && !nextInverted) {
        removeFirstFilterOfType('Gain', options);
        return;
      }

      const config: GainFilter = {
        type: 'Gain',
        parameters: { gain: nextGainDb, scale: 'dB', inverted: nextInverted },
      };
      upsertSingleFilterOfType(config, options);
    },
    [removeFirstFilterOfType, upsertSingleFilterOfType],
  );

  const toggleDither = useCallback(() => {
    if (ditherEnabled) {
      removeFirstFilterOfType('Dither');
      return;
    }

    const last = lastDitherParamsRef.current;
    const config: DitherFilter = {
      type: 'Dither',
      parameters: { ...last, type: last.type === 'None' ? 'Simple' : last.type },
    };
    upsertSingleFilterOfType(config);
  }, [ditherEnabled, removeFirstFilterOfType, upsertSingleFilterOfType]);

  const visibleFilterButtons = useMemo(() => {
    const inlineTypes: FilterType[] = ['Delay', 'Gain', 'Dither'];
    return acceptedFilterTypes.filter((type) => !inlineTypes.includes(type));
  }, [acceptedFilterTypes]);

  return (
    <div
      className={cn(
        cn(
          'relative rounded-md border bg-dsp-bg py-3',
          portSide === 'right' ? 'pl-3 pr-7' : 'pl-7 pr-3',
        ),
        'text-left text-sm text-dsp-text outline-none transition-colors',
        selected
          ? 'border-dsp-accent/70 ring-2 ring-dsp-accent/30'
          : 'border-dsp-primary/20 hover:border-dsp-primary/40',
      )}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${node.label}`}
      onClick={() => {
        onSelect?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <button
        type="button"
        className={cn(
          'absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full transition-colors',
          portDisabled
            ? 'cursor-not-allowed bg-dsp-primary/60'
            : cn(
                'hover:brightness-110',
                portHighlighted && 'ring-2 ring-dsp-accent/60',
              ),
          portSide === 'left'
            ? '-left-0.5 -translate-x-1/2'
            : '-right-0.5 translate-x-1/2',
        )}
        style={
          portDisabled
            ? undefined
            : channelColor
              ? { backgroundColor: channelColor }
              : { backgroundColor: 'var(--color-dsp-accent)' }
        }
        aria-label={side === 'input' ? `Connect ${node.label}` : `Output ${node.label}`}
        data-port-key={portKey}
        data-port-side={side}
        data-device-id={node.deviceId}
        data-channel-index={node.channelIndex}
        disabled={portDisabled}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          if (portDisabled) return;
          event.stopPropagation();
          onPortPointerDown?.(endpoint, event);
        }}
      />

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ColorPicker
              value={channelColor ?? '#22d3ee'}
              onChange={(color) => {
                onColorChange?.(color);
              }}
            />

            {isEditingLabel ? (
              <input
                ref={labelInputRef}
                type="text"
                value={editingLabel}
                onChange={(e) => { setEditingLabel(e.target.value); }}
                onBlur={handleLabelSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLabelSave();
                  } else if (e.key === 'Escape') {
                    setEditingLabel(node.label);
                    setIsEditingLabel(false);
                  }
                }}
                onClick={(e) => { e.stopPropagation(); }}
                className="min-w-0 flex-1 truncate bg-transparent font-medium text-dsp-text outline-none border-b border-dsp-accent"
              />
            ) : (
              <button
                type="button"
                className="min-w-0 truncate font-medium text-left hover:text-dsp-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabel(node.label);
                  setIsEditingLabel(true);
                }}
                title="Click to edit name"
              >
                {node.label}
              </button>
            )}
          </div>

          {/* Inline horizontal level meter with scale on top and dB value aligned on the right */}
          <InlineLevelMeter
            level={level ?? -100}
            peakHold={peakHold}
            minDb={-100}
            maxDb={12}
            showValue
            showScale
            scalePosition="top"
            valuePosition="right"
            smoothingMs={100}
            className="mx-1 mb-2 flex-1"
            meterClassName="min-w-12"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-dsp-text-muted">Gain</span>
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
                ariaLabel={`${node.label} gain`}
                onCommit={(next) => {
                  applyGain(next, phaseInverted, { debounce: true });
                }}
                className="h-full w-16 bg-transparent px-2 text-right font-mono text-xs text-dsp-text outline-none"
              />
              <span className="pr-2 text-[10px] text-dsp-text-muted">dB</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-dsp-text-muted">Delay</span>
            <div
              className={cn(
                'flex h-7 items-center overflow-hidden rounded-md border bg-dsp-surface',
                delayMs > 0.0001 ? 'border-filter-delay/50' : 'border-dsp-primary/30',
              )}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <InlineNumberField
                value={delayDisplayValue}
                precision={delayUnit === 'ms' ? 2 : 2}
                min={0}
                ariaLabel={`${node.label} delay`}
                onCommit={(next) => {
                  applyDelay(next, delayUnit, { debounce: true });
                }}
                className="h-full w-20 bg-transparent px-2 text-right font-mono text-xs text-dsp-text outline-none"
              />
              <select
                value={delayUnit}
                onChange={(e) => {
                  const nextUnit = e.target.value as DelayDisplayUnit;
                  setDelayUnit(nextUnit);

                  if (nextUnit === 'ms') {
                    applyDelay(delayMs, 'ms', { debounce: true });
                    return;
                  }

                  const mm = delayDistanceMmFromMs(delayMs);
                  const nextValue = delayDistanceValueFromMm(mm, nextUnit);
                  applyDelay(nextValue, nextUnit, { debounce: true });
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="h-full bg-dsp-bg/40 px-2 text-xs text-dsp-text-muted outline-none"
                aria-label={`${node.label} delay unit`}
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
            aria-label={`${node.label} phase ${phaseInverted ? '180' : '0'} degrees`}
            title="Click to toggle phase (0° / 180°)"
            onClick={(e) => {
              e.stopPropagation();
              applyGain(gainDb, !phaseInverted);
            }}
          >
            {phaseInverted ? '180°' : '0°'}
          </button>

          {visibleFilterButtons.map((type) => {
            const meta = FILTER_UI[type];
            const count = activeCounts.get(type) ?? 0;
            const active = count > 0;
            const colors = filterColorClasses(meta.color);
            const label = (() => {
              switch (type) {
                case 'Biquad':
                  return 'PEQ';
                case 'Compressor':
                  return 'COMP';
                case 'NoiseGate':
                  return 'GATE';
                case 'Loudness':
                  return 'LOUD';
                default:
                  return meta.shortLabel.toUpperCase().slice(0, 4);
              }
            })();

            return (
              <button
                key={type}
                type="button"
                className={cn(
                  'relative inline-flex h-7 min-w-12 items-center justify-center rounded-md border px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors',
                  active ? colors.active : colors.inactive,
                  'hover:border-dsp-accent/50 hover:text-dsp-text focus-visible:ring-2 focus-visible:ring-dsp-accent/50',
                )}
                aria-label={`${meta.label} (${side} ${node.channelIndex + 1})`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenFilter?.(type, { x: event.clientX, y: event.clientY });
                }}
              >
                <span>{label}</span>
                {type === 'Biquad' && count > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-3 rounded bg-dsp-accent px-0.5 text-[9px] font-semibold text-white">
                    {count > 9 ? '9+' : String(count)}
                  </span>
                )}
              </button>
            );
          })}

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
                aria-label={`${node.label} dither ${ditherEnabled ? 'on' : 'off'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDither();
                }}
              >
                DTH
              </button>

              {ditherEnabled && (
                <select
                  value={ditherFilter?.parameters.bits ?? 16}
                  onChange={(e) => {
                    const bits = Number.parseInt(e.target.value, 10);
                    if (!Number.isFinite(bits)) return;
                    const type = ditherFilter?.parameters.type ?? 'Simple';
                    upsertSingleFilterOfType({ type: 'Dither', parameters: { type, bits } }, { debounce: true });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="h-7 rounded-md border border-filter-dither/40 bg-dsp-surface px-2 font-mono text-xs text-dsp-text outline-none"
                  aria-label={`${node.label} dither bits`}
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                </select>
              )}
            </div>
          )}

          <button
            type="button"
            className={cn(
              'flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-xs transition-colors',
              connectionCount > 0
                ? 'border-dsp-accent/40 bg-dsp-accent/20 text-dsp-accent hover:bg-dsp-accent/30'
                : 'border-dsp-primary/30 bg-dsp-surface text-dsp-text-muted hover:border-dsp-primary/50 hover:text-dsp-text',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onOpenConnections?.({ x: e.clientX, y: e.clientY });
            }}
            title={`${connectionCount} connection${connectionCount === 1 ? '' : 's'} - Click to manage`}
            aria-label={`${node.label} connections`}
          >
            <Link2 className="h-3 w-3" />
            <span>{connectionCount}</span>
          </button>

        </div>
      </div>
    </div>
  );
}
