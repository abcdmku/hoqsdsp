import { useMemo, useState } from 'react';
import type { FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import type { FirWindowType } from '../../../lib/dsp';
import { clampOddInt } from '../../../lib/dsp/firOperations';

export interface FirDesignSettings {
  maxLatencyMs: number;
  taps: number;
  bandLowHz: number;
  bandHighHz: number;
  transitionOctaves: number;
  magnitudeThresholdDb: number;
  magnitudeTransitionDb: number;
  phaseHideBelowDb: number;
  window: FirWindowType;
  kaiserBeta: number;
  normalize: boolean;
}

interface FirSettingsOptions {
  sampleRate: number;
  firPhaseCorrectionSettings?: FirPhaseCorrectionUiSettingsV1;
}

export function useFirSettings({ sampleRate, firPhaseCorrectionSettings }: FirSettingsOptions) {
  const [tapMode, setTapMode] = useState<'latency' | 'taps'>(() => firPhaseCorrectionSettings?.tapMode ?? 'latency');

  const [settings, setSettings] = useState<FirDesignSettings>(() => ({
    maxLatencyMs: firPhaseCorrectionSettings?.maxLatencyMs ?? 50,
    taps: firPhaseCorrectionSettings?.taps ?? 2049,
    bandLowHz: firPhaseCorrectionSettings?.bandLowHz ?? 20,
    bandHighHz: firPhaseCorrectionSettings?.bandHighHz ?? 20000,
    transitionOctaves: firPhaseCorrectionSettings?.transitionOctaves ?? 0.25,
    magnitudeThresholdDb: firPhaseCorrectionSettings?.magnitudeThresholdDb ?? -30,
    magnitudeTransitionDb: firPhaseCorrectionSettings?.magnitudeTransitionDb ?? 12,
    phaseHideBelowDb: firPhaseCorrectionSettings?.phaseHideBelowDb ?? -80,
    window: (firPhaseCorrectionSettings?.window ?? 'Hann') as FirWindowType,
    kaiserBeta: firPhaseCorrectionSettings?.kaiserBeta ?? 8.6,
    normalize: firPhaseCorrectionSettings?.normalize ?? true,
  }));

  const effectiveTaps = useMemo(() => {
    if (tapMode === 'taps') return clampOddInt(settings.taps, { min: 1, max: 262143 });
    const maxDelaySamples = Math.floor((Math.max(0, settings.maxLatencyMs) / 1000) * sampleRate);
    return clampOddInt(maxDelaySamples * 2 + 1, { min: 1, max: 262143 });
  }, [sampleRate, settings.maxLatencyMs, settings.taps, tapMode]);

  const targetDelaySamples = Math.floor((effectiveTaps - 1) / 2);
  const targetLatencyMs = (targetDelaySamples / sampleRate) * 1000;

  return {
    tapMode,
    setTapMode,
    settings,
    setSettings,
    effectiveTaps,
    targetDelaySamples,
    targetLatencyMs,
  };
}
