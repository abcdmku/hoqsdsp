import { useQuery } from '@tanstack/react-query';
import { useUnitStore } from '../../stores/unitStore';
import { fetchSystemMetrics } from './systemMetrics';

export const systemKeys = {
  all: ['system'] as const,
  metrics: (unitId: string, url: string) => [...systemKeys.all, 'metrics', unitId, url] as const,
};

export function useSystemMetrics(unitId: string | null): {
  systemMetricsUrl: string | null;
  enabled: boolean;
  data: Awaited<ReturnType<typeof fetchSystemMetrics>> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  dataUpdatedAt: number;
} {
  const systemMetricsUrl = useUnitStore((state) => {
    if (!unitId) return null;
    const unit = state.units.find((u) => u.id === unitId);
    const url = unit?.systemMetricsUrl?.trim();
    return url && url.length > 0 ? url : null;
  });

  const enabled = !!unitId && !!systemMetricsUrl;

  const query = useQuery({
    queryKey: systemKeys.metrics(unitId ?? 'none', systemMetricsUrl ?? ''),
    queryFn: async () => {
      if (!systemMetricsUrl) throw new Error('System metrics URL not configured');
      return fetchSystemMetrics(systemMetricsUrl);
    },
    enabled,
    refetchInterval: 500,
    staleTime: 0,
  });

  return {
    systemMetricsUrl,
    enabled,
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
