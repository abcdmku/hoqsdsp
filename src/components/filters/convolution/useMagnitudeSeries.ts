import { useMemo } from 'react';
import { COMPLEX_ONE } from '../../../lib/dsp';
import type { FrequencySeries } from './types';
import { buildMagnitudePlot, toDb } from './responseMath';
import type { ComplexPoint } from './responseMath';

interface MagnitudeSeriesOptions {
  responseFrequencies: number[];
  pipelineComplex: ComplexPoint[];
  combinedCurrent: ComplexPoint[];
  currentFirComplex: ComplexPoint[];
  combinedPreview: ComplexPoint[] | null;
  previewFirComplex: ComplexPoint[] | null;
  canPreviewAppliedFirResponse: boolean;
}

export function useMagnitudeSeries({
  responseFrequencies,
  pipelineComplex,
  combinedCurrent,
  currentFirComplex,
  combinedPreview,
  previewFirComplex,
  canPreviewAppliedFirResponse,
}: MagnitudeSeriesOptions) {
  const magnitudeSeries = useMemo<FrequencySeries[]>(() => {
    const baseSeries: FrequencySeries[] = [
      {
        id: 'upstream',
        label: 'Upstream (before FIR)',
        colorClass: 'text-dsp-text-muted',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(pipelineComplex[i] ?? COMPLEX_ONE) })),
      },
      {
        id: 'applied',
        label: 'Predicted result (applied)',
        colorClass: 'text-filter-fir',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(combinedCurrent[i] ?? COMPLEX_ONE) })),
      },
    ];

    if (canPreviewAppliedFirResponse) {
      baseSeries.push({
        id: 'corrApplied',
        label: 'Correction (applied)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '6 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(currentFirComplex[i] ?? COMPLEX_ONE) })),
      });
    }

    if (combinedPreview) {
      baseSeries.push({
        id: 'preview',
        label: 'Predicted result (preview)',
        colorClass: 'text-dsp-accent',
        strokeDasharray: '4 2',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(combinedPreview[i] ?? COMPLEX_ONE) })),
      });
    }

    if (previewFirComplex) {
      baseSeries.push({
        id: 'corrPreview',
        label: 'Correction (preview)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: toDb(previewFirComplex[i] ?? COMPLEX_ONE) })),
      });
    }

    return baseSeries;
  }, [
    canPreviewAppliedFirResponse,
    combinedCurrent,
    combinedPreview,
    currentFirComplex,
    pipelineComplex,
    previewFirComplex,
    responseFrequencies,
  ]);

  const magnitudePlot = useMemo(() => buildMagnitudePlot(magnitudeSeries), [magnitudeSeries]);

  return { magnitudeSeries, magnitudePlot };
}
