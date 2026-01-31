import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { BiquadParameters } from '../../types';
import { EQCanvas } from './EQCanvas';
import { BandSelector } from './BandSelector';
import { BandParameters } from './BandParameters';
import {
  type EQEditorProps,
  type EQBand,
  type CanvasDimensions,
  hasGain,
  hasQ,
  getBandFrequency,
} from './types';
import { useAddBandDrag } from './useAddBandDrag';

/** Default dimensions for the EQ canvas */
const DEFAULT_DIMENSIONS: CanvasDimensions = {
  width: 800,
  height: 400,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 50,
};

/** Generate a unique ID for a new band */
function generateBandId(): string {
  return `band-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a default peaking EQ band */
function createDefaultBand(freq = 1000, gain = 0): EQBand {
  return {
    id: generateBandId(),
    enabled: true,
    parameters: {
      type: 'Peaking',
      freq,
      gain,
      q: 1.0,
    },
  };
}

export function EQEditor({
  bands,
  onChange,
  sampleRate,
  selectedBandIndex: controlledSelectedIndex,
  onSelectBand: controlledOnSelectBand,
  className,
  readOnly = false,
}: EQEditorProps) {
  // Use controlled or uncontrolled selection
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);
  const selectedBandIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const onSelectBand = controlledOnSelectBand ?? setInternalSelectedIndex;

  // Container ref for keyboard events
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive canvas dimensions
  const [dimensions, setDimensions] = useState<CanvasDimensions>(DEFAULT_DIMENSIONS);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const width = Math.max(400, rect.width);
        const height = Math.max(250, Math.min(500, width * 0.5));
        setDimensions({
          ...DEFAULT_DIMENSIONS,
          width,
          height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => { window.removeEventListener('resize', updateDimensions); };
  }, []);

  // Handle band changes
  const handleBandChange = useCallback((index: number, updates: Partial<BiquadParameters>) => {
    if (readOnly) return;
    const newBands = [...bands];
    const band = newBands[index];
    if (!band) return;

    newBands[index] = {
      ...band,
      parameters: { ...band.parameters, ...updates } as BiquadParameters,
    };
    onChange(newBands);
  }, [bands, onChange, readOnly]);

  // Handle adding a new band
  const handleAddBand = useCallback(() => {
    if (readOnly) return;

    // Find a frequency that's not too close to existing bands
    const existingFreqs = bands.map((b) => getBandFrequency(b.parameters));
    let newFreq = 1000;

    // Try to find a gap
    const standardFreqs = [100, 250, 500, 1000, 2000, 4000, 8000];
    for (const freq of standardFreqs) {
      const isTooClose = existingFreqs.some(
        (existing) => Math.abs(Math.log10(existing) - Math.log10(freq)) < 0.2
      );
      if (!isTooClose) {
        newFreq = freq;
        break;
      }
    }

    const newBand = createDefaultBand(newFreq, 0);
    const newBands = [...bands, newBand];
    onChange(newBands);
    onSelectBand(newBands.length - 1);
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

  // Handle removing a band
  const handleRemoveBand = useCallback((index: number) => {
    if (readOnly) return;
    const newBands = bands.filter((_, i) => i !== index);
    onChange(newBands);

    // Update selection
    if (selectedBandIndex === index) {
      onSelectBand(newBands.length > 0 ? Math.min(index, newBands.length - 1) : null);
    } else if (selectedBandIndex !== null && selectedBandIndex > index) {
      onSelectBand(selectedBandIndex - 1);
    }
  }, [bands, onChange, selectedBandIndex, onSelectBand, readOnly]);

  // Handle toggling a band's enabled state
  const handleToggleBand = useCallback((index: number) => {
    if (readOnly) return;
    const newBands = [...bands];
    const band = newBands[index];
    if (!band) return;

    newBands[index] = { ...band, enabled: !band.enabled };
    onChange(newBands);
  }, [bands, onChange, readOnly]);

  // Handle parameter changes from the parameter panel
  const handleParameterChange = useCallback((updates: Partial<BiquadParameters>) => {
    if (selectedBandIndex === null || readOnly) return;
    handleBandChange(selectedBandIndex, updates);
  }, [selectedBandIndex, handleBandChange, readOnly]);

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      // Check if we're focused on an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Number keys 1-9 to select bands
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < bands.length) {
          e.preventDefault();
          onSelectBand(index);
        }
        return;
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectBand(null);
        return;
      }

      // Only handle remaining shortcuts if a band is selected
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
          {
            const currentFreq = getBandFrequency(selectedBand.parameters);
            const step = e.shiftKey ? 0.95 : 0.99; // Coarse or fine
            const newFreq = Math.max(20, currentFreq * step);
            if ('freq' in selectedBand.parameters) {
              handleBandChange(selectedBandIndex, { freq: Math.round(newFreq) });
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          {
            const currentFreq = getBandFrequency(selectedBand.parameters);
            const step = e.shiftKey ? 1.05 : 1.01;
            const newFreq = Math.min(20000, currentFreq * step);
            if ('freq' in selectedBand.parameters) {
              handleBandChange(selectedBandIndex, { freq: Math.round(newFreq) });
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (hasGain(selectedBand.parameters.type) && 'gain' in selectedBand.parameters) {
            const currentGain = selectedBand.parameters.gain;
            const step = e.shiftKey ? 1 : 0.5;
            const newGain = Math.min(24, currentGain + step);
            handleBandChange(selectedBandIndex, { gain: Math.round(newGain * 10) / 10 });
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (hasGain(selectedBand.parameters.type) && 'gain' in selectedBand.parameters) {
            const currentGain = selectedBand.parameters.gain;
            const step = e.shiftKey ? 1 : 0.5;
            const newGain = Math.max(-24, currentGain - step);
            handleBandChange(selectedBandIndex, { gain: Math.round(newGain * 10) / 10 });
          }
          break;

        case 'q':
        case 'Q':
          e.preventDefault();
          if (hasQ(selectedBand.parameters.type) && 'q' in selectedBand.parameters) {
            const currentQ = selectedBand.parameters.q;
            const delta = e.shiftKey ? -0.1 : 0.1;
            const newQ = Math.max(0.1, Math.min(20, currentQ + delta));
            handleBandChange(selectedBandIndex, { q: Math.round(newQ * 100) / 100 });
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

  // Get the selected band for the parameter panel
  const selectedBand = selectedBandIndex !== null ? bands[selectedBandIndex] ?? null : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'flex flex-col gap-4 p-4 bg-dsp-surface rounded-lg outline-none',
        'focus-within:ring-2 focus-within:ring-dsp-accent/50',
        className
      )}
    >
      {/* Band Selector */}
      <BandSelector
        bands={bands}
        selectedIndex={selectedBandIndex}
        onSelect={onSelectBand}
        onAdd={handleAddBand}
        onRemove={handleRemoveBand}
        onToggle={handleToggleBand}
        disabled={readOnly}
      />

      {/* Main content: Canvas and Parameters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* EQ Canvas */}
        <div ref={canvasContainerRef} className="flex-1 min-w-0">
          <EQCanvas
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
        </div>

        {/* Parameter Panel */}
        <div className="lg:w-64 shrink-0">
          <div className="p-4 bg-dsp-bg/50 rounded-lg">
            <h3 className="text-sm font-medium text-dsp-text mb-3">
              {selectedBand ? `Band ${selectedBandIndex! + 1}` : 'Band Parameters'}
            </h3>
            <BandParameters
              band={selectedBand}
              onChange={handleParameterChange}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dsp-text-muted">
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">1-9</kbd> Select band</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">←→</kbd> Frequency</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">↑↓</kbd> Gain</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">Q</kbd> Q factor</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">B</kbd> Bypass</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">Del</kbd> Remove</span>
        <span><kbd className="px-1 py-0.5 bg-dsp-primary/50 rounded">Esc</kbd> Deselect</span>
      </div>
    </div>
  );
}
