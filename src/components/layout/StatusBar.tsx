import { Activity, Cpu, HardDrive } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatusBarProps {
  processingLoad?: number;
  bufferLevel?: number;
  sampleRate?: number;
}

export function StatusBar({
  processingLoad = 0,
  bufferLevel = 0,
  sampleRate = 48000
}: StatusBarProps) {
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

  return (
    <footer
      className="h-8 bg-dsp-surface border-t border-dsp-primary/30 flex items-center px-4 text-xs text-dsp-text-muted gap-6"
      role="contentinfo"
      aria-label="System status"
    >
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

      <div className="flex-1" />

      <span aria-label="CamillaDSP Frontend version 0.1.0">CamillaDSP Frontend v0.1.0</span>
    </footer>
  );
}
