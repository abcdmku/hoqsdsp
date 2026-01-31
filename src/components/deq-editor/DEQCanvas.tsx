import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { calculateCompositeResponse, formatFrequency, formatGain } from '../../lib/dsp';
import type { BiquadParameters } from '../../types';
import {
  type CanvasDimensions,
  FREQUENCY_MARKERS,
  GAIN_MARKERS,
  MIN_GAIN,
  MAX_GAIN,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandColor,
  hasGain,
} from '../eq-editor/types';
import { EQNode } from '../eq-editor/EQNode';
import type { DeqBand } from './types';
import { applyDynamicsExtreme } from './types';

export interface DeqCanvasProps {
  bands: DeqBand[];
  sampleRate: number;
  selectedBandIndex: number | null;
  onSelectBand: (index: number | null) => void;
  onBandChange: (index: number, updates: Partial<BiquadParameters>) => void;
  onBackgroundClick?: (freq: number, gain: number) => void;
  onBackgroundPointerDown?: (freq: number, gain: number) => void;
  onBackgroundPointerMove?: (freq: number, gain: number) => void;
  onBackgroundPointerUp?: () => void;
  dimensions: CanvasDimensions;
  readOnly?: boolean;
  className?: string;
}

interface CurvePoints {
  x: number;
  y: number;
  frequency: number;
  gain: number;
}

function buildLinePath(points: CurvePoints[]): string {
  if (points.length === 0) return '';
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
}

function buildAreaToBaseline(points: CurvePoints[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `M ${first.x},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${last.x},${baselineY} Z`;
}

function buildAreaBetween(a: CurvePoints[], b: CurvePoints[]): string {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return '';
  const forward = a.map((p) => `${p.x},${p.y}`).join(' L ');
  const back = [...b].reverse().map((p) => `${p.x},${p.y}`).join(' L ');
  return `M ${a[0]!.x},${a[0]!.y} L ${forward} L ${back} Z`;
}

export function DEQCanvas({
  bands,
  sampleRate,
  selectedBandIndex,
  onSelectBand,
  onBandChange,
  onBackgroundClick,
  onBackgroundPointerDown,
  onBackgroundPointerMove,
  onBackgroundPointerUp,
  dimensions,
  readOnly = false,
  className,
}: DeqCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isPlacingRef = useRef(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const onBackgroundPointerMoveRef = useRef<DeqCanvasProps['onBackgroundPointerMove']>(onBackgroundPointerMove);
  const onBackgroundPointerUpRef = useRef<DeqCanvasProps['onBackgroundPointerUp']>(onBackgroundPointerUp);
  useEffect(() => {
    onBackgroundPointerMoveRef.current = onBackgroundPointerMove;
  }, [onBackgroundPointerMove]);
  useEffect(() => {
    onBackgroundPointerUpRef.current = onBackgroundPointerUp;
  }, [onBackgroundPointerUp]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; frequency: number; gain: number } | null>(
    null,
  );

  const { width, height, marginLeft, marginRight, marginTop, marginBottom } = dimensions;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const baselineY = gainToY(0, dimensions);
  const showBandDetails = selectedBandIndex !== null;

  const enabledBands = useMemo(() => bands.filter((b) => b.enabled), [bands]);

  const overallCurves = useMemo(() => {
    const staticFilters = enabledBands.map((b) => b.parameters);
    const dynamicFilters = enabledBands.map((b) => applyDynamicsExtreme(b.parameters, b.dynamics));

    const toPoints = (response: { frequency: number; magnitude: number }[]): CurvePoints[] =>
      response.map(({ frequency, magnitude }) => ({
        x: freqToX(frequency, dimensions),
        y: gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions),
        frequency,
        gain: magnitude,
      }));

    const staticResponse = staticFilters.length === 0
      ? null
      : calculateCompositeResponse(staticFilters, sampleRate);
    const dynamicResponse = dynamicFilters.length === 0
      ? null
      : calculateCompositeResponse(dynamicFilters, sampleRate);

    const staticPoints = staticResponse ? toPoints(staticResponse) : [];
    const dynamicPoints = dynamicResponse ? toPoints(dynamicResponse) : [];

    return {
      staticPoints,
      dynamicPoints,
      staticPath: buildLinePath(staticPoints),
      dynamicPath: buildLinePath(dynamicPoints),
      dynamicArea: buildAreaBetween(staticPoints, dynamicPoints),
    };
  }, [dimensions, enabledBands, sampleRate]);

  const bandCurves = useMemo(() => {
    return bands.map((band, index) => {
      if (!band.enabled) return null;

      const staticResponse = calculateCompositeResponse([band.parameters], sampleRate);
      const dynamicParams = applyDynamicsExtreme(band.parameters, band.dynamics);
      const dynamicResponse = calculateCompositeResponse([dynamicParams], sampleRate);

      const toPoints = (response: { frequency: number; magnitude: number }[]): CurvePoints[] =>
        response.map(({ frequency, magnitude }) => ({
          x: freqToX(frequency, dimensions),
          y: gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions),
        }));

      const staticPoints = toPoints(staticResponse);
      const dynamicPoints = toPoints(dynamicResponse);

      return {
        index,
        color: getBandColor(index),
        staticPoints,
        dynamicPoints,
        staticPath: buildLinePath(staticPoints),
        bandFill: buildAreaToBaseline(staticPoints, baselineY),
        dynamicArea: buildAreaBetween(staticPoints, dynamicPoints),
        hasDynamic: band.dynamics.enabled && hasGain(band.parameters.type) && 'gain' in band.parameters,
      };
    }).filter(Boolean);
  }, [bands, baselineY, dimensions, sampleRate]);

  const findClosestPoint = useCallback(
    (svgX: number, svgY: number) => {
      let closest: { x: number; y: number; frequency: number; gain: number } | null = null;
      let minDist = Number.POSITIVE_INFINITY;
      for (const point of overallCurves.staticPoints) {
        const dx = point.x - svgX;
        const dy = point.y - svgY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closest = point as typeof closest;
        }
      }
      return { closest, minDist };
    },
    [overallCurves.staticPoints],
  );

  const getPointerFreqGain = useCallback(
    (svgX: number, svgY: number) => {
      const clampedX = Math.max(marginLeft, Math.min(width - marginRight, svgX));
      const clampedY = Math.max(marginTop, Math.min(height - marginBottom, svgY));
      const freq = Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, xToFreq(clampedX, dimensions)));
      const gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, yToGain(clampedY, dimensions)));
      return { freq, gain };
    },
    [dimensions, height, marginBottom, marginLeft, marginRight, marginTop, width],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      const isNode = target?.closest?.('.eq-node');
      if (isNode) return;
      e.preventDefault();
      if (!readOnly && (onBackgroundPointerDown || onBackgroundClick)) {
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const svgX = e.clientX - rect.left;
          const svgY = e.clientY - rect.top;
          const inPlot = svgX >= marginLeft
            && svgX <= width - marginRight
            && svgY >= marginTop
            && svgY <= height - marginBottom;
          if (inPlot) {
            const threshold = 14;
            const { closest, minDist } = findClosestPoint(svgX, svgY);
            const candidate = hoverPoint ?? closest;
            const distance = hoverPoint ? 0 : minDist;
            if (candidate && distance <= threshold * threshold) {
              const { freq, gain } = getPointerFreqGain(svgX, svgY);
                if (onBackgroundPointerDown) {
                  onBackgroundPointerDown(freq, gain);
                } else {
                  onBackgroundClick?.(candidate.frequency, candidate.gain);
                }
                isPlacingRef.current = true;
                setIsPlacing(true);

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  if (!isPlacingRef.current) return;
                  const svgEl = svgRef.current;
                if (!svgEl) return;
                const moveRect = svgEl.getBoundingClientRect();
                const moveX = moveEvent.clientX - moveRect.left;
                const moveY = moveEvent.clientY - moveRect.top;
                const { freq: moveFreq, gain: moveGain } = getPointerFreqGain(moveX, moveY);
                onBackgroundPointerMoveRef.current?.(moveFreq, moveGain);
              };

                const handleMouseUp = () => {
                  if (!isPlacingRef.current) return;
                  isPlacingRef.current = false;
                  setIsPlacing(false);
                  onBackgroundPointerUpRef.current?.();
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };

              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp, { once: true });
              return;
            }
          }
        }
      }
      onSelectBand(null);
    },
    [
      getPointerFreqGain,
      findClosestPoint,
      height,
      hoverPoint,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      onBackgroundClick,
      onBackgroundPointerDown,
      onBackgroundPointerMove,
      onBackgroundPointerUp,
      onSelectBand,
      readOnly,
      width,
    ],
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPlacingRef.current) {
        setHoverPoint(null);
        return;
      }
      if (readOnly || !onBackgroundClick) {
        setHoverPoint(null);
        return;
      }
      const target = e.target as Element | null;
      const isNode = target?.closest?.('.eq-node');
      if (isNode) {
        setHoverPoint(null);
        return;
      }
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;
      const inPlot = svgX >= marginLeft
        && svgX <= width - marginRight
        && svgY >= marginTop
        && svgY <= height - marginBottom;
      if (!inPlot) {
        setHoverPoint(null);
        return;
      }

      const { closest, minDist } = findClosestPoint(svgX, svgY);
      const threshold = 14;
      if (closest && minDist <= threshold * threshold) {
        setHoverPoint(closest);
      } else {
        setHoverPoint(null);
      }
    },
    [
      height,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      onBackgroundClick,
      findClosestPoint,
      readOnly,
      width,
    ],
  );


  const handleBandDrag = useCallback(
    (index: number, freq: number, gain: number) => {
      const band = bands[index];
      if (!band) return;

      const updates: Record<string, unknown> = {};

      if ('freq' in band.parameters) {
        updates.freq = Math.round(freq);
      } else if ('freq_act' in band.parameters) {
        updates.freq_act = Math.round(freq);
      }

      if (hasGain(band.parameters.type) && 'gain' in band.parameters) {
        updates.gain = Math.round(gain * 10) / 10;
      }

      onBandChange(index, updates as Partial<BiquadParameters>);
    },
    [bands, onBandChange],
  );

  const handleQChange = useCallback(
    (index: number, deltaQ: number) => {
      const band = bands[index];
      if (!band) return;

      if ('q' in band.parameters) {
        const currentQ = band.parameters.q;
        const newQ = Math.max(0.1, Math.min(20, currentQ + deltaQ));
        onBandChange(index, { q: Math.round(newQ * 100) / 100 });
      } else if ('slope' in band.parameters) {
        const currentSlope = band.parameters.slope;
        const newSlope = Math.max(0.1, Math.min(2, currentSlope - deltaQ * 0.1));
        onBandChange(index, { slope: Math.round(newSlope * 100) / 100 });
      }
    },
    [bands, onBandChange],
  );

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={cn('bg-dsp-surface rounded-lg', className)}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMove}
      onMouseLeave={() => { setHoverPoint(null); }}
      role="img"
      aria-label="Dynamic EQ frequency response"
    >
      {/* Plot area background */}
      <rect
        x={marginLeft}
        y={marginTop}
        width={plotWidth}
        height={plotHeight}
        className="fill-dsp-bg/50"
      />

      {/* Grid lines - Frequency (vertical) */}
      {FREQUENCY_MARKERS.map((freq) => {
        const x = freqToX(freq, dimensions);
        return (
          <g key={`freq-${freq}`}>
            <line
              x1={x}
              y1={marginTop}
              x2={x}
              y2={height - marginBottom}
              className="stroke-dsp-primary/50"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - marginBottom + 16}
              className="fill-dsp-text-muted text-xs"
              textAnchor="middle"
              style={{ fontSize: '10px' }}
            >
              {formatFrequency(freq)}
            </text>
          </g>
        );
      })}

      {/* Grid lines - Gain (horizontal) */}
      {GAIN_MARKERS.map((gain) => {
        const y = gainToY(gain, dimensions);
        const isZero = gain === 0;
        return (
          <g key={`gain-${gain}`}>
            <line
              x1={marginLeft}
              y1={y}
              x2={width - marginRight}
              y2={y}
              className={isZero ? 'stroke-dsp-text-muted/70' : 'stroke-dsp-primary/50'}
              strokeWidth={isZero ? 2 : 1}
            />
            <text
              x={marginLeft - 8}
              y={y + 4}
              className="fill-dsp-text-muted text-xs"
              textAnchor="end"
              style={{ fontSize: '10px' }}
            >
              {formatGain(gain)}
            </text>
          </g>
        );
      })}

      {/* Band fills */}
      {showBandDetails && bandCurves.map((curve) => {
        if (!curve) return null;
        return (
          <path
            key={`band-fill-${curve.index}`}
            d={curve.bandFill}
            fill={curve.color}
            opacity="0.14"
          />
        );
      })}

      {/* Individual band response curves (faint) */}
      {!showBandDetails && bandCurves.map((curve) => {
        if (!curve) return null;
        return (
          <path
            key={`band-curve-idle-${curve.index}`}
            d={curve.staticPath}
            fill="none"
            stroke={curve.color}
            strokeWidth="1"
            opacity="0.12"
          />
        );
      })}

      {/* Band dynamics overlays */}
      {showBandDetails && bandCurves.map((curve) => {
        if (!curve?.hasDynamic) return null;
        return (
          <path
            key={`band-dyn-${curve.index}`}
            d={curve.dynamicArea}
            fill={curve.color}
            opacity="0.22"
          />
        );
      })}

      {/* Overall dynamics envelope */}
      {overallCurves.dynamicArea && (
        <path
          d={overallCurves.dynamicArea}
          fill="#facc15"
          opacity="0.10"
        />
      )}

      {/* Composite response curve (static) */}
      {overallCurves.staticPath && (
        <path
          d={overallCurves.staticPath}
          fill="none"
          stroke="#facc15"
          strokeWidth="2.5"
          className="drop-shadow-sm"
        />
      )}

      {/* Dynamic response curve (extreme) */}
      {overallCurves.dynamicPath && overallCurves.dynamicPath !== overallCurves.staticPath && (
        <path
          d={overallCurves.dynamicPath}
          fill="none"
          stroke="#facc15"
          strokeWidth="1.5"
          opacity="0.35"
        />
      )}

      {/* Dynamics range arrows per band */}
      {showBandDetails && bands.map((band, index) => {
        if (!band.enabled) return null;
        if (!band.dynamics.enabled) return null;
        if (!hasGain(band.parameters.type) || !('gain' in band.parameters)) return null;
        const range = band.dynamics.rangeDb ?? 0;
        if (!Number.isFinite(range) || range <= 0.01) return null;

        const freq = 'freq' in band.parameters ? band.parameters.freq : 1000;
        const x = freqToX(freq, dimensions);
        const startY = gainToY(band.parameters.gain, dimensions);
        const delta = band.dynamics.mode === 'upward' ? range : -range;
        const endY = gainToY(band.parameters.gain + delta, dimensions);
        const color = getBandColor(index);

        const headSize = 7;
        const dir = endY < startY ? -1 : 1;
        const tipY = endY;
        const baseY = endY + dir * headSize;
        const triangle = `M ${x} ${tipY} L ${x - headSize / 2} ${baseY} L ${x + headSize / 2} ${baseY} Z`;

        return (
          <g key={`dyn-arrow-${band.id}`}>
            <line
              x1={x}
              y1={startY}
              x2={x}
              y2={endY}
              stroke={color}
              strokeWidth={2}
              opacity={0.9}
            />
            <path d={triangle} fill={color} opacity={0.9} />
          </g>
        );
      })}

      {/* EQ Nodes */}
      {bands.map((band, index) => (
        <EQNode
          key={band.id}
          band={band}
          index={index}
          isSelected={selectedBandIndex === index}
          isExternalDragging={isPlacing && selectedBandIndex === index}
          dimensions={dimensions}
          onSelect={() => { onSelectBand(index); }}
          onDrag={(freq, gain) => { handleBandDrag(index, freq, gain); }}
          onDragEnd={() => { /* no-op */ }}
          onQChange={(delta) => { handleQChange(index, delta); }}
          disabled={readOnly}
        />
      ))}

      {hoverPoint && (
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={6}
            fill="#eab308"
            opacity={0.65}
          />
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={9}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            opacity={0.6}
          />
        </g>
      )}

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height - 4}
        className="fill-dsp-text-muted text-xs"
        textAnchor="middle"
        style={{ fontSize: '11px' }}
      >
        Frequency (Hz)
      </text>
      <text
        x={12}
        y={height / 2}
        className="fill-dsp-text-muted text-xs"
        textAnchor="middle"
        transform={`rotate(-90, 12, ${height / 2})`}
        style={{ fontSize: '11px' }}
      >
        Gain (dB)
      </text>
    </svg>
  );
}
