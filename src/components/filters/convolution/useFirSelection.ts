import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import type { FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import { filterRegistry } from '../../../lib/filters/registry';

export interface CorrectableFilterUi extends ChannelProcessingFilter {
  displayName: string;
  summary: string;
}

interface FirSelectionOptions {
  channelFilters?: ChannelProcessingFilter[];
  filterName?: string;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
}

export function useFirSelection({
  channelFilters,
  filterName,
  firPhaseCorrectionSettings,
}: FirSelectionOptions) {
  const candidateFilters = useMemo(() => {
    if (!channelFilters || channelFilters.length === 0) return [] as ChannelProcessingFilter[];
    if (!filterName) return channelFilters;
    const idx = channelFilters.findIndex((f) => f.name === filterName);
    return idx >= 0 ? channelFilters.slice(0, idx) : channelFilters;
  }, [channelFilters, filterName]);

  const correctableUi = useMemo(() => {
    return candidateFilters
      .filter((f) => f.config.type === 'Biquad' || f.config.type === 'DiffEq')
      .map((f) => {
        const handler = filterRegistry.get(f.config.type);
        return {
          ...f,
          displayName: handler?.getDisplayName(f.config as never) ?? f.config.type,
          summary: handler?.getSummary(f.config as never) ?? '',
        };
      });
  }, [candidateFilters]);

  const correctableKey = useMemo(() => correctableUi.map((f) => f.name).join('\u0000'), [correctableUi]);
  const availableFilterNamesRef = useRef<Set<string>>(new Set(correctableUi.map((f) => f.name)));

  const [selectedFilterNames, setSelectedFilterNames] = useState<Set<string>>(() => {
    const available = new Set(correctableUi.map((f) => f.name));
    const saved = firPhaseCorrectionSettings?.selectedFilterNames;
    if (saved !== undefined) {
      const next = new Set<string>();
      for (const name of saved) {
        if (available.has(name)) next.add(name);
      }
      return next;
    }
    return available;
  });

  useEffect(() => {
    const available = new Set(correctableUi.map((f) => f.name));
    const previouslyAvailable = availableFilterNamesRef.current;
    setSelectedFilterNames((prev) => {
      const next = new Set<string>();
      for (const name of prev) {
        if (available.has(name)) next.add(name);
      }
      for (const name of available) {
        if (!previouslyAvailable.has(name)) next.add(name);
      }
      return next;
    });
    availableFilterNamesRef.current = available;
  }, [correctableKey, correctableUi]);

  const selectedFilterConfigs = useMemo(
    () => correctableUi.filter((f) => selectedFilterNames.has(f.name)).map((f) => f.config),
    [correctableUi, selectedFilterNames],
  );

  const pipelineFilterConfigs = useMemo(
    () => candidateFilters.map((f) => f.config),
    [candidateFilters],
  );

  return {
    candidateFilters,
    correctableUi,
    selectedFilterNames,
    setSelectedFilterNames,
    selectedFilterConfigs,
    pipelineFilterConfigs,
  };
}
