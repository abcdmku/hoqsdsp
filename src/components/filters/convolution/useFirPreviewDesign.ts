import { useMemo } from 'react';
import { designFirPhaseCorrection } from '../../../lib/dsp';
import type { FirPreviewDesign } from './types';
import type { FirDesignSettings } from './useFirSettings';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';

interface FirPreviewOptions {
  sampleRate: number;
  effectiveTaps: number;
  settings: FirDesignSettings;
  selectedFilterConfigs: ChannelProcessingFilter['config'][];
}

export function useFirPreviewDesign({
  sampleRate,
  effectiveTaps,
  settings,
  selectedFilterConfigs,
}: FirPreviewOptions): FirPreviewDesign {
  return useMemo(() => {
    try {
      const result = designFirPhaseCorrection({
        sampleRate,
        taps: effectiveTaps,
        window: settings.window,
        kaiserBeta: settings.window === 'Kaiser' ? settings.kaiserBeta : undefined,
        normalize: settings.normalize,
        band: {
          lowHz: settings.bandLowHz,
          highHz: settings.bandHighHz,
          transitionOctaves: settings.transitionOctaves,
        },
        magnitudeGate: {
          thresholdDb: settings.magnitudeThresholdDb,
          transitionDb: settings.magnitudeTransitionDb,
        },
        filters: selectedFilterConfigs,
      });
      return { taps: result.taps, error: null, warnings: result.warnings };
    } catch (error) {
      return { taps: null, error: error instanceof Error ? error.message : 'Failed to design FIR', warnings: [] };
    }
  }, [effectiveTaps, sampleRate, selectedFilterConfigs, settings]);
}
