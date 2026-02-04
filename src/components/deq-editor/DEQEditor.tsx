import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Info, Power, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { BiquadParameters } from '../../types';
import { BandSelector } from '../eq-editor/BandSelector';
import { BandParameters } from '../eq-editor/BandParameters';
import type { CanvasDimensions } from '../eq-editor/types';
import { hasGain } from '../eq-editor/types';
import { useAddBandDrag } from '../eq-editor/useAddBandDrag';
import { Button, GainInput, NumericInput, Tooltip, TooltipContent, TooltipTrigger } from '../ui';
import { DEQCanvas } from './DEQCanvas';
import type { DeqBand } from './types';
import { DEFAULT_DEQ_DYNAMICS, normalizeDeqDynamics } from './types';

/** Default dimensions for the DEQ canvas */
const DEFAULT_DIMENSIONS: CanvasDimensions = {
  width: 800,
  height: 400,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 50,
};

function generateBandId(): string {
  return `deq-band-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultBand(freq = 1000, gain = 0): DeqBand {
  return {
    id: generateBandId(),
    enabled: true,
    parameters: {
      type: 'Peaking',
      freq,
      gain,
      q: 1.0,
    },
    dynamics: { ...DEFAULT_DEQ_DYNAMICS },
  };
}

export interface DeqEditorProps {
  bands: DeqBand[];
  onChange: (bands: DeqBand[]) => void;
  sampleRate: number;
  selectedBandIndex?: number | null;
  onSelectBand?: (index: number | null) => void;
  className?: string;
  readOnly?: boolean;
  topRightControls?: ReactNode;
}

export function DEQEditor({
  bands,
  onChange,
  sampleRate,
  selectedBandIndex: controlledSelectedIndex,
  onSelectBand: controlledOnSelectBand,
  className,
  readOnly = false,
  topRightControls,
}: DeqEditorProps) {
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);
  const selectedBandIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const onSelectBand = controlledOnSelectBand ?? setInternalSelectedIndex;

  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState<CanvasDimensions>(DEFAULT_DIMENSIONS);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const width = Math.max(400, rect.width);
      const height = Math.max(250, Math.min(680, width * 0.55));
      setDimensions({
        ...DEFAULT_DIMENSIONS,
        width,
        height,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => { window.removeEventListener('resize', updateDimensions); };
  }, []);

  const handleBandChange = useCallback(
    (index: number, updates: Partial<BiquadParameters>) => {
      if (readOnly) return;
      const nextBands = [...bands];
      const band = nextBands[index];
      if (!band) return;

      nextBands[index] = {
        ...band,
        parameters: { ...band.parameters, ...updates } as BiquadParameters,
      };
      onChange(nextBands);
    },
    [bands, onChange, readOnly],
  );

  const handleDynamicsChange = useCallback(
    (index: number, updates: Partial<DeqBand['dynamics']>) => {
      if (readOnly) return;
      const nextBands = [...bands];
      const band = nextBands[index];
      if (!band) return;

      nextBands[index] = {
        ...band,
        dynamics: normalizeDeqDynamics({ ...band.dynamics, ...updates, enabled: true }),
      };
      onChange(nextBands);
    },
    [bands, onChange, readOnly],
  );

  const handleAddBand = useCallback(() => {
    if (readOnly) return;

    const existingFreqs = bands.map((b) => ('freq' in b.parameters ? b.parameters.freq : 1000));
    let newFreq = 1000;
    const standardFreqs = [100, 250, 500, 1000, 2000, 4000, 8000];

    for (const freq of standardFreqs) {
      const isTooClose = existingFreqs.some(
        (existing) => Math.abs(Math.log10(existing) - Math.log10(freq)) < 0.2,
      );
      if (!isTooClose) {
        newFreq = freq;
        break;
      }
    }

    const newBand = createDefaultBand(newFreq, 0);
    const nextBands = [...bands, newBand];
    onChange(nextBands);
    onSelectBand(nextBands.length - 1);
  }, [bands, onChange, onSelectBand, readOnly]);

  const { handleAddBandStart, handleAddBandMove, handleAddBandEnd } = useAddBandDrag({
    readOnly,
    bands,
    onChange,
    onSelectBand,
    createBand: createDefaultBand,
    updateBand: (index, freq, gain) => {
      handleBandChange(index, { freq, gain });
    },
  });

  const handleRemoveBand = useCallback(
    (index: number) => {
      if (readOnly) return;
      const nextBands = bands.filter((_, i) => i !== index);
      onChange(nextBands);

      if (selectedBandIndex === index) {
        onSelectBand(nextBands.length > 0 ? Math.min(index, nextBands.length - 1) : null);
      } else if (selectedBandIndex !== null && selectedBandIndex > index) {
        onSelectBand(selectedBandIndex - 1);
      }
    },
    [bands, onChange, selectedBandIndex, onSelectBand, readOnly],
  );

  const handleToggleBand = useCallback(
    (index: number) => {
      if (readOnly) return;
      const nextBands = [...bands];
      const band = nextBands[index];
      if (!band) return;
      nextBands[index] = { ...band, enabled: !band.enabled };
      onChange(nextBands);
    },
    [bands, onChange, readOnly],
  );

  const handleParameterChange = useCallback(
    (updates: Partial<BiquadParameters>) => {
      if (selectedBandIndex === null || readOnly) return;
      handleBandChange(selectedBandIndex, updates);
    },
    [selectedBandIndex, handleBandChange, readOnly],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < bands.length) {
          e.preventDefault();
          onSelectBand(index);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectBand(null);
        return;
      }

      if (selectedBandIndex === null) return;
      const selectedBand = bands[selectedBandIndex];
      if (!selectedBand) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleRemoveBand(selectedBandIndex);
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          handleToggleBand(selectedBandIndex);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if ('freq' in selectedBand.parameters) {
            const step = e.shiftKey ? 0.95 : 0.99;
            const newFreq = Math.max(20, selectedBand.parameters.freq * step);
            handleBandChange(selectedBandIndex, { freq: Math.round(newFreq) });
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if ('freq' in selectedBand.parameters) {
            const step = e.shiftKey ? 1.05 : 1.01;
            const newFreq = Math.min(20000, selectedBand.parameters.freq * step);
            handleBandChange(selectedBandIndex, { freq: Math.round(newFreq) });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (hasGain(selectedBand.parameters.type) && 'gain' in selectedBand.parameters) {
            const step = e.shiftKey ? 1 : 0.5;
            const next = Math.min(24, selectedBand.parameters.gain + step);
            handleBandChange(selectedBandIndex, { gain: Math.round(next * 10) / 10 });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (hasGain(selectedBand.parameters.type) && 'gain' in selectedBand.parameters) {
            const step = e.shiftKey ? 1 : 0.5;
            const next = Math.max(-24, selectedBand.parameters.gain - step);
            handleBandChange(selectedBandIndex, { gain: Math.round(next * 10) / 10 });
          }
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => { container.removeEventListener('keydown', handleKeyDown); };
  }, [
    bands,
    selectedBandIndex,
    onSelectBand,
    handleBandChange,
    handleRemoveBand,
    handleToggleBand,
    readOnly,
  ]);

  const selectedBand = selectedBandIndex !== null ? bands[selectedBandIndex] ?? null : null;

  useEffect(() => {
    if (selectedBandIndex === null) return;
    if (!selectedBand) return;
    if (readOnly) return;
    if (selectedBand.dynamics.enabled) return;
    handleDynamicsChange(selectedBandIndex, { enabled: true });
  }, [handleDynamicsChange, readOnly, selectedBand, selectedBandIndex]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'flex flex-col gap-4 p-4 bg-dsp-surface rounded-lg outline-none',
        'focus-within:ring-2 focus-within:ring-dsp-accent/50',
        className,
      )}
    >
      <BandSelector
        bands={bands}
        selectedIndex={selectedBandIndex}
        onSelect={onSelectBand}
        onAdd={handleAddBand}
        disabled={readOnly}
        topRightControls={topRightControls}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div ref={canvasContainerRef} className="relative flex-1 min-w-0 lg:flex-[5]">
          <DEQCanvas
            bands={bands}
            sampleRate={sampleRate}
            selectedBandIndex={selectedBandIndex}
            onSelectBand={onSelectBand}
            onBandChange={handleBandChange}
            onBackgroundPointerDown={handleAddBandStart}
            onBackgroundPointerMove={handleAddBandMove}
            onBackgroundPointerUp={handleAddBandEnd}
            onBackgroundClick={handleAddBandStart}
            dimensions={dimensions}
            readOnly={readOnly}
          />

          {/* Empty state hint when no bands exist */}
          {bands.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2 bg-dsp-bg/80 rounded-lg px-6 py-4 backdrop-blur-sm border border-dsp-primary/20">
                <p className="text-sm text-dsp-text-muted">
                  Click anywhere on the graph to add a Dynamic EQ band
                </p>
                <p className="text-xs text-dsp-text-muted/60">
                  or use the <span className="font-mono text-dsp-accent">+</span> button above
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 lg:flex-[1] lg:min-w-[300px] lg:max-w-[380px]">
          <div className="p-4 bg-dsp-bg/50 rounded-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-dsp-text">
                {selectedBand && selectedBandIndex !== null ? `Band ${selectedBandIndex + 1}` : 'Band Parameters'}
              </h3>

              {selectedBand && selectedBandIndex !== null && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7',
                          selectedBand.enabled ? 'text-meter-green' : 'text-dsp-text-muted',
                        )}
                        aria-label={selectedBand.enabled ? 'Bypass band' : 'Enable band'}
                        onClick={() => { handleToggleBand(selectedBandIndex); }}
                        disabled={readOnly}
                      >
                        <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {selectedBand.enabled ? 'Bypass band (B)' : 'Enable band (B)'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-meter-red hover:bg-meter-red/15"
                        aria-label="Remove band"
                        onClick={() => { handleRemoveBand(selectedBandIndex); }}
                        disabled={readOnly}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Remove band (Delete)</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <BandParameters
                band={selectedBand}
                onChange={handleParameterChange}
                disabled={readOnly}
              />

              <div className="border-t border-dsp-primary/30 pt-4">
                {selectedBand && selectedBandIndex !== null ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-dsp-text">Range</label>
                      <GainInput
                        value={selectedBand.dynamics.mode === 'upward'
                          ? selectedBand.dynamics.rangeDb
                          : -selectedBand.dynamics.rangeDb}
                        onChange={(v) => {
                          const nextMode: DeqBand['dynamics']['mode'] = v > 0
                            ? 'upward'
                            : v < 0
                              ? 'downward'
                              : selectedBand.dynamics.mode;
                          handleDynamicsChange(selectedBandIndex, { mode: nextMode, rangeDb: Math.abs(v) });
                        }}
                        min={-24}
                        max={24}
                        disabled={readOnly}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium text-dsp-text">Threshold (dBFS)</label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-dsp-text-muted hover:bg-dsp-primary/20 hover:text-dsp-text"
                                aria-label="Threshold help"
                                onClick={(e) => { e.preventDefault(); }}
                              >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-64">
                              Signal-level threshold (in dBFS) where the dynamic EQ starts reacting. Lower values (more
                              negative) mean it engages more often.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <GainInput
                          value={selectedBand.dynamics.thresholdDb}
                          onChange={(v) => {
                            handleDynamicsChange(selectedBandIndex, { thresholdDb: v });
                          }}
                          min={-80}
                          max={0}
                          disabled={readOnly}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium text-dsp-text">Ratio</label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-dsp-text-muted hover:bg-dsp-primary/20 hover:text-dsp-text"
                                aria-label="Ratio help"
                                onClick={(e) => { e.preventDefault(); }}
                              >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-64">
                              Controls how strongly the band reacts once past the threshold (higher = more aggressive).
                              1.0 means no dynamic change.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <NumericInput
                          value={selectedBand.dynamics.ratio}
                          onChange={(v) => {
                            handleDynamicsChange(selectedBandIndex, { ratio: v });
                          }}
                          min={1}
                          max={20}
                          step={0.1}
                          precision={1}
                          disabled={readOnly}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-dsp-text">Attack</label>
                        <NumericInput
                          value={selectedBand.dynamics.attackMs}
                          onChange={(v) => {
                            handleDynamicsChange(selectedBandIndex, { attackMs: v });
                          }}
                          min={0.1}
                          max={500}
                          step={0.1}
                          precision={1}
                          unit="ms"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-dsp-text">Release</label>
                        <NumericInput
                          value={selectedBand.dynamics.releaseMs}
                          onChange={(v) => {
                            handleDynamicsChange(selectedBandIndex, { releaseMs: v });
                          }}
                          min={10}
                          max={5000}
                          step={1}
                          precision={0}
                          unit="ms"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-dsp-text-muted">
                    Select a band to edit dynamics.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dsp-text-muted">
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">1-9</kbd> Select band</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">←→</kbd> Frequency</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">↑↓</kbd> Gain</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">B</kbd> Bypass</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">Del</kbd> Remove</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">Esc</kbd> Deselect</span>
      </div>
    </div>
  );
}
