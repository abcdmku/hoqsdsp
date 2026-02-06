import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import type { FilterType } from '../../../types';
import { INPUT_FILTER_TYPES, OUTPUT_FILTER_TYPES } from '../filterUi';
import { ChannelCardHeader } from './ChannelCardHeader';
import { ChannelFilterButtons } from './ChannelFilterButtons';
import { ChannelInlineControls } from './ChannelInlineControls';
import { useChannelInlineFilters } from './useChannelInlineFilters';
import { VolumeInlineControl } from './VolumeInlineControl';
import { upsertSingleFilterOfType } from '../../../lib/signalflow/filterUtils';
import type { VolumeFilter } from '../../../types';

const DEFAULT_RAMP_TIME_MS = 200;
const DEFAULT_VOLUME_FADER = 'Aux1' as const;

function clampRampTimeMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export interface ChannelCardProps {
  node: ChannelNode;
  side: ChannelSide;
  portKey: string;
  selected?: boolean;
  portHighlighted?: boolean;
  routeHighlighted?: boolean;
  portDisabled?: boolean;
  channelColor?: string;
  connectionCount?: number;
  sampleRate?: number;
  level?: number;
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

function countActiveFilters(filters: ChannelNode['processing']['filters']): Map<FilterType, number> {
  const counts = new Map<FilterType, number>();
  for (const filter of filters) {
    if (filter.config.type === 'Conv') {
      const params = filter.config.parameters;
      const applied = params.type !== 'Values' || params.values.length !== 1 || Math.abs((params.values[0] ?? 0) - 1) > 1e-12;
      if (!applied) continue;
    }
    counts.set(filter.config.type, (counts.get(filter.config.type) ?? 0) + 1);
  }
  return counts;
}

export function ChannelCard({
  node,
  side,
  portKey,
  selected = false,
  portHighlighted = false,
  routeHighlighted = false,
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
  const processingFilters = node.processing.filters;

  const activeCounts = useMemo(() => {
    const counts = countActiveFilters(processingFilters);
    // Some filter steps (global or multi-channel) are currently not represented in `node.processing.filters`.
    // Still surface "active" state for the most common dynamics filters so the buttons reflect reality.
    if (node.processingSummary.hasCompressor && !counts.has('Compressor')) counts.set('Compressor', 1);
    if (node.processingSummary.hasNoiseGate && !counts.has('NoiseGate')) counts.set('NoiseGate', 1);
    if (node.processingSummary.hasLoudness && !counts.has('Loudness')) counts.set('Loudness', 1);
    return counts;
  }, [node.processingSummary.hasCompressor, node.processingSummary.hasLoudness, node.processingSummary.hasNoiseGate, processingFilters]);
  const acceptedFilterTypes = side === 'input' ? INPUT_FILTER_TYPES : OUTPUT_FILTER_TYPES;
  const visibleFilterTypes = useMemo(() => {
    const inlineTypes: FilterType[] = ['Delay', 'Gain', 'Volume', 'Dither'];
    return acceptedFilterTypes.filter((type) => !inlineTypes.includes(type));
  }, [acceptedFilterTypes]);

  const volumeFilter = useMemo(() => {
    const filter = processingFilters.find((f) => f.config.type === 'Volume')?.config ?? null;
    return filter?.type === 'Volume' ? filter : null;
  }, [processingFilters]);

  const volumeRampEnabled = useMemo(() => {
    const ramp = volumeFilter?.parameters.ramp_time;
    return typeof ramp === 'number' && Number.isFinite(ramp);
  }, [volumeFilter]);

  const activeVolumeRampTimeMs = useMemo(() => {
    const ramp = volumeFilter?.parameters.ramp_time;
    if (typeof ramp !== 'number' || !Number.isFinite(ramp)) return DEFAULT_RAMP_TIME_MS;
    return clampRampTimeMs(ramp);
  }, [volumeFilter]);

  const [volumeRampDraftMs, setVolumeRampDraftMs] = useState<number>(activeVolumeRampTimeMs);

  useEffect(() => {
    if (!volumeRampEnabled) return;
    setVolumeRampDraftMs((prev) => (prev === activeVolumeRampTimeMs ? prev : activeVolumeRampTimeMs));
  }, [activeVolumeRampTimeMs, volumeRampEnabled]);

  const setVolumeRampParameter = useCallback(
    (nextRampTimeMs: number | undefined, options?: { debounce?: boolean }) => {
      if (!onUpdateFilters) return;
      if (nextRampTimeMs !== undefined && !Number.isFinite(nextRampTimeMs)) return;
      if (!volumeFilter && nextRampTimeMs === undefined) return;

      const normalized = nextRampTimeMs === undefined ? undefined : clampRampTimeMs(nextRampTimeMs);
      const current = volumeFilter?.parameters.ramp_time;
      if (normalized === current) return;

      const base: VolumeFilter = volumeFilter ?? { type: 'Volume', parameters: { fader: DEFAULT_VOLUME_FADER } };
      const nextParameters = { ...base.parameters };
      if (normalized === undefined) {
        delete nextParameters.ramp_time;
      } else {
        nextParameters.ramp_time = normalized;
      }

      const nextConfig: VolumeFilter = {
        type: 'Volume',
        parameters: nextParameters,
      };

      const nameBase = `${node.side[0]}${String(node.channelIndex)}_volume`;
      onUpdateFilters(upsertSingleFilterOfType(processingFilters, nextConfig, nameBase), options);
    },
    [node.channelIndex, node.side, onUpdateFilters, processingFilters, volumeFilter],
  );

  const applyVolumeRampTime = useCallback(
    (nextRampTimeMs: number, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(nextRampTimeMs)) return;
      const next = clampRampTimeMs(nextRampTimeMs);
      setVolumeRampDraftMs((prev) => (prev === next ? prev : next));
      if (!volumeRampEnabled) return;
      setVolumeRampParameter(next, options);
    },
    [setVolumeRampParameter, volumeRampEnabled],
  );

  const toggleVolumeRamp = useCallback(
    (enabled: boolean, rampTimeMs: number, options?: { debounce?: boolean }) => {
      const next = clampRampTimeMs(rampTimeMs);
      setVolumeRampDraftMs((prev) => (prev === next ? prev : next));
      if (enabled) {
        setVolumeRampParameter(next, options);
        return;
      }
      setVolumeRampParameter(undefined, options);
    },
    [setVolumeRampParameter],
  );

  const volumeRampTimeMs = volumeRampEnabled ? activeVolumeRampTimeMs : volumeRampDraftMs;

  const {
    delayUnit,
    delayDisplayValue,
    gainDb,
    phaseInverted,
    ditherEnabled,
    ditherBits,
    ditherType,
    ditherAmplitude,
    applyDelay,
    applyGain,
    toggleDither,
    updateDitherBits,
    updateDitherType,
    updateDitherAmplitude,
    handleDelayUnitChange,
  } = useChannelInlineFilters({ node, sampleRate, onUpdateFilters });

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
          : routeHighlighted
            ? 'border-dsp-accent/50 bg-dsp-accent/5 ring-1 ring-dsp-accent/20'
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
            : cn('hover:brightness-110', portHighlighted && 'ring-2 ring-dsp-accent/60'),
          portSide === 'left' ? '-left-0.5 -translate-x-1/2' : '-right-0.5 translate-x-1/2',
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
        <ChannelCardHeader
          label={node.label}
          channelColor={channelColor}
          level={level}
          peakHold={peakHold}
          onColorChange={onColorChange}
          onLabelChange={onLabelChange}
        />

        <ChannelInlineControls
          label={node.label}
          side={side}
          gainDb={gainDb}
          phaseInverted={phaseInverted}
          delayDisplayValue={delayDisplayValue}
          delayUnit={delayUnit}
          ditherEnabled={ditherEnabled}
          ditherBits={ditherBits}
          ditherType={ditherType}
          ditherAmplitude={ditherAmplitude}
          onApplyGain={applyGain}
          onApplyDelay={applyDelay}
          onDelayUnitChange={handleDelayUnitChange}
          onToggleDither={toggleDither}
          onUpdateDitherBits={updateDitherBits}
          onUpdateDitherType={updateDitherType}
          onUpdateDitherAmplitude={updateDitherAmplitude}
        >
          <VolumeInlineControl
            label={node.label}
            rampEnabled={volumeRampEnabled}
            rampTimeMs={volumeRampTimeMs}
            disabled={!onUpdateFilters}
            onRampTimeChange={applyVolumeRampTime}
            onToggleRamp={toggleVolumeRamp}
          />
          <ChannelFilterButtons
            node={node}
            visibleFilterTypes={visibleFilterTypes}
            activeCounts={activeCounts}
            connectionCount={connectionCount}
            onOpenFilter={onOpenFilter}
            onOpenConnections={onOpenConnections}
          />
        </ChannelInlineControls>
      </div>
    </div>
  );
}
