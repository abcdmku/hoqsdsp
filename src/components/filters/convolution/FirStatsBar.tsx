import { estimateFirLinearPhaseLatencyMs } from '../../../lib/dsp/firOperations';
import { cn } from '../../../lib/utils';

interface FirStatsBarProps {
  tapCount: number;
  sampleRate: number;
}

export function FirStatsBar({ tapCount, sampleRate }: FirStatsBarProps) {
  const latencyMs = estimateFirLinearPhaseLatencyMs(tapCount, sampleRate);
  const showHighLatencyWarning = latencyMs > 50;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-2 text-sm">
      <span className="text-dsp-text-muted">
        <span className="font-mono text-dsp-text">{tapCount.toLocaleString()}</span> taps
      </span>
      <span className={cn('text-dsp-text-muted', showHighLatencyWarning && 'text-meter-yellow')}>
        Latency:{' '}
        <span className={cn('font-mono', showHighLatencyWarning ? 'text-meter-yellow' : 'text-dsp-text')}>
          {latencyMs.toFixed(2)}
        </span>{' '}
        ms
      </span>
    </div>
  );
}
