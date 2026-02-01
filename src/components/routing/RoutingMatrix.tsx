import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { CrosspointCell, type CrosspointToolPreview } from './CrosspointCell';
import { CrosspointEditor } from './CrosspointEditor';
import { Button, NumericInput } from '../ui';
import type { MixerConfig, MixerSource, MixerMapping } from '../../types';

export interface RoutingMatrixProps {
  mixer: MixerConfig;
  onMixerChange: (mixer: MixerConfig, options?: { debounce?: boolean }) => void;
  inputLabels?: string[];
  outputLabels?: string[];
  inputDeviceLabel?: string;
  outputDeviceLabel?: string;
}

interface SelectedCrosspoint {
  input: number;
  output: number;
}

type RoutingTool = 'gain' | 'phase' | 'mute' | 'disconnect' | null;

export function RoutingMatrix({
  mixer,
  onMixerChange,
  inputLabels,
  outputLabels,
  inputDeviceLabel,
  outputDeviceLabel,
}: RoutingMatrixProps) {
  const [selectedCrosspoint, setSelectedCrosspoint] = useState<SelectedCrosspoint | null>(null);
  const [focusedCell, setFocusedCell] = useState<SelectedCrosspoint>({ input: 0, output: 0 });
  const [hoveredCrosspoint, setHoveredCrosspoint] = useState<SelectedCrosspoint | null>(null);
  const [activeTool, setActiveTool] = useState<RoutingTool>(null);
  const [toolGain, setToolGain] = useState(0);
  const lastToolClickRef = useRef<{ input: number; output: number; at: number } | null>(null);
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
  const inputDeviceTitle =
    inputDeviceLabel && inputDeviceLabel !== 'Capture' ? `Capture: ${inputDeviceLabel}` : 'Capture';
  const outputDeviceTitle =
    outputDeviceLabel && outputDeviceLabel !== 'Playback' ? `Playback: ${outputDeviceLabel}` : 'Playback';
  const hoverHeaderTextClass =
    activeTool === 'disconnect'
      ? 'text-meter-red'
      : activeTool === 'mute'
        ? 'text-dsp-primary'
        : 'text-dsp-accent';

  useEffect(() => {
    if (activeTool) {
      setSelectedCrosspoint(null);
    }
    setHoveredCrosspoint(null);
  }, [activeTool]);

  const toggleTool = useCallback((tool: Exclude<RoutingTool, null>) => {
    setActiveTool((current) => (current === tool ? null : tool));
  }, []);

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
    (output: number, inputChannel: number, updates: Partial<MixerSource>, options?: { debounce?: boolean }) => {
      const newMapping = mixer.mapping.map((m) => {
        if (m.dest !== output) return m;
        return {
          ...m,
          sources: m.sources.map((s) => (s.channel === inputChannel ? { ...s, ...updates } : s)),
        };
      });
      const nextMixer = { ...mixer, mapping: newMapping };
      if (options) {
        onMixerChange(nextMixer, options);
        return;
      }
      onMixerChange(nextMixer);
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

  const applyToolToPredicate = useCallback(
    (predicate: (dest: number, source: MixerSource) => boolean) => {
      if (!activeTool) return;

      if (activeTool === 'disconnect') {
        let hasAny = false;
        for (const mapping of mixer.mapping) {
          for (const source of mapping.sources) {
            if (predicate(mapping.dest, source)) {
              hasAny = true;
              break;
            }
          }
          if (hasAny) break;
        }
        if (!hasAny) return;

        const nextMapping = mixer.mapping
          .map((m) => {
            const hasMatch = m.sources.some((s) => predicate(m.dest, s));
            if (!hasMatch) return m;

            const nextSources = m.sources.filter((s) => !predicate(m.dest, s));
            return nextSources.length > 0 ? { ...m, sources: nextSources } : null;
          })
          .filter((m): m is MixerMapping => m !== null);

        onMixerChange({ ...mixer, mapping: nextMapping });
        return;
      }

      if (activeTool === 'gain') {
        let hasAny = false;
        for (const mapping of mixer.mapping) {
          for (const source of mapping.sources) {
            if (predicate(mapping.dest, source)) {
              hasAny = true;
              break;
            }
          }
          if (hasAny) break;
        }
        if (!hasAny) return;

        const nextMapping = mixer.mapping.map((m) => {
          let changed = false;
          const nextSources = m.sources.map((s) => {
            if (!predicate(m.dest, s)) return s;
            if (s.gain === toolGain) return s;
            changed = true;
            return { ...s, gain: toolGain };
          });
          return changed ? { ...m, sources: nextSources } : m;
        });

        onMixerChange({ ...mixer, mapping: nextMapping });
        return;
      }

      const field: 'inverted' | 'mute' = activeTool === 'phase' ? 'inverted' : 'mute';
      let hasAny = false;
      let shouldEnable = false;
      for (const mapping of mixer.mapping) {
        for (const source of mapping.sources) {
          if (!predicate(mapping.dest, source)) continue;
          hasAny = true;
          if (!(source[field] ?? false)) {
            shouldEnable = true;
          }
        }
      }
      if (!hasAny) return;

      const nextMapping = mixer.mapping.map((m) => {
        let changed = false;
        const nextSources = m.sources.map((s) => {
          if (!predicate(m.dest, s)) return s;
          if ((s[field] ?? false) === shouldEnable) return s;
          changed = true;
          return { ...s, [field]: shouldEnable };
        });
        return changed ? { ...m, sources: nextSources } : m;
      });

      onMixerChange({ ...mixer, mapping: nextMapping });
    },
    [activeTool, mixer, onMixerChange, toolGain],
  );

  const applyToolToInputChannel = useCallback(
    (inputChannel: number) => {
      applyToolToPredicate((_dest, source) => source.channel === inputChannel);
    },
    [applyToolToPredicate],
  );

  const applyToolToOutputChannel = useCallback(
    (outputChannel: number) => {
      applyToolToPredicate((dest) => dest === outputChannel);
    },
    [applyToolToPredicate],
  );

  const applyToolToDevice = useCallback(() => {
    applyToolToPredicate(() => true);
  }, [applyToolToPredicate]);

  const getToolPreview = useCallback(
    (source: MixerSource | undefined): CrosspointToolPreview => {
      if (!activeTool) return null;
      if (activeTool === 'gain') return { kind: 'gain', gain: toolGain };
      if (activeTool === 'phase') return { kind: 'phase', inverted: source ? !source.inverted : true };
      if (activeTool === 'mute') return { kind: 'mute', mute: source ? !source.mute : true };
      return { kind: 'disconnect' };
    },
    [activeTool, toolGain],
  );

  const handleCellClick = useCallback(
    (input: number, output: number, event: React.MouseEvent<HTMLButtonElement>) => {
      setFocusedCell({ input, output });

      if (!activeTool) {
        if (event.shiftKey && getSource(input, output)) {
          event.preventDefault();
          togglePhase(input, output);
          return;
        }
        setSelectedCrosspoint({ input, output });
        return;
      }

      event.preventDefault();
      setSelectedCrosspoint(null);

      const now = Date.now();
      const last = lastToolClickRef.current;
      if (last && last.input === input && last.output === output && now - last.at < 250) {
        lastToolClickRef.current = { input, output, at: now };
        return;
      }
      lastToolClickRef.current = { input, output, at: now };

      const existing = getSource(input, output);

      if (activeTool === 'disconnect') {
        if (existing) removeSource(output, input);
        return;
      }

      if (activeTool === 'gain') {
        if (existing) {
          updateSource(output, input, { gain: toolGain });
          return;
        }
        addSource(output, { channel: input, gain: toolGain, inverted: false, mute: false });
        return;
      }

      if (activeTool === 'phase') {
        if (existing) {
          updateSource(output, input, { inverted: !existing.inverted });
          return;
        }
        addSource(output, { channel: input, gain: 0, inverted: true, mute: false });
        return;
      }

      // mute
      if (existing) {
        updateSource(output, input, { mute: !existing.mute });
        return;
      }
      addSource(output, { channel: input, gain: 0, inverted: false, mute: true });
    },
    [activeTool, addSource, getSource, removeSource, togglePhase, toolGain, updateSource],
  );

  const handleAddConnection = useCallback(() => {
    if (!selectedCrosspoint) return;
    addSource(selectedCrosspoint.output, { channel: selectedCrosspoint.input, gain: 0, inverted: false, mute: false });
  }, [selectedCrosspoint, addSource]);

  const handleSourceChange = useCallback(
    (updates: Partial<MixerSource> | null, options?: { debounce?: boolean }) => {
      if (!selectedCrosspoint) return;
      if (updates === null) {
        removeSource(selectedCrosspoint.output, selectedCrosspoint.input);
        setSelectedCrosspoint(null);
        return;
      }
      updateSource(selectedCrosspoint.output, selectedCrosspoint.input, updates, options);
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
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dsp-primary/40 bg-dsp-surface/20 p-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTool === 'gain' ? 'default' : 'outline'}
            aria-pressed={activeTool === 'gain'}
            onClick={() => { toggleTool('gain'); }}
          >
            Gain
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'phase' ? 'default' : 'outline'}
            aria-pressed={activeTool === 'phase'}
            onClick={() => { toggleTool('phase'); }}
          >
            Phase
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'mute' ? 'default' : 'outline'}
            aria-pressed={activeTool === 'mute'}
            onClick={() => { toggleTool('mute'); }}
          >
            Mute
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'disconnect' ? 'destructive' : 'outline'}
            aria-pressed={activeTool === 'disconnect'}
            onClick={() => { toggleTool('disconnect'); }}
          >
            Disconnect
          </Button>
        </div>

        {activeTool === 'gain' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-dsp-text-muted">Gain:</span>
            <NumericInput
              aria-label="Tool gain"
              value={toolGain}
              onChange={setToolGain}
              min={-40}
              max={12}
              step={0.5}
              precision={1}
              unit="dB"
            />
          </div>
        )}
      </div>

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
              <th className="w-28 p-0" scope="col" />
              <th
                className="p-0 text-left text-xs font-semibold tracking-wide text-dsp-text-muted"
                scope="colgroup"
                colSpan={outputChannels}
              >
                <button
                  type="button"
                  className={[
                    'h-10 w-full rounded-md px-2 text-left transition-colors',
                    activeTool ? 'hover:bg-dsp-primary/15' : 'pointer-events-none',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                  ].join(' ')}
                  tabIndex={activeTool ? 0 : -1}
                  aria-disabled={!activeTool}
                  title={outputDeviceTitle}
                  onClick={() => {
                    if (!activeTool) return;
                    applyToolToDevice();
                  }}
                >
                  <span className="block truncate">{outputDeviceTitle}</span>
                </button>
              </th>
            </tr>

            <tr role="row">
              <th className="w-28 p-0 text-left text-xs font-semibold tracking-wide text-dsp-text-muted" scope="col">
                <button
                  type="button"
                  className={[
                    'h-10 w-full rounded-md px-2 text-left transition-colors truncate',
                    activeTool ? 'hover:bg-dsp-primary/15' : 'pointer-events-none',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                  ].join(' ')}
                  tabIndex={activeTool ? 0 : -1}
                  aria-disabled={!activeTool}
                  title={inputDeviceTitle}
                  onClick={() => {
                    if (!activeTool) return;
                    applyToolToDevice();
                  }}
                >
                  {inputDeviceTitle}
                </button>
              </th>
              {Array.from({ length: outputChannels }).map((_, out) => (
                <th key={out} className="w-16 p-0 text-center align-middle" role="columnheader" scope="col">
                  <button
                    type="button"
                    className={[
                      'flex h-10 w-full items-center justify-center rounded-md px-1 text-xs font-medium transition-colors',
                      activeTool ? 'hover:bg-dsp-primary/15' : 'pointer-events-none',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                    ].join(' ')}
                    tabIndex={activeTool ? 0 : -1}
                    aria-disabled={!activeTool}
                    onClick={() => {
                      if (!activeTool) return;
                      applyToolToOutputChannel(out);
                    }}
                  >
                    <span
                      className={[
                        'block max-w-[60px] truncate',
                        activeTool && hoveredCrosspoint?.output === out
                          ? `${hoverHeaderTextClass} font-semibold underline underline-offset-2`
                          : '',
                      ].join(' ')}
                      title={getOutputLabel(out)}
                    >
                      {getOutputLabel(out)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: inputChannels }).map((_, input) => (
              <tr key={input} className="border-t border-dsp-primary/30" role="row">
                <td className="w-28 p-0 text-sm align-middle" role="rowheader">
                  <button
                    type="button"
                    className={[
                      'flex h-10 w-full items-center rounded-md px-2 text-left transition-colors',
                      activeTool ? 'hover:bg-dsp-primary/15' : 'pointer-events-none',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
                    ].join(' ')}
                    tabIndex={activeTool ? 0 : -1}
                    aria-disabled={!activeTool}
                    onClick={() => {
                      if (!activeTool) return;
                      applyToolToInputChannel(input);
                    }}
                  >
                    <span
                      className={[
                        'w-full truncate text-dsp-text',
                        activeTool && hoveredCrosspoint?.input === input
                          ? `${hoverHeaderTextClass} font-semibold underline underline-offset-2`
                          : '',
                      ].join(' ')}
                      title={getInputLabel(input)}
                    >
                      {getInputLabel(input)}
                    </span>
                  </button>
                </td>
                {Array.from({ length: outputChannels }).map((_, output) => (
                  <td key={output} className="w-16 p-0">
                    <CrosspointCell
                      dataCellId={`cell-${input}-${output}`}
                      preview={
                        activeTool && hoveredCrosspoint?.input === input && hoveredCrosspoint?.output === output
                          ? getToolPreview(getSource(input, output))
                          : null
                      }
                      onMouseEnter={() => {
                        if (!activeTool) return;
                        setHoveredCrosspoint({ input, output });
                      }}
                      onMouseLeave={() => {
                        if (!activeTool) return;
                        setHoveredCrosspoint((current) =>
                          current?.input === input && current?.output === output ? null : current,
                        );
                      }}
                      source={getSource(input, output)}
                      isSelected={selectedCrosspoint?.input === input && selectedCrosspoint?.output === output}
                      isFocused={focusedCell.input === input && focusedCell.output === output}
                      inputIndex={input}
                      outputIndex={output}
                      onClick={(event) => { handleCellClick(input, output, event); }}
                      onToggle={() => {
                        if (activeTool) return;
                        toggleCrosspoint(input, output);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-dsp-text-muted">
        <span>
          <span className="mr-1 inline-block h-3 w-4 align-middle rounded-sm border border-dsp-accent/50 bg-dsp-accent/20" />{' '}
          Connected
        </span>
        <span>
          <span className="mr-1 inline-block h-3 w-4 align-middle rounded-sm border border-dsp-primary/40 bg-dsp-primary/15" />{' '}
          Muted
        </span>
        <span className="text-meter-red font-medium">{`180\u00B0`}</span> Phase
        <span className="ml-2">
          {activeTool
            ? `Tool active: click a cell to apply \u2022 click input/output headers for channel \u2022 click device to apply to all`
            : `Click to select \u2022 Double-click to toggle \u2022 Shift+click to invert phase`}
        </span>
      </div>

      <div className="mt-2 text-[11px] text-dsp-text-muted">
        {`Keys: Arrow keys to navigate \u2022 Space/Enter to toggle \u2022 I to invert phase \u2022 M to mute \u2022 Delete to remove`}
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
