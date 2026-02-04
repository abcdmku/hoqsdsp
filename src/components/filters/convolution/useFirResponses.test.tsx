import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFirResponses } from './useFirResponses';

describe('useFirResponses', () => {
  it('uses the preview FIR tap delay (not the settings target delay) when plotting preview phase/group-delay', () => {
    const sampleRate = 48000;
    const responseFrequencies = [30, 71, 1234, 9999];

    const { result } = renderHook(() =>
      useFirResponses({
        sampleRate,
        responseFrequencies,
        pipelineFilterConfigs: [],
        currentTaps: [1],
        previewTaps: [1],
        canPreviewAppliedFirResponse: true,
        phaseHideBelowDb: -80,
        targetDelaySamples: 2400,
      }),
    );

    const previewPhase = result.current.phaseSeries.find((s) => s.id === 'preview');
    expect(previewPhase).toBeTruthy();
    for (const point of previewPhase!.points) {
      expect(point.value).toBeCloseTo(0, 6);
    }

    const targetDelay = result.current.groupDelayPlot.series.find((s) => s.id === 'target');
    expect(targetDelay).toBeTruthy();
    for (const point of targetDelay!.points) {
      expect(point.value).toBeCloseTo(0, 6);
    }
  });
});

