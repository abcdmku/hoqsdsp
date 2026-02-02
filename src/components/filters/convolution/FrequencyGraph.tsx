import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../../../lib/utils';
import type { FrequencySeries, HoverInfo } from './types';
import { FrequencyGraphSvg } from './FrequencyGraphSvg';
import { formatFrequency } from '../../../lib/dsp';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface FrequencyGraphProps {
  series: FrequencySeries[];
  minFreq: number;
  maxFreq: number;
  yMin: number;
  yMax: number;
  yGridLines: number[];
  yFormatter: (value: number) => string;
  hoverValueFormatter?: (value: number) => string;
  ariaLabel: string;
  onHoverChange?: (info: HoverInfo | null) => void;
  className?: string;
}
export function FrequencyGraph({
  series,
  minFreq,
  maxFreq,
  yMin,
  yMax,
  yGridLines,
  yFormatter,
  hoverValueFormatter,
  ariaLabel,
  onHoverChange,
  className,
}: FrequencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 800, height: 480 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width || 800));
      const nextHeight = Math.max(360, Math.min(640, Math.floor(nextWidth * 0.62)));
      setSize((prev) => (prev.width === nextWidth && prev.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => update());
    ro.observe(container);
    return () => ro.disconnect();
  }, []);
  const width = size.width;
  const height = size.height;
  const padding = { left: 55, right: 10, top: 10, bottom: 25 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const freqToX = useCallback(
    (freq: number): number => {
      const safeMin = Math.max(1, minFreq);
      const safeMax = Math.max(safeMin * 1.001, maxFreq);
      const logMin = Math.log10(safeMin);
      const logMax = Math.log10(safeMax);
      const logFreq = Math.log10(Math.max(safeMin, Math.min(safeMax, freq)));
      return padding.left + ((logFreq - logMin) / (logMax - logMin)) * graphWidth;
    },
    [graphWidth, maxFreq, minFreq, padding.left],
  );
  const valueToY = useCallback(
    (value: number): number => {
      const clamped = Math.max(yMin, Math.min(yMax, value));
      return padding.top + ((yMax - clamped) / (yMax - yMin)) * graphHeight;
    },
    [graphHeight, padding.top, yMax, yMin],
  );
  const xToIndex = useCallback(
    (x: number): number => {
      const first = series[0];
      const length = first?.points.length ?? 0;
      if (length <= 1) return 0;
      const clampedX = Math.max(padding.left, Math.min(width - padding.right, x));
      const t = graphWidth > 0 ? (clampedX - padding.left) / graphWidth : 0;
      const index = Math.round(t * (length - 1));
      return Math.max(0, Math.min(length - 1, index));
    },
    [graphWidth, padding.left, padding.right, series, width],
  );
  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const first = series[0];
      if (!first || first.points.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const index = xToIndex(x);
      setHoverIndex(index);
      setHoverPos({ x, y });

      const frequency = first.points[index]?.frequency ?? 0;
      const values: Record<string, number> = {};
      for (const s of series) {
        values[s.id] = s.points[index]?.value ?? 0;
      }
      onHoverChange?.({ frequency, values });
    },
    [onHoverChange, series, xToIndex],
  );
  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
    setHoverPos(null);
    onHoverChange?.(null);
  }, [onHoverChange]);
  const makePath = useCallback(
    (points: { frequency: number; value: number }[]): string => {
      const parts: string[] = [];
      let started = false;
      for (const point of points) {
        if (!Number.isFinite(point.value)) {
          started = false;
          continue;
        }
        const x = freqToX(point.frequency);
        const y = valueToY(point.value);
        if (!started) {
          parts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
          started = true;
        } else {
          parts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
        }
      }
      return parts.join(' ');
    },
    [freqToX, valueToY],
  );
  const hoverPoint = hoverIndex !== null ? series[0]?.points[hoverIndex] : null;
  const hoverX = hoverPoint ? freqToX(hoverPoint.frequency) : null;
  const hoverFrequency = hoverPoint ? hoverPoint.frequency : null;

  const tooltip = (() => {
    if (hoverIndex === null || !hoverPos || hoverFrequency === null) return null;

    const rows = series.map((s) => ({
      id: s.id,
      label: s.label,
      colorClass: s.colorClass,
      value: s.points[hoverIndex]?.value ?? Number.NaN,
    }));

    const tooltipWidth = 260;
    const tooltipHeight = 34 + rows.length * 18;
    const padding = 8;
    const offset = 12;

    let left = hoverPos.x + offset;
    if (left + tooltipWidth > width - padding) left = hoverPos.x - offset - tooltipWidth;
    left = clamp(left, padding, Math.max(padding, width - tooltipWidth - padding));

    let top = hoverPos.y + offset;
    if (top + tooltipHeight > height - padding) top = hoverPos.y - offset - tooltipHeight;
    top = clamp(top, padding, Math.max(padding, height - tooltipHeight - padding));

    return (
      <div
        className={cn(
          'pointer-events-none absolute z-10 rounded-md border border-dsp-primary/30',
          'bg-dsp-bg/95 px-3 py-2 text-xs shadow-md backdrop-blur',
        )}
        style={{ left, top, width: tooltipWidth }}
        aria-hidden="true"
      >
        <div className="mb-1 text-[11px] text-dsp-text-muted">@ {formatFrequency(hoverFrequency)}</div>
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn('h-2 w-2 flex-shrink-0 rounded-full bg-current', row.colorClass)} aria-hidden="true" />
                <span className="truncate text-dsp-text">{row.label}</span>
              </span>
              <span className="font-mono tabular-nums text-dsp-text">
                {hoverValueFormatter ? hoverValueFormatter(row.value) : Number.isFinite(row.value) ? row.value.toFixed(2) : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  })();
  return (
    <div ref={containerRef} className={cn('relative w-full', className)} style={{ height: size.height }}>
      <FrequencyGraphSvg
        width={width}
        height={height}
        padding={padding}
        minFreq={minFreq}
        maxFreq={maxFreq}
        yGridLines={yGridLines}
        yFormatter={yFormatter}
        series={series}
        freqToX={freqToX}
        valueToY={valueToY}
        makePath={makePath}
        hoverX={hoverX}
        hoverIndex={hoverIndex}
        ariaLabel={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
      {tooltip}
    </div>
  );
}
