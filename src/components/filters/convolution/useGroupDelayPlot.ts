import { useMemo } from 'react';
import type { FrequencySeries } from './types';
import { buildDelayMsSeries } from './responseMath';
import type { ComplexPoint } from './responseMath';

interface GroupDelayOptions {
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
  canPreviewAppliedFirResponse: boolean;
}

export function useGroupDelayPlot({
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
  canPreviewAppliedFirResponse,
}: GroupDelayOptions) {
  const groupDelayPlot = useMemo(() => {
    const hasPreview = Boolean(combinedPreview) || Boolean(previewFirComplex);
    const targetDelaySamplesForLine = pipelineDelaySamples + (hasPreview ? targetDelaySamples : currentFirDelaySamples);
    const targetDelayMs = (targetDelaySamplesForLine / sampleRate) * 1000;

    const yMax = Math.max(5, Math.min(1000, targetDelayMs * 2 + 10));
    const step = yMax / 4;
    const yGridLines = [0, step, step * 2, step * 3, step * 4];

    const upstreamDelayMs = buildDelayMsSeries(pipelineComplex, responseFrequencies);
    const appliedDelayMs = buildDelayMsSeries(combinedCurrent, responseFrequencies);
    const previewDelayMs = combinedPreview ? buildDelayMsSeries(combinedPreview, responseFrequencies) : null;
    const corrAppliedDelayMs = buildDelayMsSeries(currentFirComplex, responseFrequencies);
    const corrPreviewDelayMs = previewFirComplex ? buildDelayMsSeries(previewFirComplex, responseFrequencies) : null;

    const series: FrequencySeries[] = [
      {
        id: 'target',
        label: 'Target',
        colorClass: 'text-dsp-primary/60',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f) => ({ frequency: f, value: targetDelayMs })),
      },
      {
        id: 'upstream',
        label: 'Upstream (before FIR)',
        colorClass: 'text-dsp-text-muted',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: upstreamDelayMs[i] ?? 0 })),
      },
      {
        id: 'applied',
        label: 'Predicted result (applied)',
        colorClass: 'text-filter-fir',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: appliedDelayMs[i] ?? 0 })),
      },
    ];

    if (canPreviewAppliedFirResponse) {
      series.push({
        id: 'corrApplied',
        label: 'Correction (applied)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '6 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: corrAppliedDelayMs[i] ?? 0 })),
      });
    }

    if (previewDelayMs) {
      series.push({
        id: 'preview',
        label: 'Predicted result (preview)',
        colorClass: 'text-dsp-accent',
        strokeDasharray: '4 2',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: previewDelayMs[i] ?? 0 })),
      });
    }

    if (corrPreviewDelayMs) {
      series.push({
        id: 'corrPreview',
        label: 'Correction (preview)',
        colorClass: 'text-dsp-primary/70',
        strokeDasharray: '2 3',
        points: responseFrequencies.map((f, i) => ({ frequency: f, value: corrPreviewDelayMs[i] ?? 0 })),
      });
    }

    return { series, yMin: 0, yMax, yGridLines, targetDelayMs };
  }, [
    canPreviewAppliedFirResponse,
    combinedCurrent,
    combinedPreview,
    currentFirComplex,
    currentFirDelaySamples,
    pipelineComplex,
    pipelineDelaySamples,
    previewFirComplex,
    responseFrequencies,
    sampleRate,
    targetDelaySamples,
  ]);

  return { groupDelayPlot };
}
