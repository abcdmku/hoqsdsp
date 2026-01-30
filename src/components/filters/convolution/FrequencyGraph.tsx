import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../../../lib/utils';
import type { FrequencySeries, HoverInfo } from './types';
import { FrequencyGraphSvg } from './FrequencyGraphSvg';
interface FrequencyGraphProps {
  series: FrequencySeries[];
  minFreq: number;
  maxFreq: number;
  yMin: number;
  yMax: number;
  yGridLines: number[];
  yFormatter: (value: number) => string;
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
  ariaLabel,
  onHoverChange,
  className,
}: FrequencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 800, height: 480 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
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
      const index = xToIndex(x);
      setHoverIndex(index);

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
  return (
    <div ref={containerRef} className={cn('w-full', className)} style={{ height: size.height }}>
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
        ariaLabel={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}
