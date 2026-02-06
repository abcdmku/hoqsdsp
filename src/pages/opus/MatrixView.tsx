import { useCallback, useMemo, useState } from 'react';
import type { RouteEdge } from '../../lib/signalflow';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { cn } from '../../lib/utils';
import type { OpusDesignProps } from './types';

/**
 * Design 3: Matrix Crosspoint View
 *
 * Inspired by professional audio routing matrices (Dante Controller,
 * BSS Soundweb, Biamp Tesira). Inputs as column headers, outputs as
 * row headers. Crosspoints show route state with gain values.
 * Click to toggle, right-click for gain adjustment.
 */

function formatGainShort(gain: number): string {
  if (Math.abs(gain) < 0.05) return '0';
  return `${gain > 0 ? '+' : ''}${gain.toFixed(1)}`;
}

interface CrosspointInfo {
  routeIndex: number;
  route: RouteEdge;
}

export function MatrixView({ state }: OpusDesignProps) {
  const { model, selection } = state;
  const [hoveredCell, setHoveredCell] = useState<{ input: number; output: number } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // Build crosspoint lookup: [inputIdx][outputIdx] -> route info
  const crosspoints = useMemo(() => {
    const map = new Map<string, CrosspointInfo>();
    model.routes.forEach((route, index) => {
      const inIdx = model.inputs.findIndex(
        (ch) => ch.deviceId === route.from.deviceId && ch.channelIndex === route.from.channelIndex,
      );
      const outIdx = model.outputs.findIndex(
        (ch) => ch.deviceId === route.to.deviceId && ch.channelIndex === route.to.channelIndex,
      );
      if (inIdx >= 0 && outIdx >= 0) {
        map.set(`${inIdx}:${outIdx}`, { routeIndex: index, route });
      }
    });
    return map;
  }, [model.routes, model.inputs, model.outputs]);

  const handleCrosspointClick = useCallback(
    (inputIdx: number, outputIdx: number) => {
      const key = `${inputIdx}:${outputIdx}`;
      const existing = crosspoints.get(key);
      if (existing) {
        // Select the route
        selection.setSelectedRouteIndex(existing.routeIndex);
      } else {
        // Create new route
        const input = model.inputs[inputIdx];
        const output = model.outputs[outputIdx];
        if (input && output) {
          model.addRoute(
            { deviceId: input.deviceId, channelIndex: input.channelIndex },
            { deviceId: output.deviceId, channelIndex: output.channelIndex },
          );
        }
      }
    },
    [crosspoints, model, selection],
  );

  const handleDeleteRoute = useCallback(
    (e: React.MouseEvent, inputIdx: number, outputIdx: number) => {
      e.preventDefault();
      const key = `${inputIdx}:${outputIdx}`;
      const existing = crosspoints.get(key);
      if (existing) {
        model.deleteRoute(existing.routeIndex);
      }
    },
    [crosspoints, model],
  );

  return (
    <div className="flex h-full flex-col bg-dsp-bg">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-dsp-primary/30 bg-dsp-surface px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-dsp-text-muted">
          Routing Matrix
        </span>
        <span className="text-[10px] text-dsp-text-muted">
          Click to route / Right-click to remove
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-dsp-accent" />
            <span className="text-dsp-text-muted">Active</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-dsp-text-muted/30" />
            <span className="text-dsp-text-muted">Muted</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-dsp-primary/30" />
            <span className="text-dsp-text-muted">Empty</span>
          </span>
        </div>
      </div>

      {/* Matrix grid */}
      <div className="flex-1 overflow-auto p-4">
        {model.inputs.length === 0 || model.outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-dsp-text-muted">
            No channels available for matrix view.
          </div>
        ) : (
          <div className="inline-block">
            <table className="border-collapse">
              <thead>
                <tr>
                  {/* Corner cell */}
                  <th className="sticky left-0 top-0 z-20 bg-dsp-bg p-0">
                    <div className="flex h-20 w-32 items-end justify-end border-b border-r border-dsp-primary/30 p-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-dsp-accent">
                        In →
                      </span>
                    </div>
                  </th>
                  {/* Input column headers */}
                  {model.inputs.map((input, colIdx) => {
                    const key = portKey('input', { deviceId: input.deviceId, channelIndex: input.channelIndex });
                    const color = model.channelColors[key] ?? '#22d3ee';
                    return (
                      <th
                        key={key}
                        className="sticky top-0 z-10 bg-dsp-bg p-0"
                        onMouseEnter={() => setHoveredCol(colIdx)}
                        onMouseLeave={() => setHoveredCol(null)}
                      >
                        <div
                          className={cn(
                            'flex h-20 w-14 flex-col items-center justify-end border-b border-r border-dsp-primary/20 pb-2',
                            hoveredCol === colIdx && 'bg-dsp-primary/20',
                          )}
                        >
                          <div className="h-1.5 w-6 rounded-full mb-1" style={{ backgroundColor: color }} />
                          <span
                            className="max-w-12 truncate text-[9px] font-medium text-dsp-text"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            title={input.label}
                          >
                            {input.label}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {model.outputs.map((output, rowIdx) => {
                  const outKey = portKey('output', { deviceId: output.deviceId, channelIndex: output.channelIndex });
                  const outColor = model.channelColors[outKey] ?? '#22d3ee';
                  return (
                    <tr key={outKey}>
                      {/* Output row header */}
                      <td
                        className="sticky left-0 z-10 bg-dsp-bg p-0"
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <div
                          className={cn(
                            'flex h-14 w-32 items-center gap-2 border-b border-r border-dsp-primary/20 px-2',
                            hoveredRow === rowIdx && 'bg-dsp-primary/20',
                          )}
                        >
                          <div className="h-6 w-1.5 rounded-full" style={{ backgroundColor: outColor }} />
                          <span
                            className="truncate text-[10px] font-medium text-dsp-text"
                            title={output.label}
                          >
                            {output.label}
                          </span>
                        </div>
                      </td>
                      {/* Crosspoint cells */}
                      {model.inputs.map((input, colIdx) => {
                        const cellKey = `${colIdx}:${rowIdx}`;
                        const cp = crosspoints.get(cellKey);
                        const isHovered =
                          (hoveredCell?.input === colIdx && hoveredCell?.output === rowIdx) ||
                          hoveredRow === rowIdx ||
                          hoveredCol === colIdx;
                        const isSelected = cp ? selection.selectedRouteIndex === cp.routeIndex : false;
                        const inKey = portKey('input', { deviceId: input.deviceId, channelIndex: input.channelIndex });
                        const routeColor = model.channelColors[inKey] ?? '#22d3ee';

                        return (
                          <td key={cellKey} className="p-0">
                            <button
                              type="button"
                              className={cn(
                                'flex h-14 w-14 items-center justify-center border-b border-r border-dsp-primary/20 transition-colors',
                                cp
                                  ? cp.route.mute
                                    ? 'bg-dsp-text-muted/5'
                                    : 'bg-dsp-accent/8'
                                  : 'bg-transparent',
                                isHovered && !cp && 'bg-dsp-primary/15',
                                isHovered && cp && !cp.route.mute && 'bg-dsp-accent/15',
                                isSelected && 'ring-1 ring-inset ring-dsp-accent/60',
                              )}
                              onClick={() => handleCrosspointClick(colIdx, rowIdx)}
                              onContextMenu={(e) => handleDeleteRoute(e, colIdx, rowIdx)}
                              onMouseEnter={() => setHoveredCell({ input: colIdx, output: rowIdx })}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={
                                cp
                                  ? `${input.label} → ${output.label}: ${formatGainShort(cp.route.gain)} dB${cp.route.mute ? ' (muted)' : ''}`
                                  : `Click to route ${input.label} → ${output.label}`
                              }
                            >
                              {cp ? (
                                <div className="flex flex-col items-center">
                                  <div
                                    className={cn(
                                      'h-3 w-3 rounded-full',
                                      cp.route.mute ? 'bg-dsp-text-muted/30' : '',
                                    )}
                                    style={cp.route.mute ? undefined : { backgroundColor: routeColor }}
                                  />
                                  {cp.route.gain !== 0 && (
                                    <span
                                      className={cn(
                                        'mt-0.5 font-mono text-[8px]',
                                        cp.route.gain > 0 ? 'text-meter-green' : 'text-meter-red',
                                      )}
                                    >
                                      {formatGainShort(cp.route.gain)}
                                    </span>
                                  )}
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
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-dsp-primary/30 bg-dsp-surface px-4 py-1.5">
        <span className="text-[10px] text-dsp-text-muted">
          {model.inputs.length} inputs x {model.outputs.length} outputs = {model.inputs.length * model.outputs.length} crosspoints
        </span>
        <span className="text-[10px] text-dsp-text-muted">
          {model.routes.length} active routes ({model.routes.filter((r) => r.mute).length} muted)
        </span>
      </div>
    </div>
  );
}
