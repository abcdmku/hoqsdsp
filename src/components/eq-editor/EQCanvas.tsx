import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { calculateCompositeResponse, formatFrequency, formatGain } from '../../lib/dsp';
import type { BiquadParameters } from '../../types';
import {
  type EQBand,
  type CanvasDimensions,
  FREQUENCY_MARKERS,
  GAIN_MARKERS,
  MIN_FREQUENCY,
  MAX_FREQUENCY,
  MIN_GAIN,
  MAX_GAIN,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  getBandColor,
  hasGain,
} from './types';
import { EQNode } from './EQNode';

export interface EQCanvasProps {
  bands: EQBand[];
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

export function EQCanvas({
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
}: EQCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setIsDragging] = useState(false);
  const isPlacingRef = useRef(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const onBackgroundPointerMoveRef = useRef<EQCanvasProps['onBackgroundPointerMove']>(onBackgroundPointerMove);
  const onBackgroundPointerUpRef = useRef<EQCanvasProps['onBackgroundPointerUp']>(onBackgroundPointerUp);
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

  // Generate frequency response curve points
  const responseData = useMemo(() => {
    const enabledBands = bands
      .filter((b) => b.enabled)
      .map((b) => b.parameters);

    const response = calculateCompositeResponse(enabledBands, sampleRate);
    const points = response.map(({ frequency, magnitude }) => {
      const x = freqToX(frequency, dimensions);
      const y = gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions);
      return { x, y, frequency, gain: magnitude };
    });

    return {
      path: `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')}`,
      points,
    };
  }, [bands, sampleRate, dimensions]);

  // Generate individual band curves for visualization
  const bandCurves = useMemo(() => {
    return bands.map((band, index) => {
      if (!band.enabled) return null;

      const response = calculateCompositeResponse([band.parameters], sampleRate);
      const points = response.map(({ frequency, magnitude }) => {
        const x = freqToX(frequency, dimensions);
        const y = gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions);
        return `${x},${y}`;
      });

      return {
        index,
        path: `M ${points.join(' L ')}`,
        color: getBandColor(index),
      };
    }).filter(Boolean);
  }, [bands, sampleRate, dimensions]);

  const findClosestPoint = useCallback(
    (svgX: number, svgY: number) => {
      let closest: { x: number; y: number; frequency: number; gain: number } | null = null;
      let minDist = Number.POSITIVE_INFINITY;
      for (const point of responseData.points) {
        const dx = point.x - svgX;
        const dy = point.y - svgY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          closest = point;
        }
      }
      return { closest, minDist };
    },
    [responseData.points],
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

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    const isNode = target?.closest?.('.eq-node');
    if (isNode) return;
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const inPlot = svgX >= marginLeft
      && svgX <= width - marginRight
      && svgY >= marginTop
      && svgY <= height - marginBottom;

    if (!readOnly && (onBackgroundPointerDown || onBackgroundClick) && inPlot) {
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

    onSelectBand(null);
  }, [
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
  ]);

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
      readOnly,
      findClosestPoint,
      width,
    ],
  );


  // Handle band frequency/gain drag
  const handleBandDrag = useCallback((index: number, freq: number, gain: number) => {
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
  }, [bands, onBandChange]);

  // Handle Q change via scroll
  const handleQChange = useCallback((index: number, deltaQ: number) => {
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
  }, [bands, onBandChange]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={cn('bg-dsp-surface rounded-lg', className)}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMove}
      onMouseLeave={() => { setHoverPoint(null); }}
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

      {/* Individual band response curves (faded) */}
      {selectedBandIndex === null && bandCurves.map((curve) => {
        if (!curve) return null;
        return (
          <path
            key={`band-curve-idle-${curve.index}`}
            d={curve.path}
            fill="none"
            stroke={curve.color}
            strokeWidth="1"
            opacity="0.12"
          />
        );
      })}
      {selectedBandIndex !== null && bandCurves.map((curve) => {
        if (!curve || curve.index === selectedBandIndex) return null;
        return (
          <path
            key={`band-curve-${curve.index}`}
            d={curve.path}
            fill="none"
            stroke={curve.color}
            strokeWidth="1"
            opacity="0.3"
          />
        );
      })}

      {/* Selected band response curve (highlighted) */}
      {selectedBandIndex !== null && bandCurves.find((c) => c?.index === selectedBandIndex) && (
        <path
          d={bandCurves.find((c) => c?.index === selectedBandIndex)!.path}
          fill="none"
          stroke={getBandColor(selectedBandIndex)}
          strokeWidth="2"
          opacity="0.6"
        />
      )}

      {/* Composite response curve */}
      <path
        d={responseData.path}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2.5"
        className="drop-shadow-sm"
      />

      {/* Filled area under composite curve */}
      <path
        d={`${responseData.path} L ${width - marginRight},${gainToY(0, dimensions)} L ${marginLeft},${gainToY(0, dimensions)} Z`}
        fill="url(#responseGradient)"
        opacity="0.15"
      />

      {/* Gradient definition for fill */}
      <defs>
        <linearGradient id="responseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

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
          onDragEnd={() => { setIsDragging(false); }}
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
            fill="#0ea5e9"
            opacity={0.7}
          />
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={9}
            fill="none"
            stroke="#22d3ee"
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
