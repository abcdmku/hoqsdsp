import { useMemo } from 'react';
import type { FrequencySeries } from './types';
import { buildPhaseSeriesFor } from './responseMath';
import type { ComplexPoint } from './responseMath';

interface PhaseSeriesOptions {
  responseFrequencies: number[];
  pipelineComplex: ComplexPoint[];
  combinedCurrent: ComplexPoint[];
  currentFirComplex: ComplexPoint[];
  combinedPreview: ComplexPoint[] | null;
  previewFirComplex: ComplexPoint[] | null;
  pipelineDelaySamples: number;
  currentFirDelaySamples: number;
  targetDelaySamples: number;
  sampleRate: number;
  phaseHideBelowDb: number;
  canPreviewAppliedFirResponse: boolean;
}

export function usePhaseSeries({
  responseFrequencies,
  pipelineComplex,
  combinedCurrent,
  currentFirComplex,
  combinedPreview,
  previewFirComplex,
  pipelineDelaySamples,
  currentFirDelaySamples,
  targetDelaySamples,
  sampleRate,
  phaseHideBelowDb,
  canPreviewAppliedFirResponse,
}: PhaseSeriesOptions) {
  const phaseSeries = useMemo(() => {
    const series: FrequencySeries[] = [
      buildPhaseSeriesFor(
        pipelineComplex,
        responseFrequencies,
        pipelineDelaySamples,
        sampleRate,
        phaseHideBelowDb,
        'Upstream (before FIR)',
        'upstream',
        'text-dsp-text-muted',
        '2 3',
      ),
      buildPhaseSeriesFor(
        combinedCurrent,
        responseFrequencies,
        pipelineDelaySamples + currentFirDelaySamples,
        sampleRate,
        phaseHideBelowDb,
        'Predicted result (applied)',
        'applied',
        'text-filter-fir',
      ),
    ];

    if (canPreviewAppliedFirResponse) {
      series.push(
        buildPhaseSeriesFor(
          currentFirComplex,
          responseFrequencies,
          currentFirDelaySamples,
          sampleRate,
          phaseHideBelowDb,
          'Correction (applied)',
          'corrApplied',
          'text-dsp-primary/70',
          '6 3',
        ),
      );
    }

    if (combinedPreview) {
      series.push(
        buildPhaseSeriesFor(
          combinedPreview,
          responseFrequencies,
          pipelineDelaySamples + targetDelaySamples,
          sampleRate,
          phaseHideBelowDb,
          'Predicted result (preview)',
          'preview',
          'text-dsp-accent',
          '4 2',
        ),
      );
    }

    if (previewFirComplex) {
      series.push(
        buildPhaseSeriesFor(
          previewFirComplex,
          responseFrequencies,
          targetDelaySamples,
          sampleRate,
          phaseHideBelowDb,
          'Correction (preview)',
          'corrPreview',
          'text-dsp-primary/70',
          '2 3',
        ),
      );
    }

    return series;
  }, [
    canPreviewAppliedFirResponse,
    combinedCurrent,
    combinedPreview,
    currentFirComplex,
    currentFirDelaySamples,
    phaseHideBelowDb,
    pipelineComplex,
    pipelineDelaySamples,
    previewFirComplex,
    responseFrequencies,
    sampleRate,
    targetDelaySamples,
  ]);

  return { phaseSeries };
}
