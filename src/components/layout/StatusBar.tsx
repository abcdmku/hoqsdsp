import { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import { useConnectionStore, selectActiveConnection } from '../../stores';
import { cn } from '../../lib/utils';

interface StatusBarProps {
  processingLoad?: number;
  bufferLevel?: number;
  sampleRate?: number;
}

export function StatusBar({
  processingLoad: propProcessingLoad,
  bufferLevel: propBufferLevel,
  sampleRate = 48000
}: StatusBarProps) {
  const activeConnection = useConnectionStore(selectActiveConnection);
  const [processingLoad, setProcessingLoad] = useState(propProcessingLoad ?? 0);
  const [bufferLevel, setBufferLevel] = useState(propBufferLevel ?? 0);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

  // Poll for active unit metrics
  useEffect(() => {
    if (!activeUnitId) {
      setProcessingLoad(0);
      setBufferLevel(0);
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const load = await useConnectionStore.getState().getProcessingLoad(activeUnitId);
        const buffer = await useConnectionStore.getState().getBufferLevel(activeUnitId);
        setProcessingLoad(load ?? 0);
        setBufferLevel(buffer ?? 0);
      } catch (error) {
        // Silently handle polling errors
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [activeUnitId]);
  const loadColor = processingLoad > 80
    ? 'text-meter-red'
    : processingLoad > 50
      ? 'text-meter-yellow'
      : 'text-meter-green';

  const loadStatus = processingLoad > 80
    ? 'high'
    : processingLoad > 50
      ? 'moderate'
      : 'normal';

  const hasActiveUnit = activeUnitId && activeConnection?.status === 'connected';

  return (
    <footer
      className="h-8 bg-dsp-surface border-t border-dsp-primary/30 flex items-center px-4 text-xs text-dsp-text-muted gap-6"
      role="contentinfo"
      aria-label="System status"
    >
      {hasActiveUnit ? (
        <>
          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`CPU load: ${processingLoad.toFixed(1)} percent, ${loadStatus}`}
          >
            <Cpu className={cn("w-4 h-4", loadColor)} aria-hidden="true" />
            <span>CPU: {processingLoad.toFixed(1)}%</span>
          </div>

          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`Buffer level: ${bufferLevel.toFixed(0)} percent`}
          >
            <HardDrive className="w-4 h-4" aria-hidden="true" />
            <span>Buffer: {bufferLevel.toFixed(0)}%</span>
          </div>

          <div
            className="flex items-center gap-2"
            aria-label={`Sample rate: ${(sampleRate / 1000).toFixed(1)} kilohertz`}
          >
            <Activity className="w-4 h-4" aria-hidden="true" />
            <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
          </div>
        </>
      ) : (
        <span className="text-dsp-text-muted">No unit selected</span>
      )}

      <div className="flex-1" />

      <span aria-label="CamillaDSP Frontend version 0.1.0">CamillaDSP Frontend v0.1.0</span>
    </footer>
  );
}
