# Agent Context: Interactive EQ Editor

## Overview

Build an interactive parametric EQ editor with a frequency response graph and draggable nodes for direct manipulation.

## Requirements

### Graph Features
- Frequency axis: logarithmic scale from 20Hz to 20kHz
- Gain axis: linear from -24dB to +24dB
- Display composite frequency response curve
- Each band represented as a draggable node on the curve
- Grid lines at standard frequencies (100, 1k, 10k) and gains (-12, 0, +12)

### Filter Type Support
All CamillaDSP biquad types:
- Highpass, Lowpass (with Q)
- HighpassFO, LowpassFO (first-order, no Q)
- Peaking (freq, Q, gain)
- Highshelf, Lowshelf (freq, slope, gain)
- Notch, Bandpass, Allpass (freq, Q)
- BiquadCombo: Butterworth and Linkwitz-Riley up to 8th order

## Interaction Model

| Action | Effect |
|--------|--------|
| Click empty area | Add new band at that frequency/gain |
| Drag node horizontally | Change frequency (logarithmic) |
| Drag node vertically | Change gain (linear) |
| Scroll on node | Adjust Q factor |
| Double-click node | Open detailed editor |
| Right-click node | Context menu (delete, bypass, copy) |
| Click band button | Select band, show parameters |

## Core Components

### EQCanvas.tsx
```tsx
interface EQCanvasProps {
  bands: EQBand[];
  selectedBand: number | null;
  onBandSelect: (index: number) => void;
  onBandChange: (index: number, changes: Partial<EQBand>) => void;
  onAddBand: (freq: number, gain: number) => void;
  sampleRate: number;
}

export function EQCanvas({
  bands,
  selectedBand,
  onBandSelect,
  onBandChange,
  onAddBand,
  sampleRate,
}: EQCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  // Frequency axis: logarithmic from 20Hz to 20kHz
  const freqToX = useCallback((freq: number) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const log = Math.log10(freq);
    return ((log - minLog) / (maxLog - minLog)) * dimensions.width;
  }, [dimensions.width]);

  const xToFreq = useCallback((x: number) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const log = minLog + (x / dimensions.width) * (maxLog - minLog);
    return Math.pow(10, log);
  }, [dimensions.width]);

  // Gain axis: linear from -24dB to +24dB
  const gainToY = useCallback((gain: number) => {
    const maxGain = 24;
    const minGain = -24;
    return ((maxGain - gain) / (maxGain - minGain)) * dimensions.height;
  }, [dimensions.height]);

  const yToGain = useCallback((y: number) => {
    const maxGain = 24;
    const minGain = -24;
    return maxGain - (y / dimensions.height) * (maxGain - minGain);
  }, [dimensions.height]);

  // Calculate composite response
  const responsePath = useMemo(() => {
    const points: string[] = [];
    const numPoints = 512;

    for (let i = 0; i < numPoints; i++) {
      const freq = 20 * Math.pow(1000, i / (numPoints - 1));
      let totalDb = 0;

      for (const band of bands) {
        if (!band.bypassed) {
          totalDb += calculateBiquadResponse(band, freq, sampleRate);
        }
      }

      const x = freqToX(freq);
      const y = gainToY(totalDb);
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  }, [bands, sampleRate, freqToX, gainToY]);

  // Handle click to add band
  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const freq = Math.round(xToFreq(x));
    const gain = Math.round(yToGain(y) * 10) / 10;

    onAddBand(freq, gain);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      className="w-full h-full bg-dsp-bg"
      onClick={handleCanvasClick}
    >
      {/* Grid lines */}
      <FrequencyGrid freqToX={freqToX} height={dimensions.height} />
      <GainGrid gainToY={gainToY} width={dimensions.width} />

      {/* Response curve */}
      <path
        d={responsePath}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={2}
      />

      {/* Band nodes */}
      {bands.map((band, index) => (
        <EQNode
          key={index}
          band={band}
          index={index}
          isSelected={selectedBand === index}
          x={freqToX(band.freq)}
          y={gainToY(band.gain)}
          onSelect={() => onBandSelect(index)}
          onChange={(changes) => onBandChange(index, changes)}
          xToFreq={xToFreq}
          yToGain={yToGain}
        />
      ))}
    </svg>
  );
}
```

### EQNode.tsx
```tsx
interface EQNodeProps {
  band: EQBand;
  index: number;
  isSelected: boolean;
  x: number;
  y: number;
  onSelect: () => void;
  onChange: (changes: Partial<EQBand>) => void;
  xToFreq: (x: number) => number;
  yToGain: (y: number) => number;
}

export function EQNode({
  band,
  index,
  isSelected,
  x,
  y,
  onSelect,
  onChange,
  xToFreq,
  yToGain,
}: EQNodeProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    onSelect();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = document.querySelector('svg');
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      const freq = Math.round(xToFreq(newX));
      const gain = Math.round(yToGain(newY) * 10) / 10;

      onChange({ freq, gain });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, xToFreq, yToGain, onChange]);

  // Scroll to adjust Q
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newQ = Math.max(0.1, Math.min(100, band.q + delta * band.q));
    onChange({ q: Math.round(newQ * 100) / 100 });
  };

  const nodeColor = band.bypassed ? '#fbbf24' : '#22d3ee';

  return (
    <g
      className="cursor-move"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {/* Node circle */}
      <circle
        cx={x}
        cy={y}
        r={isSelected ? 10 : 8}
        fill={nodeColor}
        stroke={isSelected ? 'white' : 'transparent'}
        strokeWidth={2}
      />
      {/* Band number label */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        className="text-xs font-bold fill-black pointer-events-none"
      >
        {index + 1}
      </text>
    </g>
  );
}
```

## Biquad Response Calculation

```typescript
// Calculate magnitude response in dB for a biquad filter
export function calculateBiquadResponse(
  band: EQBand,
  freq: number,
  sampleRate: number
): number {
  const { type, freq: centerFreq, q, gain } = band;

  // Normalized frequency
  const w0 = (2 * Math.PI * centerFreq) / sampleRate;
  const w = (2 * Math.PI * freq) / sampleRate;

  // Calculate filter coefficients based on type
  const { b0, b1, b2, a0, a1, a2 } = calculateBiquadCoefficients(type, w0, q, gain);

  // Calculate magnitude at frequency
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);

  const numerator = b0 * b0 + b1 * b1 + b2 * b2 +
    2 * (b0 * b1 + b1 * b2) * cosW +
    2 * b0 * b2 * cos2W;

  const denominator = a0 * a0 + a1 * a1 + a2 * a2 +
    2 * (a0 * a1 + a1 * a2) * cosW +
    2 * a0 * a2 * cos2W;

  const magnitude = Math.sqrt(numerator / denominator);

  return 20 * Math.log10(magnitude);
}
```

## Band Selector

```tsx
interface BandSelectorProps {
  bands: EQBand[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  maxBands?: number;
}

export function BandSelector({
  bands,
  selectedIndex,
  onSelect,
  maxBands = 9,
}: BandSelectorProps) {
  return (
    <div className="flex gap-1 p-2 bg-dsp-surface rounded">
      {Array.from({ length: maxBands }).map((_, i) => {
        const band = bands[i];
        const isActive = !!band && !band.bypassed;
        const isSelected = selectedIndex === i;

        return (
          <button
            key={i}
            onClick={() => band && onSelect(i)}
            disabled={!band}
            className={cn(
              "w-10 h-10 rounded text-xs font-mono flex flex-col items-center justify-center",
              isSelected && "ring-2 ring-white",
              isActive ? "bg-dsp-accent text-black" : "bg-white/10 text-gray-400"
            )}
          >
            <span className="font-bold">{band?.typeLabel || '○'}</span>
            <span className="text-[10px]">
              {band ? formatFrequency(band.freq) : '──'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

## Band Type Selector

```tsx
const BAND_TYPES = [
  { value: 'Highpass', label: 'HP', description: 'High-pass filter' },
  { value: 'Lowpass', label: 'LP', description: 'Low-pass filter' },
  { value: 'Peaking', label: 'PK', description: 'Parametric EQ' },
  { value: 'Highshelf', label: 'HS', description: 'High shelf' },
  { value: 'Lowshelf', label: 'LS', description: 'Low shelf' },
  { value: 'Notch', label: 'NT', description: 'Notch filter' },
  { value: 'Bandpass', label: 'BP', description: 'Band-pass filter' },
];

export function BandTypeSelector({ value, onChange }: BandTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BAND_TYPES.map(type => (
          <SelectItem key={type.value} value={type.value}>
            <span className="font-mono mr-2">{type.label}</span>
            <span className="text-gray-400">{type.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Parameter Sliders

```tsx
export function BandParameters({ band, onChange }: BandParametersProps) {
  const needsQ = ['Highpass', 'Lowpass', 'Peaking', 'Notch', 'Bandpass'].includes(band.type);
  const needsGain = ['Peaking', 'Highshelf', 'Lowshelf'].includes(band.type);

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-dsp-surface rounded">
      <FrequencyInput
        value={band.freq}
        onChange={(freq) => onChange({ freq })}
        min={20}
        max={20000}
        label="Frequency"
      />

      {needsQ && (
        <NumericInput
          value={band.q}
          onChange={(q) => onChange({ q })}
          min={0.1}
          max={100}
          step={0.1}
          label="Q"
        />
      )}

      {needsGain && (
        <GainInput
          value={band.gain}
          onChange={(gain) => onChange({ gain })}
          min={-24}
          max={24}
          label="Gain"
        />
      )}

      <div className="flex items-end gap-2">
        <Button
          variant={band.bypassed ? 'default' : 'outline'}
          onClick={() => onChange({ bypassed: !band.bypassed })}
        >
          Bypass
        </Button>
        <Button variant="destructive" onClick={() => onChange({ deleted: true })}>
          Delete
        </Button>
      </div>
    </div>
  );
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1-9 | Select band |
| Delete | Delete selected band |
| B | Bypass selected band |
| Escape | Deselect |
| Arrow keys | Fine-tune freq/gain |

## Performance Considerations

- Use `useMemo` for response curve calculation
- Debounce parameter updates (100ms)
- Use `requestAnimationFrame` for drag updates
- Limit response curve to 512 points
