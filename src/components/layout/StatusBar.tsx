import { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, Thermometer } from 'lucide-react';
import { useConnectionStore } from '../../stores';
import { usePageVisibility } from '../../hooks';
import { cn } from '../../lib/utils';
import { useSystemMetrics } from '../../features/system/systemQueries';
import { formatBytes } from '../../lib/utils/formatBytes';

interface StatusBarProps {
  processingLoad?: number;
  bufferLevel?: number;
  sampleRate?: number;
}

export function StatusBar({
  processingLoad: propProcessingLoad,
  bufferLevel: propBufferLevel,
  sampleRate = 48000,
}: StatusBarProps) {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const activeConnectionStatus = useConnectionStore((state) => {
    if (!state.activeUnitId) return 'disconnected';
    return state.connections.get(state.activeUnitId)?.status ?? 'disconnected';
  });
  const [processingLoad, setProcessingLoad] = useState(propProcessingLoad ?? 0);
  const [bufferLevel, setBufferLevel] = useState(propBufferLevel ?? 0);
  const isPageVisible = usePageVisibility();
  const systemMetricsQuery = useSystemMetrics(activeUnitId);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (!activeUnitId || !isPageVisible || activeConnectionStatus !== 'connected') return;

    let alive = true;

    const pollOnce = async () => {
      if (!alive) return;
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const [load, buffer] = await Promise.all([
          useConnectionStore.getState().getProcessingLoad(activeUnitId),
          useConnectionStore.getState().getBufferLevel(activeUnitId),
        ]);

        if (!alive) return;
        setProcessingLoad(load);
        setBufferLevel(buffer);
      } catch {
        // Silently handle polling errors
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void pollOnce();
    const pollInterval = setInterval(() => { void pollOnce(); }, 1000);

    return () => {
      alive = false;
      pollInFlightRef.current = false;
      clearInterval(pollInterval);
    };
  }, [activeUnitId, isPageVisible, activeConnectionStatus]);

  const loadColor =
    processingLoad > 80 ? 'text-meter-red' : processingLoad > 50 ? 'text-meter-yellow' : 'text-meter-green';

  const loadStatus =
    processingLoad > 80 ? 'high' : processingLoad > 50 ? 'moderate' : 'normal';

  const bufferColor =
    bufferLevel < 20 ? 'text-meter-red' : bufferLevel < 40 ? 'text-meter-yellow' : 'text-meter-green';

  const hasSelectedUnit = !!activeUnitId;
  const isUnitConnected = !!activeUnitId && activeConnectionStatus === 'connected';

  const showSystemMetrics = hasSelectedUnit && !!systemMetricsQuery.systemMetricsUrl;

  const ramUsedPercent = systemMetricsQuery.data?.memory.usedPercent;
  const ramColor =
    ramUsedPercent == null
      ? 'text-dsp-text-muted'
      : ramUsedPercent > 85
        ? 'text-meter-red'
        : ramUsedPercent > 70
          ? 'text-meter-yellow'
          : 'text-meter-green';

  const ramAriaLabel = (() => {
    if (!showSystemMetrics) return undefined;
    if (systemMetricsQuery.isError) return 'RAM usage unavailable';
    if (!systemMetricsQuery.data) return 'RAM usage loading';

    const used = formatBytes(systemMetricsQuery.data.memory.usedBytes);
    const total = formatBytes(systemMetricsQuery.data.memory.totalBytes);
    return `RAM usage: ${ramUsedPercent?.toFixed(0)} percent (${used} of ${total})`;
  })();

  const cpuTempCelsius = systemMetricsQuery.data?.temperature.cpuCelsius;
  const tempColor =
    cpuTempCelsius == null
      ? 'text-dsp-text-muted'
      : cpuTempCelsius >= 80
        ? 'text-meter-red'
        : cpuTempCelsius >= 70
          ? 'text-meter-yellow'
          : 'text-meter-green';

  return (
    <footer
      className={cn(
        'h-9 px-4 flex items-center gap-3 text-xs',
        'bg-dsp-surface/90 supports-[backdrop-filter]:bg-dsp-surface/70 backdrop-blur',
        'border-t border-dsp-primary/50'
      )}
      role="contentinfo"
      aria-label="System status"
    >
      {hasSelectedUnit ? (
        <>
          {isUnitConnected ? (
            <>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
                role="status"
                aria-label={`CPU load: ${processingLoad.toFixed(1)} percent, ${loadStatus}`}
              >
                <Cpu className={cn('h-4 w-4', loadColor)} aria-hidden="true" />
                <span className="text-dsp-text-muted">CPU</span>
                <span className={cn('font-mono font-medium', loadColor)}>{processingLoad.toFixed(1)}%</span>
              </div>

              <div
                className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
                role="status"
                aria-label={`Buffer level: ${bufferLevel.toFixed(0)} percent`}
              >
                <HardDrive className={cn('h-4 w-4', bufferColor)} aria-hidden="true" />
                <span className="text-dsp-text-muted">Buffer</span>
                <span className={cn('font-mono font-medium', bufferColor)}>{bufferLevel.toFixed(0)}%</span>
              </div>
            </>
          ) : (
            <span className="text-dsp-text-muted">Unit disconnected</span>
          )}

          {showSystemMetrics && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
              role="status"
              aria-label={ramAriaLabel}
              title={
                systemMetricsQuery.isError
                  ? 'Failed to load RAM usage (check system metrics URL / CORS)'
                  : systemMetricsQuery.data
                    ? `${formatBytes(systemMetricsQuery.data.memory.usedBytes)} used of ${formatBytes(systemMetricsQuery.data.memory.totalBytes)}`
                    : 'Loading RAM usage...'
              }
            >
              <Database className={cn('h-4 w-4', ramColor)} aria-hidden="true" />
              <span className="text-dsp-text-muted">RAM</span>
              <span className={cn('font-mono font-medium', ramColor)}>
                {ramUsedPercent == null ? '--' : `${ramUsedPercent.toFixed(0)}%`}
              </span>
            </div>
          )}

          {showSystemMetrics && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
              role="status"
              aria-label={
                cpuTempCelsius == null
                  ? 'CPU temperature unavailable'
                  : `CPU temperature: ${cpuTempCelsius.toFixed(1)} degrees celsius`
              }
              title={
                systemMetricsQuery.isError
                  ? 'Failed to load temperature (check system metrics URL / CORS)'
                  : cpuTempCelsius == null
                    ? 'Temperature unavailable'
                    : `${cpuTempCelsius.toFixed(1)} °C`
              }
            >
              <Thermometer className={cn('h-4 w-4', tempColor)} aria-hidden="true" />
              <span className="text-dsp-text-muted">Temp</span>
              <span className={cn('font-mono font-medium', tempColor)}>
                {cpuTempCelsius == null ? '--' : `${cpuTempCelsius.toFixed(1)}°C`}
              </span>
            </div>
          )}

          {isUnitConnected && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
              aria-label={`Sample rate: ${(sampleRate / 1000).toFixed(1)} kilohertz`}
            >
              <Activity className="h-4 w-4 text-dsp-accent" aria-hidden="true" />
              <span className="text-dsp-text-muted">Rate</span>
              <span className="font-mono font-medium text-dsp-text">{(sampleRate / 1000).toFixed(1)} kHz</span>
            </div>
          )}
        </>
      ) : (
        <span className="text-dsp-text-muted">No unit selected</span>
      )}

      <div className="flex-1" />

      <span className="text-[11px] text-dsp-text-muted" aria-label="HOQ DSP Console version 0.1.0">
        HOQ DSP Console v0.1.0
      </span>
    </footer>
  );
}
