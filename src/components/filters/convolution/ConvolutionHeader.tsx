import { RotateCcw, Undo2 } from 'lucide-react';
import type { ConvolutionFilter } from '../../../types';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';
import type { ConvolutionView } from './types';
import { FieldHelp } from './FieldHelp';

interface ConvolutionHeaderProps {
  view: ConvolutionView;
  onViewChange: (view: ConvolutionView) => void;
  isIdentityFir: boolean;
  params: ConvolutionFilter['parameters'];
  currentTapCount: number;
  targetLatencyMs: number;
  canUndo: boolean;
  canReset: boolean;
  onUndo: () => void;
  onReset: () => void;
}

const VIEW_TABS: Array<{ id: ConvolutionView; label: string }> = [
  { id: 'magnitude', label: 'Mag' },
  { id: 'phase', label: 'Phase' },
  { id: 'groupDelay', label: 'Delay' },
  { id: 'impulse', label: 'Impulse' },
];

export function ConvolutionHeader({
  view,
  onViewChange,
  isIdentityFir,
  params,
  currentTapCount,
  targetLatencyMs,
  canUndo,
  canReset,
  onUndo,
  onReset,
}: ConvolutionHeaderProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2 text-sm text-dsp-text">
      <span className="font-medium">FIR Phase Correction</span>
      <FieldHelp label="FIR Phase Correction">
        <div className="space-y-2 text-xs">
          <p>
            Auto-generates a linear-phase FIR that removes the <span className="font-semibold">excess phase</span> of the selected upstream filters without changing their magnitude response.
          </p>
          <div className="space-y-1">
            <p className="font-semibold">How it works</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Compute the complex response of the selected filters: H(f).</li>
              <li>
                Build a unit-magnitude phase inverse and add a pure delay: C(f) ~ e^(-j*2*pi*f*D/Fs) * conj(H(f)) / |H(f)|.
              </li>
              <li>Band-limit and magnitude-gate the correction, then IFFT -{">"} taps, window, and normalize.</li>
            </ul>
          </div>
          <p>
            FIR latency (D): <span className="font-mono">{targetLatencyMs.toFixed(2)} ms</span>{' '}
            <span className="text-dsp-text-muted">(plus any upstream Delay filters)</span>
          </p>
        </div>
      </FieldHelp>
      <div className="ml-auto flex gap-1 rounded-md bg-dsp-surface/50 p-1" role="tablist" aria-label="FIR graph view">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={cn(
              'px-2.5 py-1 rounded-sm text-xs font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
              view === tab.id
                ? 'bg-dsp-bg text-dsp-text'
                : 'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/20',
            )}
            onClick={() => onViewChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <span
        className={cn(
          'ml-2 inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium',
          isIdentityFir ? 'border-dsp-primary/30 text-dsp-text-muted' : 'border-filter-fir/40 bg-filter-fir/10 text-filter-fir',
        )}
        title={
          isIdentityFir
            ? 'FIR is currently identity (not applied).'
            : params.type === 'Values'
              ? `FIR is applied (${currentTapCount.toLocaleString()} taps).`
              : 'FIR is applied (file-based impulse).'
        }
      >
        {isIdentityFir ? 'Not applied' : params.type === 'Values' ? `Applied (${currentTapCount.toLocaleString()})` : 'Applied (file)'}
      </span>
      {params.type === 'Values' && (
        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last FIR edit"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!canReset}
            aria-label="Reset FIR to baseline"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

