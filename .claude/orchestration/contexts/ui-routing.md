# Agent Context: Routing Matrix

## Overview

Build the routing matrix - a crosspoint grid for configuring input-to-output signal routing with per-point gain and phase control.

## Requirements

### Matrix Features
- Grid showing inputs (rows) vs outputs (columns)
- Click crosspoint to toggle connection
- Shift+click to toggle phase invert
- Per-crosspoint gain adjustment (-40 to +12 dB)
- Visual indication of active connections
- Phase invert indicator (φ symbol)
- Mute per crosspoint
- Sum multiple inputs to single output
- Split single input to multiple outputs

### Crosspoint Editor
- Appears when crosspoint selected
- Gain slider with numeric display
- Phase invert toggle
- Mute toggle
- Remove connection button

### Interaction
- Click: Select crosspoint
- Double-click: Toggle connection
- Arrow keys: Navigate grid
- Space: Toggle connection
- I: Invert phase
- M: Mute

## Component Structure

### RoutingMatrix.tsx
```tsx
interface RoutingMatrixProps {
  mixer: MixerConfig;
  onMixerChange: (mixer: MixerConfig) => void;
}

export function RoutingMatrix({ mixer, onMixerChange }: RoutingMatrixProps) {
  const [selectedCrosspoint, setSelectedCrosspoint] = useState<{
    input: number;
    output: number;
  } | null>(null);

  const inputChannels = mixer.channels.in;
  const outputChannels = mixer.channels.out;

  // Build routing lookup
  const routingMap = useMemo(() => {
    const map = new Map<string, MixerSource>();
    for (let out = 0; out < outputChannels; out++) {
      const mapping = mixer.mapping[out];
      if (mapping) {
        for (const source of mapping.sources) {
          map.set(`${source.channel}-${out}`, source);
        }
      }
    }
    return map;
  }, [mixer]);

  const getSource = (input: number, output: number) => {
    return routingMap.get(`${input}-${output}`);
  };

  const toggleCrosspoint = (input: number, output: number) => {
    const key = `${input}-${output}`;
    const existing = routingMap.get(key);

    if (existing) {
      // Remove connection
      removeSource(output, input);
    } else {
      // Add connection with 0dB gain
      addSource(output, { channel: input, gain: 0, inverted: false, mute: false });
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">MIXER - Main Matrix</h2>

      <div className="overflow-auto">
        <table className="border-collapse">
          {/* Header row - outputs */}
          <thead>
            <tr>
              <th className="w-24 p-2 text-left text-sm text-gray-400">INPUTS</th>
              {Array.from({ length: outputChannels }).map((_, out) => (
                <th key={out} className="w-16 p-2 text-center text-sm">
                  <div>{out + 1}</div>
                  <div className="text-xs text-gray-400">
                    {mixer.mapping[out]?.dest || `Out ${out + 1}`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body - inputs × outputs */}
          <tbody>
            {Array.from({ length: inputChannels }).map((_, input) => (
              <tr key={input} className="border-t border-white/10">
                <td className="p-2 text-sm">
                  <span className="text-gray-400">{input + 1}</span>
                  <span className="ml-2">{getInputLabel(input)}</span>
                </td>
                {Array.from({ length: outputChannels }).map((_, output) => (
                  <td key={output} className="p-0">
                    <CrosspointCell
                      source={getSource(input, output)}
                      isSelected={
                        selectedCrosspoint?.input === input &&
                        selectedCrosspoint?.output === output
                      }
                      onClick={() => {
                        setSelectedCrosspoint({ input, output });
                      }}
                      onToggle={() => toggleCrosspoint(input, output)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-400">
        Legend: ■ = Connected, number = gain (dB), click to select, double-click to toggle
      </div>

      {/* Crosspoint Editor */}
      {selectedCrosspoint && (
        <CrosspointEditor
          source={getSource(selectedCrosspoint.input, selectedCrosspoint.output)}
          inputLabel={getInputLabel(selectedCrosspoint.input)}
          outputLabel={mixer.mapping[selectedCrosspoint.output]?.dest || `Out ${selectedCrosspoint.output + 1}`}
          onSourceChange={(source) => {
            updateSource(selectedCrosspoint.output, selectedCrosspoint.input, source);
          }}
          onClose={() => setSelectedCrosspoint(null)}
        />
      )}
    </div>
  );
}
```

### CrosspointCell.tsx
```tsx
interface CrosspointCellProps {
  source: MixerSource | undefined;
  isSelected: boolean;
  onClick: () => void;
  onToggle: () => void;
}

export function CrosspointCell({
  source,
  isSelected,
  onClick,
  onToggle,
}: CrosspointCellProps) {
  const isConnected = !!source && !source.mute;
  const isInverted = source?.inverted;

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && source) {
      // Toggle phase invert
      onToggle();
    } else {
      onClick();
    }
  };

  const handleDoubleClick = () => {
    onToggle();
  };

  return (
    <button
      className={cn(
        "w-16 h-10 flex items-center justify-center border",
        "transition-colors",
        isSelected && "ring-2 ring-dsp-accent",
        isConnected
          ? "bg-dsp-accent/20 border-dsp-accent/50 text-white"
          : "bg-transparent border-white/10 text-gray-500 hover:bg-white/5"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {source ? (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "w-2 h-2 rounded-sm",
              source.mute ? "bg-gray-500" : "bg-dsp-accent"
            )}
          />
          <span className="text-xs font-mono">
            {source.gain > 0 ? `+${source.gain}` : source.gain}
          </span>
          {isInverted && <span className="text-red-400">φ</span>}
        </div>
      ) : null}
    </button>
  );
}
```

### CrosspointEditor.tsx
```tsx
interface CrosspointEditorProps {
  source: MixerSource | undefined;
  inputLabel: string;
  outputLabel: string;
  onSourceChange: (source: Partial<MixerSource>) => void;
  onClose: () => void;
}

export function CrosspointEditor({
  source,
  inputLabel,
  outputLabel,
  onSourceChange,
  onClose,
}: CrosspointEditorProps) {
  if (!source) {
    return (
      <div className="mt-4 p-4 bg-dsp-surface rounded-lg">
        <p className="text-gray-400">
          No connection. Click to add {inputLabel} → {outputLabel}
        </p>
        <Button
          onClick={() => onSourceChange({ channel: 0, gain: 0, inverted: false, mute: false })}
          className="mt-2"
        >
          Add Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-dsp-surface rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {inputLabel} → {outputLabel}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Gain */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Gain</label>
          <div className="flex items-center gap-2">
            <Slider
              value={[source.gain]}
              onValueChange={([gain]) => onSourceChange({ gain })}
              min={-40}
              max={12}
              step={0.5}
              className="flex-1"
            />
            <span className="font-mono text-sm w-16 text-right">
              {source.gain > 0 ? `+${source.gain}` : source.gain} dB
            </span>
          </div>
        </div>

        {/* Inverted */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Phase</label>
          <Button
            variant={source.inverted ? 'destructive' : 'outline'}
            onClick={() => onSourceChange({ inverted: !source.inverted })}
            className="w-full"
          >
            {source.inverted ? 'Inverted (φ)' : 'Normal'}
          </Button>
        </div>

        {/* Mute */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Mute</label>
          <Button
            variant={source.mute ? 'destructive' : 'outline'}
            onClick={() => onSourceChange({ mute: !source.mute })}
            className="w-full"
          >
            {source.mute ? 'MUTED' : 'Active'}
          </Button>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          variant="destructive"
          onClick={() => onSourceChange({ deleted: true })}
        >
          Remove Connection
        </Button>
      </div>
    </div>
  );
}
```

## CamillaDSP Mixer Format

The mixer config in CamillaDSP looks like:

```yaml
mixers:
  main:
    channels:
      in: 4
      out: 4
    mapping:
      - dest: 0
        sources:
          - channel: 0
            gain: 0
            inverted: false
            mute: false
          - channel: 2
            gain: -3
      - dest: 1
        sources:
          - channel: 1
            gain: 0
```

TypeScript types:

```typescript
interface MixerConfig {
  channels: {
    in: number;
    out: number;
  };
  mapping: MixerMapping[];
}

interface MixerMapping {
  dest: number;
  sources: MixerSource[];
}

interface MixerSource {
  channel: number;
  gain: number;
  inverted?: boolean;
  mute?: boolean;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Navigate cells |
| Space | Toggle connection |
| I | Invert phase |
| M | Mute |
| Delete | Remove connection |
| Escape | Deselect |

## Accessibility

- Grid navigation with arrow keys
- Clear focus indicators
- ARIA role="grid" with proper row/cell roles
- Screen reader labels for connection state
