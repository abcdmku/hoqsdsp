import type { PointerEvent as ReactPointerEvent } from 'react';
import { formatFrequency } from '../../../lib/dsp';
import type { FrequencySeries } from './types';

interface FrequencyGraphSvgProps {
  width: number;
  height: number;
  padding: { left: number; right: number; top: number; bottom: number };
  minFreq: number;
  maxFreq: number;
  yGridLines: number[];
  yFormatter: (value: number) => string;
  series: FrequencySeries[];
  freqToX: (freq: number) => number;
  valueToY: (value: number) => number;
  makePath: (points: { frequency: number; value: number }[]) => string;
  hoverX: number | null;
  ariaLabel: string;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerLeave: () => void;
}

export function FrequencyGraphSvg({
  width,
  height,
  padding,
  minFreq,
  maxFreq,
  yGridLines,
  yFormatter,
  series,
  freqToX,
  valueToY,
  makePath,
  hoverX,
  ariaLabel,
  onPointerMove,
  onPointerLeave,
}: FrequencyGraphSvgProps) {
  const freqGridLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(
    (f) => f >= minFreq && f <= maxFreq,
  );
  const labelFrequencies = [100, 1000, 10000].filter((f) => f >= minFreq && f <= maxFreq);

  return (
    <svg
      width={width}
      height={height}
      className="block h-full w-full rounded bg-dsp-bg"
      role="img"
      aria-label={ariaLabel}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {freqGridLines.map((f) => (
        <line
          key={`x-${f}`}
          x1={freqToX(f)}
          y1={padding.top}
          x2={freqToX(f)}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-dsp-text/40"
          strokeWidth={0.5}
        />
      ))}
      {yGridLines.map((y) => (
        <line
          key={`y-${y}`}
          x1={padding.left}
          y1={valueToY(y)}
          x2={width - padding.right}
          y2={valueToY(y)}
          stroke="currentColor"
          className="text-dsp-text/40"
          strokeWidth={y === 0 ? 1 : 0.5}
        />
      ))}
      {labelFrequencies.map((freq) => (
        <text
          key={`label-${freq}`}
          x={freqToX(freq)}
          y={height - 5}
          textAnchor="middle"
          className="fill-dsp-text-muted text-[11px]"
        >
          {formatFrequency(freq)}
        </text>
      ))}
      {yGridLines.map((y) => (
        <text
          key={`y-label-${y}`}
          x={padding.left - 6}
          y={valueToY(y) + 3}
          textAnchor="end"
          className="fill-dsp-text-muted text-[11px]"
        >
          {yFormatter(y)}
        </text>
      ))}
      {series.map((s) => (
        <path
          key={s.id}
          d={makePath(s.points)}
          fill="none"
          stroke="currentColor"
          className={s.colorClass}
          strokeWidth={s.id === 'pipeline' ? 1.25 : 1.75}
          strokeDasharray={s.strokeDasharray}
          opacity={s.colorClass === 'text-dsp-text-muted' ? 0.7 : 1}
        />
      ))}
      {hoverX !== null && (
        <line
          x1={hoverX}
          y1={padding.top}
          x2={hoverX}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-dsp-primary/40"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
    </svg>
  );
}
