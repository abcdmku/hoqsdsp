import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMemo } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { cn } from '../../../lib/utils';
import type { FilterType } from '../../../types';
import { INPUT_FILTER_TYPES, OUTPUT_FILTER_TYPES } from '../filterUi';
import { ChannelCardHeader } from './ChannelCardHeader';
import { ChannelFilterButtons } from './ChannelFilterButtons';
import { ChannelInlineControls } from './ChannelInlineControls';
import { useChannelInlineFilters } from './useChannelInlineFilters';

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

  const activeCounts = useMemo(() => countActiveFilters(processingFilters), [processingFilters]);
  const acceptedFilterTypes = side === 'input' ? INPUT_FILTER_TYPES : OUTPUT_FILTER_TYPES;
  const visibleFilterTypes = useMemo(() => {
    const inlineTypes: FilterType[] = ['Delay', 'Gain', 'Dither'];
    return acceptedFilterTypes.filter((type) => !inlineTypes.includes(type));
  }, [acceptedFilterTypes]);

  const {
    delayUnit,
    delayDisplayValue,
    gainDb,
    phaseInverted,
    ditherEnabled,
    ditherBits,
    applyDelay,
    applyGain,
    toggleDither,
    updateDitherBits,
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
          onApplyGain={applyGain}
          onApplyDelay={applyDelay}
          onDelayUnitChange={handleDelayUnitChange}
          onToggleDither={toggleDither}
          onUpdateDitherBits={updateDitherBits}
        >
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
