import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { cn } from '../../lib/utils';
import { defaultColorForKey } from '../../lib/signalflow/colorUtils';
import { Slider } from '../ui';
import type { MixerConfig, MixerSource, MixerMapping } from '../../types';

export interface RoutingMatrixProps {
  mixer: MixerConfig;
  onMixerChange: (mixer: MixerConfig, options?: { debounce?: boolean }) => void;
  inputLabels?: string[];
  outputLabels?: string[];
  inputDeviceLabel?: string;
  outputDeviceLabel?: string;
  className?: string;
}

interface HoveredCell {
  input: number;
  output: number;
}

type BatchAction = 'gain' | 'phase' | 'mute' | 'disconnect';

function formatGainCompact(gain: number): string {
  if (Math.abs(gain) < 0.05) return '0';
  return `${gain > 0 ? '+' : ''}${gain.toFixed(1)}`;
}

export function RoutingMatrix({
  mixer,
  onMixerChange,
  inputLabels,
  outputLabels,
  inputDeviceLabel,
  outputDeviceLabel,
  className,
}: RoutingMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [editingCell, setEditingCell] = useState<HoveredCell | null>(null);
  const [focusedCell, setFocusedCell] = useState<HoveredCell>({ input: 0, output: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputChannels = mixer.channels.in;
  const outputChannels = mixer.channels.out;

  // Build a lookup map: "inputCh-outputCh" -> MixerSource
  const routingMap = useMemo(() => {
    const map = new Map<string, MixerSource>();
    for (const mapping of mixer.mapping) {
      for (const source of mapping.sources) {
        map.set(`${source.channel}:${mapping.dest}`, source);
      }
    }
    return map;
  }, [mixer.mapping]);

  const getSource = useCallback(
    (input: number, output: number): MixerSource | undefined => routingMap.get(`${input}:${output}`),
    [routingMap],
  );

  const getInputLabel = useCallback(
    (index: number) => inputLabels?.[index] ?? `In ${index + 1}`,
    [inputLabels],
  );
  const getOutputLabel = useCallback(
    (index: number) => outputLabels?.[index] ?? `Out ${index + 1}`,
    [outputLabels],
  );

  // Generate stable colors per channel
  const inputColors = useMemo(
    () => Array.from({ length: inputChannels }, (_, i) => defaultColorForKey(`routing:input:${i}`)),
    [inputChannels],
  );
  const outputColors = useMemo(
    () => Array.from({ length: outputChannels }, (_, i) => defaultColorForKey(`routing:output:${i}`)),
    [outputChannels],
  );

  const inputDeviceTitle =
    inputDeviceLabel && inputDeviceLabel !== 'Capture' ? inputDeviceLabel : 'Capture';
  const outputDeviceTitle =
    outputDeviceLabel && outputDeviceLabel !== 'Playback' ? outputDeviceLabel : 'Playback';

  // ── Mutation helpers ──────────────────────────────────────────────

  const ensureMapping = useCallback(
    (output: number): MixerMapping[] => {
      const existing = mixer.mapping.find((m) => m.dest === output);
      if (existing) return mixer.mapping;
      return [...mixer.mapping, { dest: output, sources: [] }];
    },
    [mixer.mapping],
  );

  const addSource = useCallback(
    (output: number, source: MixerSource) => {
      const mapping = ensureMapping(output);
      const newMapping = mapping.map((m) =>
        m.dest === output ? { ...m, sources: [...m.sources, source] } : m,
      );
      const hasMapping = mixer.mapping.some((m) => m.dest === output);
      if (!hasMapping) {
        const idx = newMapping.findIndex((m) => m.dest === output);
        if (idx >= 0) newMapping[idx] = { dest: output, sources: [source] };
      }
      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, ensureMapping, onMixerChange],
  );

  const removeSource = useCallback(
    (output: number, inputChannel: number) => {
      const newMapping = mixer.mapping
        .map((m) =>
          m.dest === output
            ? { ...m, sources: m.sources.filter((s) => s.channel !== inputChannel) }
            : m,
        )
        .filter((m) => m.sources.length > 0);
      onMixerChange({ ...mixer, mapping: newMapping });
    },
    [mixer, onMixerChange],
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
      } else {
        onMixerChange(nextMixer);
      }
    },
    [mixer, onMixerChange],
  );

  const toggleCrosspoint = useCallback(
    (input: number, output: number) => {
      const existing = getSource(input, output);
      if (existing) {
        removeSource(output, input);
        if (editingCell?.input === input && editingCell?.output === output) {
          setEditingCell(null);
        }
      } else {
        addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
      }
    },
    [getSource, addSource, removeSource, editingCell],
  );

  // ── Batch operations ──────────────────────────────────────────────

  const applyBatch = useCallback(
    (action: BatchAction, predicate: (dest: number, source: MixerSource) => boolean, gainValue?: number) => {
      if (action === 'disconnect') {
        const nextMapping = mixer.mapping
          .map((m) => {
            const nextSources = m.sources.filter((s) => !predicate(m.dest, s));
            return nextSources.length > 0 ? { ...m, sources: nextSources } : null;
          })
          .filter((m): m is MixerMapping => m !== null);
        onMixerChange({ ...mixer, mapping: nextMapping });
        return;
      }
      if (action === 'gain') {
        const nextMapping = mixer.mapping.map((m) => ({
          ...m,
          sources: m.sources.map((s) =>
            predicate(m.dest, s) ? { ...s, gain: gainValue ?? 0 } : s,
          ),
        }));
        onMixerChange({ ...mixer, mapping: nextMapping });
        return;
      }
      const field: 'inverted' | 'mute' = action === 'phase' ? 'inverted' : 'mute';
      // Toggle: if any matching source does NOT have the field set, enable all; else disable all
      let shouldEnable = false;
      for (const mapping of mixer.mapping) {
        for (const source of mapping.sources) {
          if (predicate(mapping.dest, source) && !(source[field] ?? false)) {
            shouldEnable = true;
          }
        }
      }
      const nextMapping = mixer.mapping.map((m) => ({
        ...m,
        sources: m.sources.map((s) =>
          predicate(m.dest, s) ? { ...s, [field]: shouldEnable } : s,
        ),
      }));
      onMixerChange({ ...mixer, mapping: nextMapping });
    },
    [mixer, onMixerChange],
  );

  const batchRow = useCallback(
    (outputCh: number, action: BatchAction, gainValue?: number) => {
      applyBatch(action, (dest) => dest === outputCh, gainValue);
    },
    [applyBatch],
  );

  const batchCol = useCallback(
    (inputCh: number, action: BatchAction, gainValue?: number) => {
      applyBatch(action, (_dest, source) => source.channel === inputCh, gainValue);
    },
    [applyBatch],
  );

  const batchAll = useCallback(
    (action: BatchAction, gainValue?: number) => {
      applyBatch(action, () => true, gainValue);
    },
    [applyBatch],
  );

  // ── Cell click handler ────────────────────────────────────────────

  const handleCellClick = useCallback(
    (input: number, output: number) => {
      setFocusedCell({ input, output });
      const existing = getSource(input, output);
      if (existing) {
        // Open inline popover for editing
        setEditingCell((prev) =>
          prev?.input === input && prev?.output === output ? null : { input, output },
        );
      } else {
        // Create connection
        addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
        setEditingCell({ input, output });
      }
    },
    [getSource, addSource],
  );

  const handleCellRightClick = useCallback(
    (e: React.MouseEvent, input: number, output: number) => {
      e.preventDefault();
      const existing = getSource(input, output);
      if (existing) {
        removeSource(output, input);
        if (editingCell?.input === input && editingCell?.output === output) {
          setEditingCell(null);
        }
      }
    },
    [getSource, removeSource, editingCell],
  );

  // ── Keyboard navigation ───────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { input, output } = focusedCell;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCell((c) => ({ ...c, output: Math.max(0, c.output - 1) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedCell((c) => ({ ...c, output: Math.min(outputChannels - 1, c.output + 1) }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCell((c) => ({ ...c, input: Math.max(0, c.input - 1) }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCell((c) => ({ ...c, input: Math.min(inputChannels - 1, c.input + 1) }));
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          toggleCrosspoint(input, output);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          { const s = getSource(input, output);
            if (s) updateSource(output, input, { inverted: !s.inverted }); }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          { const s = getSource(input, output);
            if (s) updateSource(output, input, { mute: !s.mute }); }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          { const s = getSource(input, output);
            if (s) removeSource(output, input); }
          break;
        case 'Escape':
          e.preventDefault();
          setEditingCell(null);
          break;
      }
    },
    [focusedCell, inputChannels, outputChannels, toggleCrosspoint, getSource, updateSource, removeSource],
  );

  // Focus tracking
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cellId = `cell-${focusedCell.input}-${focusedCell.output}`;
    const cell = grid.querySelector<HTMLElement>(`[data-cell-id="${cellId}"]`);
    cell?.focus();
  }, [focusedCell]);

  // Close popover on outside click
  useEffect(() => {
    if (!editingCell) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target)) return;
      // Don't close if clicking a cell (handleCellClick manages that)
      if (target.closest('[data-cell-id]')) return;
      setEditingCell(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingCell]);

  // ── Inline popover for editing a crosspoint ───────────────────────

  const editingSource = editingCell ? getSource(editingCell.input, editingCell.output) : undefined;

  // ── Popover positioning (viewport-clamped, fixed) ─────────────
  const [popoverStyle, setPopoverStyle] = useState<{
    position: 'fixed';
    top: number;
    left: number;
    zIndex: number;
  } | null>(null);

  const computePopoverPos = useCallback((): typeof popoverStyle => {
    if (!editingCell) return null;
    const cellEl = gridRef.current?.querySelector<HTMLElement>(
      `[data-cell-id="cell-${editingCell.input}-${editingCell.output}"]`,
    );
    if (!cellEl) return null;
    const rect = cellEl.getBoundingClientRect();
    const scrollRect = scrollRef.current?.getBoundingClientRect();
    if (scrollRect && (rect.bottom < scrollRect.top || rect.top > scrollRect.bottom)) return null;
    const popW = 224;
    const popH = 200;
    const gap = 4;
    let top = rect.bottom + gap;
    let left = rect.left;
    if (top + popH > window.innerHeight - 8) top = rect.top - popH - gap;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    return { position: 'fixed' as const, top, left, zIndex: 50 };
  }, [editingCell]);

  useLayoutEffect(() => {
    setPopoverStyle(editingSource ? computePopoverPos() : null);
  }, [editingCell, editingSource, computePopoverPos]);

  useEffect(() => {
    if (!editingCell || !editingSource) return;
    const update = () => setPopoverStyle(computePopoverPos());
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scrollEl?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editingCell, editingSource, computePopoverPos]);

  const renderPopover = () => {
    if (!editingCell || !editingSource || !popoverStyle) return null;
    const { input, output } = editingCell;

    return (
      <div
        ref={popoverRef}
        className="w-56 rounded-lg border border-dsp-primary/40 bg-dsp-surface shadow-xl shadow-black/40"
        style={popoverStyle}
      >
        <div className="border-b border-dsp-primary/20 px-3 py-2">
          <div className="text-[10px] font-medium text-dsp-text-muted">
            {getInputLabel(input)} → {getOutputLabel(output)}
          </div>
        </div>
        <div className="space-y-3 p-3">
          {/* Gain slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-dsp-text-muted">Gain</span>
              <span className="font-mono text-xs tabular-nums text-dsp-text">
                {formatGainCompact(editingSource.gain)} dB
              </span>
            </div>
            <Slider
              value={[editingSource.gain]}
              onValueChange={([gain]) => {
                updateSource(output, input, { gain }, { debounce: true });
              }}
              min={-40}
              max={12}
              step={0.5}
              aria-label="Gain"
            />
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-1.5">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors',
                editingSource.inverted
                  ? 'border-meter-red/50 bg-meter-red/15 text-meter-red'
                  : 'border-dsp-primary/30 bg-dsp-primary/10 text-dsp-text-muted hover:bg-dsp-primary/20',
              )}
              onClick={() => updateSource(output, input, { inverted: !editingSource.inverted })}
              title="Toggle phase inversion"
            >
              {editingSource.inverted ? '180\u00B0' : '0\u00B0'}
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors',
                editingSource.mute
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                  : 'border-dsp-primary/30 bg-dsp-primary/10 text-dsp-text-muted hover:bg-dsp-primary/20',
              )}
              onClick={() => updateSource(output, input, { mute: !editingSource.mute })}
              title="Toggle mute"
            >
              {editingSource.mute ? 'Muted' : 'Mute'}
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-meter-red/30 bg-meter-red/5 px-2 py-1.5 text-[10px] font-semibold text-meter-red/80 transition-colors hover:bg-meter-red/15"
              onClick={() => {
                removeSource(output, input);
                setEditingCell(null);
              }}
              title="Disconnect"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Header context menu (batch ops) ──────────────────────────────

  const [headerMenu, setHeaderMenu] = useState<{
    kind: 'row' | 'col' | 'device';
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerMenu) return;
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current?.contains(e.target as HTMLElement)) return;
      setHeaderMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [headerMenu]);

  const handleHeaderClick = useCallback(
    (kind: 'row' | 'col' | 'device', index: number, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHeaderMenu({ kind, index, x: rect.right + 4, y: rect.top });
    },
    [],
  );

  const applyHeaderAction = useCallback(
    (action: BatchAction) => {
      if (!headerMenu) return;
      const { kind, index } = headerMenu;
      if (kind === 'row') batchRow(index, action);
      else if (kind === 'col') batchCol(index, action);
      else batchAll(action);
      setHeaderMenu(null);
    },
    [headerMenu, batchRow, batchCol, batchAll],
  );

  // Count stats
  const totalRoutes = routingMap.size;
  const mutedCount = Array.from(routingMap.values()).filter((s) => s.mute).length;

  return (
    <div className={cn("flex flex-col bg-dsp-bg", className)}>
      {/* Header bar */}
      <div className="flex items-center gap-4 border-b border-dsp-primary/15 bg-dsp-surface/50 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
          Routing Matrix
        </span>
        <span className="text-[10px] text-dsp-text-muted">
          Click to connect/edit {'\u00B7'} Right-click to disconnect
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-dsp-accent" />
            <span className="text-dsp-text-muted">Active</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500/60" />
            <span className="text-dsp-text-muted">Muted</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-meter-red text-[9px] font-bold">{'\u00D8'}</span>
            <span className="text-dsp-text-muted">Inverted</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-dsp-primary/30" />
            <span className="text-dsp-text-muted">Empty</span>
          </span>
        </div>
      </div>

      {/* Matrix grid */}
      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-auto p-4">
        {inputChannels === 0 || outputChannels === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-dsp-text-muted">
            No channels available for routing matrix.
          </div>
        ) : (
          <div
            ref={gridRef}
            className="inline-block"
            role="grid"
            aria-label="Audio routing matrix"
            onKeyDown={handleKeyDown}
          >
            <table className="border-collapse">
              <thead>
                <tr>
                  {/* Corner cell — device label, clickable for batch all */}
                  <th className="sticky left-0 top-0 z-20 bg-dsp-bg p-0">
                    <button
                      type="button"
                      className="flex h-20 w-28 flex-col items-center justify-end border-b border-r border-dsp-primary/30 p-2 transition-colors hover:bg-dsp-primary/10"
                      onClick={(e) => handleHeaderClick('device', 0, e)}
                      title={`${inputDeviceTitle} → ${outputDeviceTitle} — Click for batch actions`}
                    >
                      <span className="text-[8px] font-medium text-dsp-text-muted">{inputDeviceTitle}</span>
                      <span className="text-[8px] text-dsp-text-muted">↓</span>
                      <span className="text-[8px] font-medium text-dsp-text-muted">{outputDeviceTitle} →</span>
                    </button>
                  </th>

                  {/* Output column headers */}
                  {Array.from({ length: outputChannels }).map((_, colIdx) => {
                    const color = outputColors[colIdx] ?? '#22d3ee';
                    const isHighlighted = hoveredCell?.output === colIdx;
                    return (
                      <th
                        key={colIdx}
                        className="sticky top-0 z-10 bg-dsp-bg p-0"
                      >
                        <button
                          type="button"
                          className={cn(
                            'flex h-20 w-14 flex-col items-center justify-end border-b border-r border-dsp-primary/20 pb-2 transition-colors',
                            isHighlighted ? 'bg-dsp-accent/8' : 'hover:bg-dsp-primary/10',
                          )}
                          onClick={(e) => handleHeaderClick('col', colIdx, e)}
                          title={`${getOutputLabel(colIdx)} — Click for batch actions`}
                        >
                          <div
                            className="mb-1 h-1.5 w-6 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className={cn(
                              'max-w-12 truncate text-[9px] font-medium',
                              isHighlighted ? 'text-dsp-accent' : 'text-dsp-text',
                            )}
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            title={getOutputLabel(colIdx)}
                          >
                            {getOutputLabel(colIdx)}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: inputChannels }).map((_, rowIdx) => {
                  const color = inputColors[rowIdx] ?? '#22d3ee';
                  const isRowHighlighted = hoveredCell?.input === rowIdx;

                  return (
                    <tr key={rowIdx}>
                      {/* Input row header */}
                      <td className="sticky left-0 z-10 bg-dsp-bg p-0">
                        <button
                          type="button"
                          className={cn(
                            'flex h-14 w-28 items-center gap-2 border-b border-r border-dsp-primary/20 px-2 transition-colors',
                            isRowHighlighted ? 'bg-dsp-accent/8' : 'hover:bg-dsp-primary/10',
                          )}
                          onClick={(e) => handleHeaderClick('row', rowIdx, e)}
                          title={`${getInputLabel(rowIdx)} — Click for batch actions`}
                        >
                          <div
                            className="h-6 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className={cn(
                              'truncate text-[10px] font-medium',
                              isRowHighlighted ? 'text-dsp-accent' : 'text-dsp-text',
                            )}
                            title={getInputLabel(rowIdx)}
                          >
                            {getInputLabel(rowIdx)}
                          </span>
                        </button>
                      </td>

                      {/* Crosspoint cells */}
                      {Array.from({ length: outputChannels }).map((_, colIdx) => {
                        const source = getSource(rowIdx, colIdx);
                        const isHovered =
                          hoveredCell?.input === rowIdx && hoveredCell?.output === colIdx;
                        const isEditing =
                          editingCell?.input === rowIdx && editingCell?.output === colIdx;
                        const isFocused =
                          focusedCell.input === rowIdx && focusedCell.output === colIdx;
                        const cellColor = inputColors[rowIdx] ?? '#22d3ee';

                        return (
                          <td key={colIdx} className="relative p-0">
                            <button
                              type="button"
                              data-cell-id={`cell-${rowIdx}-${colIdx}`}
                              className={cn(
                                'flex h-14 w-14 flex-col items-center justify-center border-b border-r border-dsp-primary/20 transition-colors focus:outline-none',
                                // Connection state background
                                source
                                  ? source.mute
                                    ? 'bg-amber-500/5'
                                    : 'bg-dsp-accent/8'
                                  : 'bg-transparent',
                                // Direct hover
                                isHovered && 'bg-dsp-accent/25',
                                // Editing ring
                                isEditing && 'ring-2 ring-inset ring-dsp-accent/60',
                                // Focus ring
                                isFocused && !isEditing && 'ring-1 ring-inset ring-dsp-accent/30',
                              )}
                              role="gridcell"
                              tabIndex={isFocused ? 0 : -1}
                              aria-label={`${getInputLabel(rowIdx)} to ${getOutputLabel(colIdx)}${
                                source
                                  ? `: ${formatGainCompact(source.gain)} dB${source.inverted ? ', phase inverted' : ''}${source.mute ? ', muted' : ''}`
                                  : ', not connected'
                              }`}
                              aria-selected={isEditing}
                              onClick={() => handleCellClick(rowIdx, colIdx)}
                              onContextMenu={(e) => handleCellRightClick(e, rowIdx, colIdx)}
                              onMouseEnter={() => setHoveredCell({ input: rowIdx, output: colIdx })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {source ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  {/* Gain value */}
                                  <span
                                    className={cn(
                                      'font-mono text-[10px] tabular-nums leading-none',
                                      source.mute
                                        ? 'text-dsp-text-muted/50'
                                        : source.gain > 0
                                          ? 'text-meter-green'
                                          : source.gain < 0
                                            ? 'text-dsp-text-muted'
                                            : 'text-dsp-text',
                                    )}
                                  >
                                    {formatGainCompact(source.gain)}
                                  </span>

                                  {/* Status dot */}
                                  <div
                                    className={cn(
                                      'h-2.5 w-2.5 rounded-full',
                                      source.mute ? 'bg-amber-500/40' : '',
                                    )}
                                    style={source.mute ? undefined : { backgroundColor: cellColor }}
                                  />

                                  {/* Phase + mute indicators */}
                                  <div className="flex items-center gap-0.5">
                                    {source.inverted && (
                                      <span className="text-[8px] font-bold leading-none text-meter-red">
                                        {'\u00D8'}
                                      </span>
                                    )}
                                    {source.mute && (
                                      <span className="text-[8px] font-bold leading-none text-amber-400">
                                        M
                                      </span>
                                    )}
                                    {!source.inverted && !source.mute && (
                                      <span className="text-[8px] leading-none text-transparent">
                                        {'\u00B7'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                isHovered && (
                                  <div className="h-2 w-2 rounded-full border border-dsp-primary/40" />
                                )
                              )}
                            </button>

                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Header batch menu */}
        {headerMenu && (
          <div
            ref={headerMenuRef}
            className="fixed z-50 w-44 rounded-lg border border-dsp-primary/40 bg-dsp-surface shadow-xl shadow-black/40"
            style={{ left: headerMenu.x, top: headerMenu.y }}
          >
            <div className="border-b border-dsp-primary/20 px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-dsp-text-muted">
                {headerMenu.kind === 'row'
                  ? getInputLabel(headerMenu.index)
                  : headerMenu.kind === 'col'
                    ? getOutputLabel(headerMenu.index)
                    : 'All Channels'}
              </span>
            </div>
            <div className="p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-dsp-text transition-colors hover:bg-dsp-primary/15"
                onClick={() => applyHeaderAction('gain')}
              >
                <span className="w-4 text-center text-dsp-accent">G</span>
                Set gain to 0 dB
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-dsp-text transition-colors hover:bg-dsp-primary/15"
                onClick={() => applyHeaderAction('phase')}
              >
                <span className="w-4 text-center text-meter-red">{'\u00D8'}</span>
                Toggle phase
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-dsp-text transition-colors hover:bg-dsp-primary/15"
                onClick={() => applyHeaderAction('mute')}
              >
                <span className="w-4 text-center text-amber-400">M</span>
                Toggle mute
              </button>
              <div className="my-1 border-t border-dsp-primary/20" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-meter-red transition-colors hover:bg-meter-red/10"
                onClick={() => applyHeaderAction('disconnect')}
              >
                <span className="w-4 text-center">{'\u00D7'}</span>
                Disconnect all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-dsp-primary/15 bg-dsp-surface/50 px-4 py-1.5">
        <span className="text-[10px] text-dsp-text-muted">
          {inputChannels} in {'\u00D7'} {outputChannels} out = {inputChannels * outputChannels} crosspoints
        </span>
        <div className="flex items-center gap-4 text-[10px] text-dsp-text-muted">
          <span>
            {totalRoutes} active{mutedCount > 0 ? ` (${mutedCount} muted)` : ''}
          </span>
          <span>
            Arrow keys to navigate {'\u00B7'} Space to toggle {'\u00B7'} I phase {'\u00B7'} M mute {'\u00B7'} Del remove
          </span>
        </div>
      </div>

      {/* Crosspoint editor popover */}
      {renderPopover()}
    </div>
  );
}
