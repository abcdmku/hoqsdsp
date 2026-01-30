import { useEffect, useMemo, useRef } from 'react';
import type { CamillaConfig } from '../../../types';
import { useConfigJson } from '../../../features/configuration/configQueries';
import { useSetConfigJson } from '../../../features/configuration';
import { fromConfig, type FromConfigResult } from '../../../lib/signalflow';

export function useSignalFlowConfig(unitId: string) {
  const { data: config, isLoading, error } = useConfigJson(unitId);
  const flow = useMemo<FromConfigResult | null>(() => {
    if (!config) return null;
    return fromConfig(config);
  }, [config]);

  const configRef = useRef<CamillaConfig | null>(config ?? null);
  const flowRef = useRef<FromConfigResult | null>(flow);

  useEffect(() => {
    configRef.current = config ?? null;
    flowRef.current = flow;
  }, [config, flow]);

  const setConfigJson = useSetConfigJson(unitId);
  const sampleRate = config?.devices.samplerate ?? 48000;

  return {
    config: config ?? null,
    configRef,
    error,
    flow,
    flowRef,
    isLoading,
    sampleRate,
    setConfigJson,
  };
}
