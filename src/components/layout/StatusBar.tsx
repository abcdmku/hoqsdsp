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
  sampleRate = 48000,
}: StatusBarProps) {
  const activeConnection = useConnectionStore(selectActiveConnection);
  const [processingLoad, setProcessingLoad] = useState(propProcessingLoad ?? 0);
  const [bufferLevel, setBufferLevel] = useState(propBufferLevel ?? 0);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

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
      } catch {
        // Silently handle polling errors
      }
    }, 1000);

    return () => { clearInterval(pollInterval); };
  }, [activeUnitId]);

  const loadColor =
    processingLoad > 80 ? 'text-meter-red' : processingLoad > 50 ? 'text-meter-yellow' : 'text-meter-green';

  const loadStatus =
    processingLoad > 80 ? 'high' : processingLoad > 50 ? 'moderate' : 'normal';

  const bufferColor =
    bufferLevel < 20 ? 'text-meter-red' : bufferLevel < 40 ? 'text-meter-yellow' : 'text-meter-green';

  const hasActiveUnit = activeUnitId && activeConnection?.status === 'connected';

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
      {hasActiveUnit ? (
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

          <div
            className="inline-flex items-center gap-2 rounded-full border border-dsp-primary/50 bg-dsp-bg/40 px-3 py-1"
            aria-label={`Sample rate: ${(sampleRate / 1000).toFixed(1)} kilohertz`}
          >
            <Activity className="h-4 w-4 text-dsp-accent" aria-hidden="true" />
            <span className="text-dsp-text-muted">Rate</span>
            <span className="font-mono font-medium text-dsp-text">{(sampleRate / 1000).toFixed(1)} kHz</span>
          </div>
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
