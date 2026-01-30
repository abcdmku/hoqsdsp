import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { estimateFirLinearPhaseLatencyMs, findFirPeak } from '../../../lib/dsp/firOperations';
import { cn } from '../../../lib/utils';

interface FirImpulseGraphProps {
  taps: number[];
  previewTaps?: number[] | null;
  sampleRate: number;
  className?: string;
}

export function FirImpulseGraph({
  taps,
  previewTaps,
  sampleRate,
  className,
}: FirImpulseGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 800, height: 320 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width || 800));
      const nextHeight = Math.max(240, Math.min(520, Math.floor(nextWidth * 0.45)));
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

  const tapCount = taps.length;
  const center = Math.floor((tapCount - 1) / 2);
  const latencyMs = estimateFirLinearPhaseLatencyMs(tapCount, sampleRate);
  const peak = tapCount > 0 ? findFirPeak(taps).peak : 0;
  const scale = peak > 0 ? 1 / peak : 1;

  const indexToX = useCallback(
    (i: number): number => {
      if (tapCount <= 1) return padding.left;
      const timeMs = ((i - center) / sampleRate) * 1000;
      const t = latencyMs > 0 ? (timeMs + latencyMs) / (2 * latencyMs) : i / (tapCount - 1);
      return padding.left + t * graphWidth;
    },
    [center, graphWidth, latencyMs, padding.left, sampleRate, tapCount],
  );

  const ampToY = useCallback(
    (amp: number): number => {
      const clamped = Math.max(-1, Math.min(1, amp));
      return padding.top + ((1 - clamped) / 2) * graphHeight;
    },
    [graphHeight, padding.top],
  );

  const makePath = useCallback(
    (values: number[]): string => {
      if (values.length === 0) return '';
      const step = Math.max(1, Math.ceil(values.length / Math.max(1, Math.floor(graphWidth))));
      let d = '';
      for (let i = 0; i < values.length; i += step) {
        const x = indexToX(i);
        const y = ampToY((values[i] ?? 0) * scale);
        d += `${d ? ' L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    },
    [ampToY, graphWidth, indexToX, scale],
  );

  const pathD = useMemo(() => {
    if (taps.length === 0) return '';
    return makePath(taps);
  }, [makePath, taps]);

  const previewPathD = useMemo(() => {
    if (!previewTaps || previewTaps.length === 0) return null;
    return makePath(previewTaps);
  }, [makePath, previewTaps]);

  const zeroY = ampToY(0);
  const centerX = tapCount > 0 ? indexToX(center) : null;

  return (
    <div ref={containerRef} className={cn('w-full', className)} style={{ height: size.height }}>
      <svg
        width={width}
        height={height}
        className="block w-full h-full bg-dsp-bg rounded"
        role="img"
        aria-label="FIR impulse response"
      >
        {centerX !== null && (
          <line
            x1={centerX}
            y1={padding.top}
            x2={centerX}
            y2={height - padding.bottom}
            stroke="currentColor"
            className="text-dsp-primary/40"
            strokeWidth={1}
          />
        )}

        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="currentColor"
          className="text-dsp-text/50"
          strokeWidth={1}
        />

        {tapCount > 0 && (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            className="text-filter-fir"
            strokeWidth={1.25}
          />
        )}

        {previewPathD && (
          <path
            d={previewPathD}
            fill="none"
            stroke="currentColor"
            className="text-dsp-accent"
            strokeWidth={1.25}
            strokeDasharray="4 2"
          />
        )}

        {tapCount > 0 && latencyMs > 0 && (
          <>
            <text x={padding.left} y={height - 5} textAnchor="start" className="fill-dsp-text-muted text-[11px]">
              -{latencyMs.toFixed(1)} ms
            </text>
            <text x={width - padding.right} y={height - 5} textAnchor="end" className="fill-dsp-text-muted text-[11px]">
              +{latencyMs.toFixed(1)} ms
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
