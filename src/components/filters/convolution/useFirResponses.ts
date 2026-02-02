import { useMemo } from 'react';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import { buildComplexSeries, buildFirSeries, multiplySeries, buildMagnitudeStats, calculatePipelineDelaySamples } from './responseMath';
import { useGroupDelayPlot } from './useGroupDelayPlot';
import { useMagnitudeSeries } from './useMagnitudeSeries';
import { usePhaseSeries } from './usePhaseSeries';

interface FirResponsesOptions {
  sampleRate: number;
  responseFrequencies: number[];
  pipelineFilterConfigs: ChannelProcessingFilter['config'][];
  currentTaps: number[];
  previewTaps?: number[] | null;
  canPreviewAppliedFirResponse: boolean;
  phaseHideBelowDb: number;
  targetDelaySamples: number;
}

export function useFirResponses({
  sampleRate,
  responseFrequencies,
  pipelineFilterConfigs,
  currentTaps,
  previewTaps,
  canPreviewAppliedFirResponse,
  phaseHideBelowDb,
  targetDelaySamples,
}: FirResponsesOptions) {
  const pipelineComplex = useMemo(
    () => buildComplexSeries(responseFrequencies, pipelineFilterConfigs, sampleRate),
    [pipelineFilterConfigs, responseFrequencies, sampleRate],
  );

  const currentFirComplex = useMemo(
    () => buildFirSeries(currentTaps, sampleRate, responseFrequencies),
    [currentTaps, responseFrequencies, sampleRate],
  );

  const combinedCurrent = useMemo(
    () => multiplySeries(pipelineComplex, currentFirComplex),
    [currentFirComplex, pipelineComplex],
  );

  const previewFirComplex = useMemo(() => {
    if (!previewTaps) return null;
    return buildFirSeries(previewTaps, sampleRate, responseFrequencies);
  }, [previewTaps, responseFrequencies, sampleRate]);

  const combinedPreview = useMemo(() => {
    if (!previewFirComplex) return null;
    return multiplySeries(pipelineComplex, previewFirComplex);
  }, [pipelineComplex, previewFirComplex]);

  const firMagnitudeStats = useMemo(
    () => ({
      current: buildMagnitudeStats(currentFirComplex),
      preview: buildMagnitudeStats(previewFirComplex),
    }),
    [currentFirComplex, previewFirComplex],
  );

  const pipelineDelaySamples = useMemo(
    () => calculatePipelineDelaySamples(pipelineFilterConfigs, sampleRate),
    [pipelineFilterConfigs, sampleRate],
  );

  const currentFirDelaySamples = Math.floor((currentTaps.length - 1) / 2);

  const { magnitudeSeries, magnitudePlot } = useMagnitudeSeries({
    responseFrequencies,
    pipelineComplex,
    combinedCurrent,
    currentFirComplex,
    combinedPreview,
    previewFirComplex,
    canPreviewAppliedFirResponse,
  });

  const { phaseSeries } = usePhaseSeries({
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
  });

  const { groupDelayPlot } = useGroupDelayPlot({
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
  });

  return {
    pipelineComplex,
    currentFirComplex,
    combinedCurrent,
    previewFirComplex,
    combinedPreview,
    firMagnitudeStats,
    magnitudeSeries,
    magnitudePlot,
    pipelineDelaySamples,
    currentFirDelaySamples,
    phaseSeries,
    groupDelayPlot,
  };
}
