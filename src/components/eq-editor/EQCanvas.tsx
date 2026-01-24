import { useMemo, useRef, useCallback, useState } from 'react';
import { cn } from '../../lib/utils';
import { calculateCompositeResponse, formatFrequency, formatGain } from '../../lib/dsp';
import type { BiquadParameters } from '../../types';
import {
  type EQBand,
  type CanvasDimensions,
  FREQUENCY_MARKERS,
  GAIN_MARKERS,
  MIN_GAIN,
  MAX_GAIN,
  freqToX,
  gainToY,
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
  dimensions,
  readOnly = false,
  className,
}: EQCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setIsDragging] = useState(false);

  const { width, height, marginLeft, marginRight, marginTop, marginBottom } = dimensions;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  // Generate frequency response curve points
  const responseCurve = useMemo(() => {
    const enabledBands = bands
      .filter((b) => b.enabled)
      .map((b) => b.parameters);

    if (enabledBands.length === 0) {
      // Return flat line at 0dB
      return `M ${marginLeft} ${gainToY(0, dimensions)} L ${width - marginRight} ${gainToY(0, dimensions)}`;
    }

    const response = calculateCompositeResponse(enabledBands, sampleRate);
    const points = response.map(({ frequency, magnitude }) => {
      const x = freqToX(frequency, dimensions);
      const y = gainToY(Math.max(MIN_GAIN, Math.min(MAX_GAIN, magnitude)), dimensions);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [bands, sampleRate, dimensions, marginLeft, marginRight, width]);

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

  // Handle canvas click for deselection
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      onSelectBand(null);
    }
  }, [onSelectBand]);

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
      onClick={handleCanvasClick}
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
        d={responseCurve}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2.5"
        className="drop-shadow-sm"
      />

      {/* Filled area under composite curve */}
      <path
        d={`${responseCurve} L ${width - marginRight},${gainToY(0, dimensions)} L ${marginLeft},${gainToY(0, dimensions)} Z`}
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
          dimensions={dimensions}
          onSelect={() => { onSelectBand(index); }}
          onDrag={(freq, gain) => { handleBandDrag(index, freq, gain); }}
          onDragEnd={() => { setIsDragging(false); }}
          onQChange={(delta) => { handleQChange(index, delta); }}
          disabled={readOnly}
        />
      ))}

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
