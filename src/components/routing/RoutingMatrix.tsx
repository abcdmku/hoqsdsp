import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { CrosspointCell } from './CrosspointCell';
import { CrosspointEditor } from './CrosspointEditor';
import type { MixerConfig, MixerSource, MixerMapping } from '../../types';

export interface RoutingMatrixProps {
  mixer: MixerConfig;
  onMixerChange: (mixer: MixerConfig) => void;
  inputLabels?: string[];
  outputLabels?: string[];
}

interface SelectedCrosspoint {
  input: number;
  output: number;
}

export function RoutingMatrix({ mixer, onMixerChange, inputLabels, outputLabels }: RoutingMatrixProps) {
  const [selectedCrosspoint, setSelectedCrosspoint] = useState<SelectedCrosspoint | null>(null);
  const [focusedCell, setFocusedCell] = useState<SelectedCrosspoint>({ input: 0, output: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const inputChannels = mixer.channels.in;
  const outputChannels = mixer.channels.out;

  const routingMap = useMemo(() => {
    const map = new Map<string, MixerSource>();
    for (const mapping of mixer.mapping) {
      for (const source of mapping.sources) {
        map.set(`${source.channel}-${mapping.dest}`, source);
      }
    }
    return map;
  }, [mixer.mapping]);

  const getSource = useCallback(
    (input: number, output: number): MixerSource | undefined => routingMap.get(`${input}-${output}`),
    [routingMap]
  );

  const getInputLabel = useCallback((index: number) => inputLabels?.[index] ?? `In ${index + 1}`, [inputLabels]);
  const getOutputLabel = useCallback((index: number) => outputLabels?.[index] ?? `Out ${index + 1}`, [outputLabels]);

  const ensureMapping = useCallback(
    (output: number): MixerMapping[] => {
      const existing = mixer.mapping.find((m) => m.dest === output);
      if (existing) return mixer.mapping;
      return [...mixer.mapping, { dest: output, sources: [] }];
    },
    [mixer.mapping]
  );

  const addSource = useCallback(
    (output: number, source: MixerSource) => {
      const mapping = ensureMapping(output);
      const newMapping = mapping.map((m) => (m.dest === output ? { ...m, sources: [...m.sources, source] } : m));

      const hasMapping = mixer.mapping.some((m) => m.dest === output);
      if (!hasMapping) {
        const idx = newMapping.findIndex((m) => m.dest === output);
        if (idx >= 0) {
          newMapping[idx] = { dest: output, sources: [source] };
        }
      }

      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, ensureMapping, onMixerChange]
  );

  const removeSource = useCallback(
    (output: number, inputChannel: number) => {
      const newMapping = mixer.mapping
        .map((m) => (m.dest === output ? { ...m, sources: m.sources.filter((s) => s.channel !== inputChannel) } : m))
        .filter((m) => m.sources.length > 0);
      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, onMixerChange]
  );

  const updateSource = useCallback(
    (output: number, inputChannel: number, updates: Partial<MixerSource>) => {
      const newMapping = mixer.mapping.map((m) => {
        if (m.dest !== output) return m;
        return {
          ...m,
          sources: m.sources.map((s) => (s.channel === inputChannel ? { ...s, ...updates } : s)),
        };
      });
      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, onMixerChange]
  );

  const toggleCrosspoint = useCallback(
    (input: number, output: number) => {
      const existing = getSource(input, output);
      if (existing) {
        removeSource(output, input);
        if (selectedCrosspoint?.input === input && selectedCrosspoint?.output === output) {
          setSelectedCrosspoint(null);
        }
        return;
      }
      addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
    },
    [getSource, addSource, removeSource, selectedCrosspoint]
  );

  const togglePhase = useCallback(
    (input: number, output: number) => {
      const source = getSource(input, output);
      if (source) updateSource(output, input, { inverted: !source.inverted });
    },
    [getSource, updateSource]
  );

  const toggleMute = useCallback(
    (input: number, output: number) => {
      const source = getSource(input, output);
      if (source) updateSource(output, input, { mute: !source.mute });
    },
    [getSource, updateSource]
  );

  const handleAddConnection = useCallback(() => {
    if (!selectedCrosspoint) return;
    addSource(selectedCrosspoint.output, { channel: selectedCrosspoint.input, gain: 0, inverted: false, mute: false });
  }, [selectedCrosspoint, addSource]);

  const handleSourceChange = useCallback(
    (updates: Partial<MixerSource> | null) => {
      if (!selectedCrosspoint) return;
      if (updates === null) {
        removeSource(selectedCrosspoint.output, selectedCrosspoint.input);
        setSelectedCrosspoint(null);
        return;
      }
      updateSource(selectedCrosspoint.output, selectedCrosspoint.input, updates);
    },
    [selectedCrosspoint, removeSource, updateSource]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { input, output } = focusedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCell({ input: Math.max(0, input - 1), output });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedCell({ input: Math.min(inputChannels - 1, input + 1), output });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCell({ input, output: Math.max(0, output - 1) });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCell({ input, output: Math.min(outputChannels - 1, output + 1) });
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          toggleCrosspoint(input, output);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          togglePhase(input, output);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute(input, output);
          break;
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          const source = getSource(input, output);
          if (source) removeSource(output, input);
          break;
        }
        case 'Escape':
          e.preventDefault();
          setSelectedCrosspoint(null);
          break;
      }
    },
    [focusedCell, inputChannels, outputChannels, toggleCrosspoint, togglePhase, toggleMute, getSource, removeSource]
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cellId = `cell-${focusedCell.input}-${focusedCell.output}`;
    const cell = grid.querySelector<HTMLElement>(`[data-cell-id="${cellId}"]`);
    cell?.focus();
  }, [focusedCell]);

  return (
    <div>
      <div
        ref={gridRef}
        className="overflow-auto"
        role="grid"
        aria-label="Audio routing matrix"
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse">
          <thead>
            <tr role="row">
              <th className="w-28 p-2 text-left text-xs font-semibold tracking-wide text-dsp-text-muted" scope="col">
                Inputs
              </th>
              {Array.from({ length: outputChannels }).map((_, out) => (
                <th key={out} className="w-16 p-2 text-center" role="columnheader" scope="col">
                  <div className="text-sm font-semibold text-dsp-text">{out + 1}</div>
                  <div className="max-w-[60px] truncate text-xs text-dsp-text-muted">{getOutputLabel(out)}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: inputChannels }).map((_, input) => (
              <tr key={input} className="border-t border-dsp-primary/30" role="row">
                <td className="p-2 text-sm" role="rowheader">
                  <span className="text-dsp-text-muted">{input + 1}</span>
                  <span className="ml-2 text-dsp-text">{getInputLabel(input)}</span>
                </td>
                {Array.from({ length: outputChannels }).map((_, output) => (
                  <td key={output} className="p-0">
                    <div data-cell-id={`cell-${input}-${output}`}>
                      <CrosspointCell
                        source={getSource(input, output)}
                        isSelected={selectedCrosspoint?.input === input && selectedCrosspoint?.output === output}
                        isFocused={focusedCell.input === input && focusedCell.output === output}
                        inputIndex={input}
                        outputIndex={output}
                        onClick={() => {
                          setSelectedCrosspoint({ input, output });
                          setFocusedCell({ input, output });
                        }}
                        onToggle={() => { toggleCrosspoint(input, output); }}
                        onPhaseToggle={() => { togglePhase(input, output); }}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-dsp-text-muted">
        <span>
          <span className="inline-block w-2 h-2 bg-dsp-accent rounded-sm mr-1 align-middle" /> Connected
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-dsp-primary/70 rounded-sm mr-1 align-middle" /> Muted
        </span>
        <span className="text-meter-red font-medium">φ</span> Phase inverted
        <span className="ml-2">
          Click to select • Double-click to toggle • Shift+click to invert phase
        </span>
      </div>

      <div className="mt-2 text-[11px] text-dsp-text-muted">
        Keys: Arrow keys to navigate • Space/Enter to toggle • I to invert phase • M to mute • Delete to remove
      </div>

      {selectedCrosspoint && (
        <CrosspointEditor
          source={getSource(selectedCrosspoint.input, selectedCrosspoint.output)}
          inputChannel={selectedCrosspoint.input}
          inputLabel={getInputLabel(selectedCrosspoint.input)}
          outputLabel={getOutputLabel(selectedCrosspoint.output)}
          onSourceChange={handleSourceChange}
          onAddConnection={handleAddConnection}
          onClose={() => { setSelectedCrosspoint(null); }}
        />
      )}
    </div>
  );
}

