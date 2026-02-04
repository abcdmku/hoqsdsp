import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelNode, ChannelProcessingFilter } from '../../../lib/signalflow';
import { removeFirstFilterOfType, upsertSingleFilterOfType } from '../../../lib/signalflow/filterUtils';
import type { DelayFilter, DitherFilter, DitherParameters, FilterConfig, FilterType, GainFilter } from '../../../types';
import { delayDistanceMmFromMs, delayDistanceMmFromValue, delayDistanceValueFromMm, delayMsFromDistanceMm, delayMsFromSamples, type DelayDisplayUnit } from './delayUtils';
function buildDelayConfig(delay: number, unit: 'ms' | 'mm', subsample: boolean): DelayFilter {
  return { type: 'Delay', parameters: { delay, unit, subsample } };
}
interface UseChannelInlineFiltersParams {
  node: ChannelNode;
  sampleRate: number;
  onUpdateFilters?: (filters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => void;
}

export interface ChannelInlineFilters {
  delayUnit: DelayDisplayUnit;
  delayDisplayValue: number;
  delayMs: number;
  gainDb: number;
  phaseInverted: boolean;
  ditherEnabled: boolean;
  ditherBits: number;
  ditherType: DitherParameters['type'] | undefined;
  ditherAmplitude: number;
  applyDelay: (value: number, unit: DelayDisplayUnit, options?: { debounce?: boolean }) => void;
  applyGain: (nextGainDb: number, nextInverted: boolean, options?: { debounce?: boolean }) => void;
  toggleDither: () => void;
  updateDitherBits: (bits: number, options?: { debounce?: boolean }) => void;
  updateDitherType: (type: DitherParameters['type'], options?: { debounce?: boolean }) => void;
  updateDitherAmplitude: (amplitude: number, options?: { debounce?: boolean }) => void;
  handleDelayUnitChange: (unit: DelayDisplayUnit) => void;
}
export function useChannelInlineFilters({
  node,
  sampleRate,
  onUpdateFilters,
}: UseChannelInlineFiltersParams): ChannelInlineFilters {
  const filters = node.processing.filters;

  const delayFilter = useMemo(() => {
    const filter = filters.find((f) => f.config.type === 'Delay')?.config ?? null;
    return filter?.type === 'Delay' ? filter : null;
  }, [filters]);

  const gainFilter = useMemo(() => {
    const filter = filters.find((f) => f.config.type === 'Gain')?.config ?? null;
    return filter?.type === 'Gain' ? filter : null;
  }, [filters]);

  const ditherFilter = useMemo(() => {
    const filter = filters.find((f) => f.config.type === 'Dither')?.config ?? null;
    return filter?.type === 'Dither' ? filter : null;
  }, [filters]);

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
  const ditherBits = ditherFilter?.parameters.bits ?? 16;
  const lastDitherParamsRef = useRef<DitherFilter['parameters']>({ type: 'Flat', bits: 16, amplitude: 2 });

  useEffect(() => {
    if (ditherFilter && ditherFilter.parameters.type !== 'None') {
      lastDitherParamsRef.current = ditherFilter.parameters;
    }
  }, [ditherFilter]);

  const applyFilters = useCallback(
    (nextFilters: ChannelProcessingFilter[], options?: { debounce?: boolean }) => {
      onUpdateFilters?.(nextFilters, options);
    },
    [onUpdateFilters],
  );

  const upsertFilter = useCallback(
    (config: FilterConfig, options?: { debounce?: boolean }) => {
      const baseName = `${node.side[0]}${node.channelIndex}_${config.type.toLowerCase()}`;
      const next = upsertSingleFilterOfType(filters, config, baseName);
      applyFilters(next, options);
    },
    [applyFilters, filters, node.channelIndex, node.side],
  );

  const removeFilter = useCallback(
    (type: FilterType, options?: { debounce?: boolean }) => {
      const next = removeFirstFilterOfType(filters, type);
      if (next === filters) return;
      applyFilters(next, options);
    },
    [applyFilters, filters],
  );

  const applyDelay = useCallback(
    (value: number, unit: DelayDisplayUnit, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(value) || value < 0) return;
      const subsample = delayFilter?.parameters.subsample ?? true;
      if (unit === 'ms') {
        if (value <= 0) {
          removeFilter('Delay', options);
          return;
        }
        upsertFilter(buildDelayConfig(value, 'ms', subsample), options);
        return;
      }
      const mm = delayDistanceMmFromValue(value, unit);
      if (mm <= 0) {
        removeFilter('Delay', options);
        return;
      }
      upsertFilter(buildDelayConfig(mm, 'mm', subsample), options);
    },
    [delayFilter, removeFilter, upsertFilter],
  );

  const applyGain = useCallback(
    (nextGainDb: number, nextInverted: boolean, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(nextGainDb)) return;
      if (Math.abs(nextGainDb) < 0.0001 && !nextInverted) {
        removeFilter('Gain', options);
        return;
      }
      const config: GainFilter = {
        type: 'Gain',
        parameters: { gain: nextGainDb, ...(nextInverted ? { inverted: true } : {}) },
      };
      upsertFilter(config, options);
    },
    [removeFilter, upsertFilter],
  );

  const toggleDither = useCallback(() => {
    if (ditherEnabled) {
      removeFilter('Dither');
      return;
    }
    const last = lastDitherParamsRef.current;
    const parameters: DitherFilter['parameters'] = last.type === 'None'
      ? { type: 'Flat', bits: last.bits, amplitude: 2 }
      : last;
    const config: DitherFilter = {
      type: 'Dither',
      parameters,
    };
    upsertFilter(config);
  }, [ditherEnabled, removeFilter, upsertFilter]);

  const updateDitherBits = useCallback(
    (bits: number, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(bits)) return;
      const base = ditherFilter?.parameters ?? lastDitherParamsRef.current;
      const nextParams: DitherFilter['parameters'] = base.type === 'Flat'
        ? { ...base, bits }
        : { ...base, bits };
      upsertFilter({ type: 'Dither', parameters: nextParams }, options);
    },
    [ditherFilter, upsertFilter],
  );

  const updateDitherType = useCallback(
    (type: DitherParameters['type'], options?: { debounce?: boolean }) => {
      const base = ditherFilter?.parameters ?? lastDitherParamsRef.current;
      const nextParams: DitherFilter['parameters'] = type === 'Flat'
        ? { type: 'Flat', bits: base.bits, amplitude: base.type === 'Flat' ? base.amplitude : 2 }
        : { type, bits: base.bits };
      upsertFilter({ type: 'Dither', parameters: nextParams }, options);
    },
    [ditherFilter, upsertFilter],
  );

  const updateDitherAmplitude = useCallback(
    (amplitude: number, options?: { debounce?: boolean }) => {
      if (!Number.isFinite(amplitude)) return;
      const base = ditherFilter?.parameters ?? lastDitherParamsRef.current;
      if (base.type !== 'Flat') return;
      upsertFilter({ type: 'Dither', parameters: { ...base, amplitude } }, options);
    },
    [ditherFilter, upsertFilter],
  );

  const handleDelayUnitChange = useCallback(
    (nextUnit: DelayDisplayUnit) => {
      setDelayUnit(nextUnit);
      if (nextUnit === 'ms') {
        applyDelay(delayMs, 'ms', { debounce: true });
        return;
      }
      const mm = delayDistanceMmFromMs(delayMs);
      const nextValue = delayDistanceValueFromMm(mm, nextUnit);
      applyDelay(nextValue, nextUnit, { debounce: true });
    },
    [applyDelay, delayMs],
  );

  const ditherType = ditherFilter?.parameters.type;
  const ditherAmplitude = ditherFilter?.parameters.type === 'Flat' ? ditherFilter.parameters.amplitude : 2;

  return {
    delayUnit,
    delayDisplayValue,
    delayMs,
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
  };
}
