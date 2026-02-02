import { useMemo } from 'react';
import { formatFrequency } from '../../../lib/dsp';
import { FirImpulseGraph } from './FirImpulseGraph';
import { FirStatsBar } from './FirStatsBar';
import { FrequencyGraph } from './FrequencyGraph';
import type { ConvolutionView, FrequencySeries, HoverInfo } from './types';

interface ConvolutionGraphPanelProps {
  view: ConvolutionView;
  maxFreq: number;
  magnitudeSeries: FrequencySeries[];
  magnitudePlot: { yMin: number; yMax: number; yGridLines: number[] };
  phaseSeries: FrequencySeries[];
  groupDelayPlot: { series: FrequencySeries[]; yMin: number; yMax: number; yGridLines: number[] };
  currentTaps: number[];
  previewTaps?: number[] | null;
  sampleRate: number;
  hoverInfo: HoverInfo | null;
  onHoverChange: (info: HoverInfo | null) => void;
}

export function ConvolutionGraphPanel({
  view,
  maxFreq,
  magnitudeSeries,
  magnitudePlot,
  phaseSeries,
  groupDelayPlot,
  currentTaps,
  previewTaps,
  sampleRate,
  hoverInfo,
  onHoverChange,
}: ConvolutionGraphPanelProps) {
  const activeSeries = useMemo(() => {
    switch (view) {
      case 'magnitude':
        return magnitudeSeries;
      case 'phase':
        return phaseSeries;
      case 'groupDelay':
        return groupDelayPlot.series;
      default:
        return [] as FrequencySeries[];
    }
  }, [groupDelayPlot.series, magnitudeSeries, phaseSeries, view]);

  const formatHoverValue = (value: number): string => {
    if (!Number.isFinite(value)) return '--';
    if (view === 'phase') return `${value.toFixed(0)} deg`;
    if (view === 'groupDelay') return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
    return `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
  };

  return (
    <>
      {view === 'magnitude' && (
        <FrequencyGraph
          series={magnitudeSeries}
          minFreq={20}
          maxFreq={maxFreq}
          yMin={magnitudePlot.yMin}
          yMax={magnitudePlot.yMax}
          yGridLines={magnitudePlot.yGridLines}
          yFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
          hoverValueFormatter={formatHoverValue}
          ariaLabel="Magnitude response"
          onHoverChange={onHoverChange}
        />
      )}

      {view === 'phase' && (
        <FrequencyGraph
          series={phaseSeries}
          minFreq={20}
          maxFreq={maxFreq}
          yMin={-180}
          yMax={180}
          yGridLines={[-180, -90, 0, 90, 180]}
          yFormatter={(v) => `${v.toFixed(0)} deg`}
          hoverValueFormatter={formatHoverValue}
          ariaLabel="Phase response (excess phase)"
          onHoverChange={onHoverChange}
        />
      )}

      {view === 'groupDelay' && (
        <FrequencyGraph
          series={groupDelayPlot.series}
          minFreq={20}
          maxFreq={maxFreq}
          yMin={groupDelayPlot.yMin}
          yMax={groupDelayPlot.yMax}
          yGridLines={groupDelayPlot.yGridLines}
          yFormatter={(v) => `${v.toFixed(v < 10 ? 2 : 1)} ms`}
          hoverValueFormatter={formatHoverValue}
          ariaLabel="Group delay response"
          onHoverChange={onHoverChange}
        />
      )}

      {view === 'impulse' && (
        <FirImpulseGraph taps={currentTaps} previewTaps={previewTaps} sampleRate={sampleRate} />
      )}

      {view !== 'impulse' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/20 px-3 py-2">
          <div className="text-xs text-dsp-text-muted">
            {hoverInfo ? `@ ${formatFrequency(hoverInfo.frequency)}` : 'Hover for values'}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {activeSeries.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 text-xs text-dsp-text-muted">
                <svg width={18} height={6} className={s.colorClass} aria-hidden="true">
                  <line
                    x1={0}
                    y1={3}
                    x2={18}
                    y2={3}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray={s.strokeDasharray}
                    opacity={s.colorClass === 'text-dsp-text-muted' ? 0.7 : 1}
                  />
                </svg>
                <span className="text-dsp-text">{s.label}</span>
                {hoverInfo && <span className="font-mono text-dsp-text">{formatHoverValue(hoverInfo.values[s.id] ?? Number.NaN)}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-dsp-primary/20">
        <FirStatsBar tapCount={currentTaps.length} sampleRate={sampleRate} />
      </div>
    </>
  );
}
