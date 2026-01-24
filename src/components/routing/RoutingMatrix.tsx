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

export function RoutingMatrix({
  mixer,
  onMixerChange,
  inputLabels,
  outputLabels,
}: RoutingMatrixProps) {
  const [selectedCrosspoint, setSelectedCrosspoint] = useState<SelectedCrosspoint | null>(null);
  const [focusedCell, setFocusedCell] = useState<SelectedCrosspoint>({ input: 0, output: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const inputChannels = mixer.channels.in;
  const outputChannels = mixer.channels.out;

  // Build routing lookup for O(1) access
  const routingMap = useMemo(() => {
    const map = new Map<string, MixerSource>();
    for (const mapping of mixer.mapping) {
      if (mapping) {
        for (const source of mapping.sources) {
          map.set(`${source.channel}-${mapping.dest}`, source);
        }
      }
    }
    return map;
  }, [mixer]);

  const getSource = useCallback(
    (input: number, output: number): MixerSource | undefined => {
      return routingMap.get(`${input}-${output}`);
    },
    [routingMap]
  );

  const getInputLabel = useCallback(
    (index: number): string => {
      return inputLabels?.[index] ?? `In ${index + 1}`;
    },
    [inputLabels]
  );

  const getOutputLabel = useCallback(
    (index: number): string => {
      return outputLabels?.[index] ?? `Out ${index + 1}`;
    },
    [outputLabels]
  );

  // Find or create mapping for an output
  const ensureMapping = useCallback(
    (output: number): MixerMapping[] => {
      const existing = mixer.mapping.find((m) => m.dest === output);
      if (existing) {
        return mixer.mapping;
      }
      return [...mixer.mapping, { dest: output, sources: [] }];
    },
    [mixer.mapping]
  );

  const addSource = useCallback(
    (output: number, source: MixerSource) => {
      const mapping = ensureMapping(output);
      const newMapping = mapping.map((m) => {
        if (m.dest === output) {
          return { ...m, sources: [...m.sources, source] };
        }
        return m;
      });
      // If we just created the mapping, add the source to it
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
        .map((m) => {
          if (m.dest === output) {
            const newSources = m.sources.filter((s) => s.channel !== inputChannel);
            return { ...m, sources: newSources };
          }
          return m;
        })
        .filter((m) => m.sources.length > 0); // Remove empty mappings
      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, onMixerChange]
  );

  const updateSource = useCallback(
    (output: number, inputChannel: number, updates: Partial<MixerSource>) => {
      const newMapping = mixer.mapping.map((m) => {
        if (m.dest === output) {
          const newSources = m.sources.map((s) => {
            if (s.channel === inputChannel) {
              return { ...s, ...updates };
            }
            return s;
          });
          return { ...m, sources: newSources };
        }
        return m;
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
      } else {
        addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
      }
    },
    [getSource, addSource, removeSource, selectedCrosspoint]
  );

  const togglePhase = useCallback(
    (input: number, output: number) => {
      const source = getSource(input, output);
      if (source) {
        updateSource(output, input, { inverted: !source.inverted });
      }
    },
    [getSource, updateSource]
  );

  const toggleMute = useCallback(
    (input: number, output: number) => {
      const source = getSource(input, output);
      if (source) {
        updateSource(output, input, { mute: !source.mute });
      }
    },
    [getSource, updateSource]
  );

  const handleSourceChange = useCallback(
    (source: Partial<MixerSource> | null) => {
      if (!selectedCrosspoint) return;
      const { input, output } = selectedCrosspoint;
      if (source === null) {
        // Remove connection
        removeSource(output, input);
        setSelectedCrosspoint(null);
      } else {
        updateSource(output, input, source);
      }
    },
    [selectedCrosspoint, removeSource, updateSource]
  );

  const handleAddConnection = useCallback(() => {
    if (!selectedCrosspoint) return;
    const { input, output } = selectedCrosspoint;
    addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
  }, [selectedCrosspoint, addSource]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { input, output } = focusedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (input > 0) {
            setFocusedCell({ input: input - 1, output });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (input < inputChannels - 1) {
            setFocusedCell({ input: input + 1, output });
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (output > 0) {
            setFocusedCell({ input, output: output - 1 });
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (output < outputChannels - 1) {
            setFocusedCell({ input, output: output + 1 });
          }
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
          if (source) {
            removeSource(output, input);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          setSelectedCrosspoint(null);
          break;
      }
    },
    [
      focusedCell,
      inputChannels,
      outputChannels,
      toggleCrosspoint,
      togglePhase,
      toggleMute,
      getSource,
      removeSource,
    ]
  );

  // Focus management
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cellId = `cell-${focusedCell.input}-${focusedCell.output}`;
    const cell = grid.querySelector(`[data-cell-id="${cellId}"]`) as HTMLElement | null;
    cell?.focus();
  }, [focusedCell]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4 text-dsp-text">MIXER - Routing Matrix</h2>

      <div
        ref={gridRef}
        className="overflow-auto"
        role="grid"
        aria-label="Audio routing matrix"
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse">
          {/* Header row - outputs */}
          <thead>
            <tr role="row">
              <th className="w-24 p-2 text-left text-sm text-gray-400">INPUTS</th>
              {Array.from({ length: outputChannels }).map((_, out) => (
                <th key={out} className="w-16 p-2 text-center text-sm" role="columnheader">
                  <div className="text-dsp-text">{out + 1}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[60px]">
                    {getOutputLabel(out)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body - inputs × outputs */}
          <tbody>
            {Array.from({ length: inputChannels }).map((_, input) => (
              <tr key={input} className="border-t border-white/10" role="row">
                <td className="p-2 text-sm" role="rowheader">
                  <span className="text-gray-400">{input + 1}</span>
                  <span className="ml-2 text-dsp-text">{getInputLabel(input)}</span>
                </td>
                {Array.from({ length: outputChannels }).map((_, output) => (
                  <td key={output} className="p-0">
                    <div data-cell-id={`cell-${input}-${output}`}>
                      <CrosspointCell
                        source={getSource(input, output)}
                        isSelected={
                          selectedCrosspoint?.input === input &&
                          selectedCrosspoint?.output === output
                        }
                        isFocused={
                          focusedCell.input === input && focusedCell.output === output
                        }
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
        <span>
          <span className="inline-block w-2 h-2 bg-dsp-accent rounded-sm mr-1" /> Connected
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-gray-500 rounded-sm mr-1" /> Muted
        </span>
        <span className="text-meter-red">φ</span> Phase inverted
        <span className="ml-4">Click to select • Double-click to toggle • Shift+click to invert phase</span>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-2 text-xs text-gray-500">
        Keys: Arrow keys to navigate • Space/Enter to toggle • I to invert phase • M to mute • Delete to remove
      </div>

      {/* Crosspoint Editor */}
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
