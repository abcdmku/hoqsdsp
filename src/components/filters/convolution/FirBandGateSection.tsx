import { useMemo } from 'react';
import { NumericInput, Slider } from '../../ui';
import type { FirDesignSettings } from './useFirSettings';

interface FirBandGateSectionProps {
  settings: FirDesignSettings;
  onSettingsChange: (updater: (prev: FirDesignSettings) => FirDesignSettings) => void;
  sampleRate: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Convert frequency to logarithmic slider position (0-1)
function freqToSlider(freq: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logFreq = Math.log10(freq);
  return (logFreq - logMin) / (logMax - logMin);
}

// Convert slider position to frequency
function sliderToFreq(pos: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logFreq = logMin + pos * (logMax - logMin);
  return Math.pow(10, logFreq);
}

function roundFrequencyHz(freqHz: number): number {
  if (freqHz < 100) return Math.round(freqHz);
  if (freqHz < 1000) return Math.round(freqHz / 5) * 5;
  return Math.round(freqHz / 10) * 10;
}

function stepForFrequencyHz(freqHz: number): number {
  if (freqHz < 100) return 1;
  if (freqHz < 1000) return 5;
  return 10;
}

export function FirBandGateSection({
  settings,
  onSettingsChange,
  sampleRate,
}: FirBandGateSectionProps) {
  const minHz = 20;
  const maxHz = Math.max(minHz, Math.floor(sampleRate / 2));

  const band = useMemo(() => {
    const lowHz = clamp(Math.min(settings.bandLowHz, settings.bandHighHz), minHz, maxHz);
    const highHz = clamp(Math.max(settings.bandLowHz, settings.bandHighHz), minHz, maxHz);
    return { lowHz, highHz };
  }, [maxHz, settings.bandHighHz, settings.bandLowHz]);

  const sliderValue = useMemo<[number, number]>(() => {
    return [freqToSlider(band.lowHz, minHz, maxHz), freqToSlider(band.highHz, minHz, maxHz)];
  }, [band.highHz, band.lowHz, maxHz]);

  const handleBandSliderChange = (values: number[]) => {
    const pos0 = clamp(values[0] ?? 0, 0, 1);
    const pos1 = clamp(values[1] ?? 1, 0, 1);
    const lowPos = Math.min(pos0, pos1);
    const highPos = Math.max(pos0, pos1);

    const nextLow = roundFrequencyHz(clamp(sliderToFreq(lowPos, minHz, maxHz), minHz, maxHz));
    const nextHigh = roundFrequencyHz(clamp(sliderToFreq(highPos, minHz, maxHz), minHz, maxHz));

    onSettingsChange((s) => ({
      ...s,
      bandLowHz: Math.min(nextLow, nextHigh),
      bandHighHz: Math.max(nextLow, nextHigh),
    }));
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-xs text-dsp-text-muted">Band (Hz)</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-dsp-text-muted">Low</label>
            <NumericInput
              value={band.lowHz}
              onChange={(v) =>
                onSettingsChange((s) => {
                  const clamped = roundFrequencyHz(clamp(v, minHz, maxHz));
                  return { ...s, bandLowHz: Math.min(clamped, s.bandHighHz) };
                })
              }
              min={minHz}
              max={maxHz}
              step={stepForFrequencyHz(band.lowHz)}
              precision={0}
              unit="Hz"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-dsp-text-muted">High</label>
            <NumericInput
              value={band.highHz}
              onChange={(v) =>
                onSettingsChange((s) => {
                  const clamped = roundFrequencyHz(clamp(v, minHz, maxHz));
                  return { ...s, bandHighHz: Math.max(clamped, s.bandLowHz) };
                })
              }
              min={minHz}
              max={maxHz}
              step={stepForFrequencyHz(band.highHz)}
              precision={0}
              unit="Hz"
            />
          </div>
        </div>

        <Slider
          value={sliderValue}
          onValueChange={handleBandSliderChange}
          min={0}
          max={1}
          step={0.001}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Band Transition (oct)</label>
          <NumericInput
            value={settings.transitionOctaves}
            onChange={(v) => onSettingsChange((s) => ({ ...s, transitionOctaves: v }))}
            min={0}
            max={4}
            step={0.05}
            precision={2}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Magnitude Gate (dB)</label>
          <NumericInput
            value={settings.magnitudeThresholdDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, magnitudeThresholdDb: v }))}
            min={-200}
            max={0}
            step={1}
            precision={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Gate Transition (dB)</label>
          <NumericInput
            value={settings.magnitudeTransitionDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, magnitudeTransitionDb: v }))}
            min={0}
            max={60}
            step={1}
            precision={0}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-dsp-text-muted">Hide Phase Below (dB)</label>
          <NumericInput
            value={settings.phaseHideBelowDb}
            onChange={(v) => onSettingsChange((s) => ({ ...s, phaseHideBelowDb: v }))}
            min={-300}
            max={0}
            step={1}
            precision={0}
          />
        </div>
      </div>
    </>
  );
}
