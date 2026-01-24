# Agent Context: Network Dashboard

## Overview

Build the network dashboard - the central hub for managing all CamillaDSP units across a venue or tour setup.

## Requirements

### Dashboard Features
- Display all configured units as cards in a responsive grid
- Status indicator (online/offline/error) with color coding
- Per-unit info: name, IP, sample rate, channel count, CPU load, buffer level
- Mini level meters showing input/output activity
- Quick volume control and mute toggle
- Grouping by zone (FOH, Monitors, Fills, Delays)
- Batch operations (mute all, gain adjustment to multiple units)
- Add/remove/rename units
- Network latency indicator

### Unit Card Info
- Connection status with visual indicator
- Sample rate (with mismatch warning if differs from others)
- Channel configuration (inputs → outputs)
- Processing load percentage
- Buffer fill level
- Last seen timestamp if offline

### Actions
- Open: Navigate to full channel view for this unit
- Settings: Device configuration dialog
- More menu: Rename, Export Config, Remove

## Component Structure

### NetworkDashboard.tsx
```tsx
interface NetworkDashboardProps {
  units: UnitInfo[];
  onUnitSelect: (unitId: string) => void;
  onAddUnit: () => void;
}

export function NetworkDashboard({
  units,
  onUnitSelect,
  onAddUnit,
}: NetworkDashboardProps) {
  const onlineCount = units.filter(u => u.status === 'connected').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          NETWORK - {onlineCount} Unit{onlineCount !== 1 ? 's' : ''} Online
        </h1>
        <Button onClick={onAddUnit} variant="outline">
          + Add Unit
        </Button>
      </div>

      {/* Unit Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {units.map(unit => (
          <UnitCard
            key={unit.id}
            unit={unit}
            onSelect={() => onUnitSelect(unit.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### UnitCard.tsx
```tsx
interface UnitCardProps {
  unit: UnitInfo;
  onSelect: () => void;
}

export function UnitCard({ unit, onSelect }: UnitCardProps) {
  const isOnline = unit.status === 'connected';

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isOnline
          ? "border-white/20 bg-dsp-surface hover:border-white/40"
          : "border-white/10 bg-dsp-surface/50 opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-green-500" : "bg-gray-500"
          )}
        />
        <h3 className="font-semibold uppercase">{unit.name}</h3>
      </div>

      {/* Address */}
      <p className="text-sm text-gray-400 mb-3">
        {unit.address}:{unit.port}
      </p>

      <hr className="border-white/10 mb-3" />

      {isOnline ? (
        <>
          {/* Status Info */}
          <div className="space-y-1 text-sm mb-3">
            <p>Status: <span className="text-green-400">Running</span></p>
            <p>Sample Rate: {unit.sampleRate.toLocaleString()} Hz</p>
            <p>Channels: {unit.captureChannels} in → {unit.playbackChannels} out</p>
            <p>Load: {unit.processingLoad}%  Buffer: {unit.bufferLevel}%</p>
          </div>

          <hr className="border-white/10 mb-3" />

          {/* Level Meters */}
          <UnitCardMeters
            inputLevels={unit.inputLevels}
            outputLevels={unit.outputLevels}
          />

          <hr className="border-white/10 my-3" />

          {/* Volume Control */}
          <UnitCardVolume
            volume={unit.volume}
            muted={unit.muted}
            onVolumeChange={(v) => setVolume(unit.id, v)}
            onMuteToggle={() => toggleMute(unit.id)}
          />

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button onClick={onSelect} className="flex-1">
              Open
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuItem>Export Config</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : (
        <>
          {/* Offline State */}
          <p className="text-sm text-gray-400 mb-4">
            Last seen: {formatRelativeTime(unit.lastSeen)}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              Reconnect
            </Button>
            <Button variant="destructive" size="icon">
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### UnitCardMeters.tsx
```tsx
interface UnitCardMetersProps {
  inputLevels: number[];
  outputLevels: number[];
}

export function UnitCardMeters({
  inputLevels,
  outputLevels,
}: UnitCardMetersProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-8">IN:</span>
        <div className="flex-1 flex gap-px">
          {inputLevels.map((level, i) => (
            <MiniMeter key={i} level={level} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-8">OUT:</span>
        <div className="flex-1 flex gap-px">
          {outputLevels.map((level, i) => (
            <MiniMeter key={i} level={level} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMeter({ level }: { level: number }) {
  // Convert dB to percentage (assuming -60dB to 0dB range)
  const percentage = Math.max(0, Math.min(100, (level + 60) / 60 * 100));

  return (
    <div className="h-4 w-2 bg-gray-700 rounded-sm overflow-hidden">
      <div
        className={cn(
          "w-full transition-all duration-75",
          level > -3 ? "bg-red-500" : level > -12 ? "bg-yellow-500" : "bg-green-500"
        )}
        style={{ height: `${percentage}%`, marginTop: `${100 - percentage}%` }}
      />
    </div>
  );
}
```

### UnitCardVolume.tsx
```tsx
interface UnitCardVolumeProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export function UnitCardVolume({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}: UnitCardVolumeProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">Volume:</span>
      <span className="font-mono text-sm w-16">
        {muted ? 'MUTED' : `${volume.toFixed(1)} dB`}
      </span>
      <Slider
        value={[volume]}
        onValueChange={([v]) => onVolumeChange(v)}
        min={-100}
        max={0}
        step={0.5}
        disabled={muted}
        className="flex-1"
      />
      <Button
        variant={muted ? 'destructive' : 'outline'}
        size="sm"
        onClick={onMuteToggle}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </Button>
    </div>
  );
}
```

## Add Unit Dialog

```tsx
export function AddUnitDialog({ open, onClose, onAdd }: AddUnitDialogProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      address: '',
      port: 1234,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: z.object({
        name: z.string().min(1, 'Name is required'),
        address: z.string().ip({ message: 'Valid IP address required' }),
        port: z.number().int().min(1).max(65535),
      }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add CamillaDSP Unit</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit}>
          <div className="space-y-4">
            <form.Field
              name="name"
              children={(field) => (
                <Input
                  label="Name"
                  placeholder="e.g., Living Room"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors?.[0]}
                />
              )}
            />

            <form.Field
              name="address"
              children={(field) => (
                <Input
                  label="IP Address"
                  placeholder="192.168.1.100"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors?.[0]}
                />
              )}
            />

            <form.Field
              name="port"
              children={(field) => (
                <NumericInput
                  label="Port"
                  value={field.state.value}
                  onChange={field.handleChange}
                  min={1}
                  max={65535}
                />
              )}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.state.canSubmit}>
              Add Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## State Management

```typescript
// Unit store (Zustand)
interface UnitState {
  units: UnitInfo[];
  addUnit: (unit: Omit<UnitInfo, 'id' | 'status'>) => void;
  removeUnit: (id: string) => void;
  updateUnit: (id: string, updates: Partial<UnitInfo>) => void;
  setUnitStatus: (id: string, status: ConnectionStatus) => void;
}

export const useUnitStore = create<UnitState>()(
  persist(
    (set) => ({
      units: [],
      addUnit: (unit) =>
        set((state) => ({
          units: [
            ...state.units,
            {
              ...unit,
              id: crypto.randomUUID(),
              status: 'disconnected',
            },
          ],
        })),
      removeUnit: (id) =>
        set((state) => ({
          units: state.units.filter((u) => u.id !== id),
        })),
      updateUnit: (id, updates) =>
        set((state) => ({
          units: state.units.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        })),
      setUnitStatus: (id, status) =>
        set((state) => ({
          units: state.units.map((u) =>
            u.id === id ? { ...u, status } : u
          ),
        })),
    }),
    {
      name: 'camilla-units',
    }
  )
);
```

## WebSocket Integration

```typescript
// Hook to manage multiple unit connections
export function useUnitConnections() {
  const units = useUnitStore((s) => s.units);
  const setUnitStatus = useUnitStore((s) => s.setUnitStatus);
  const updateUnit = useUnitStore((s) => s.updateUnit);

  useEffect(() => {
    const connections = new Map<string, WebSocketManager>();

    for (const unit of units) {
      if (connections.has(unit.id)) continue;

      const ws = new WebSocketManager(`ws://${unit.address}:${unit.port}`);

      ws.on('connected', () => {
        setUnitStatus(unit.id, 'connected');
      });

      ws.on('disconnected', () => {
        setUnitStatus(unit.id, 'disconnected');
      });

      ws.on('levels', (levels) => {
        updateUnit(unit.id, {
          inputLevels: levels.capture,
          outputLevels: levels.playback,
        });
      });

      ws.connect();
      connections.set(unit.id, ws);
    }

    return () => {
      connections.forEach((ws) => ws.disconnect());
    };
  }, [units]);
}
```

## Responsive Grid

```css
/* Tailwind grid classes */
.unit-grid {
  @apply grid gap-4;
  @apply grid-cols-1;              /* Mobile: 1 column */
  @apply md:grid-cols-2;           /* Tablet: 2 columns */
  @apply lg:grid-cols-3;           /* Desktop: 3 columns */
  @apply xl:grid-cols-4;           /* Large: 4 columns */
}
```

## Accessibility

- Keyboard navigation between cards (Tab/Arrow keys)
- Focus indicators on interactive elements
- ARIA labels for status indicators
- Screen reader announcements for connection changes
