# CamillaDSP Frontend - Technical Stack & Architecture

## Overview

This document defines the technology stack, architectural patterns, and implementation guidelines for the CamillaDSP Frontend application. All developers should reference this document to ensure consistency across the codebase.

---

## Core Technology Stack

### Runtime & Build

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework with concurrent features |
| **TypeScript** | 5.7+ | Type safety and developer experience |
| **Vite** | 7.x | Build tool and dev server |
| **Node.js** | 22.x LTS | Development runtime |

### State Management & Data Fetching

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query** | 5.x | Server state, caching, WebSocket data |
| **Zustand** | 5.x | Client-side UI state |
| **Immer** | 10.x | Immutable state updates |

### UI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Radix UI** | Latest | Accessible, unstyled primitives |
| **Framer Motion** | 12.x | Animations and transitions |
| **Lucide React** | Latest | Icon library |

### Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Form** | 1.x | Type-safe form state management |
| **Zod** | 3.x | Schema validation |
| **@tanstack/zod-form-adapter** | Latest | Zod integration for TanStack Form |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **js-yaml** | 4.x | YAML parsing/serialization |
| **date-fns** | 4.x | Date formatting |
| **clsx** | 2.x | Conditional classnames |
| **tailwind-merge** | 2.x | Tailwind class merging |

### Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Recharts** | 2.x | Charts for frequency response |
| **@xyflow/react** | 12.x | Pipeline flowchart visualization |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | 3.x | Unit and integration testing |
| **React Testing Library** | 16.x | Component testing |
| **MSW** | 2.x | API mocking |
| **Playwright** | 1.x | E2E testing |

### Code Quality

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 9.x | Linting (flat config) |
| **Prettier** | 3.x | Code formatting |
| **TypeScript ESLint** | 8.x | TS-specific linting |

---

## Project Structure

```
src/
├── app/                    # Application shell and routing
│   ├── layout.tsx          # Root layout with providers
│   ├── routes/             # Route components
│   └── providers.tsx       # Context providers composition
│
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI primitives (buttons, inputs, etc.)
│   ├── audio/              # Audio-specific components (meters, faders)
│   ├── filters/            # Filter editor components
│   ├── pipeline/           # Pipeline builder components
│   ├── matrix/             # Audio matrix components
│   └── monitoring/         # Level meters, graphs, metrics
│
├── features/               # Feature-based modules
│   ├── connection/         # Multi-unit connection management
│   ├── configuration/      # Config management (YAML, history)
│   ├── devices/            # Device configuration
│   └── realtime/           # Real-time control and monitoring
│
├── lib/                    # Core libraries and utilities
│   ├── websocket/          # WebSocket client and commands
│   ├── dsp/                # DSP calculations (filter response)
│   ├── yaml/               # YAML parsing/serialization
│   └── utils/              # General utilities
│
├── stores/                 # Zustand stores
│   ├── connection.store.ts
│   ├── config.store.ts
│   ├── ui.store.ts
│   └── monitoring.store.ts
│
├── types/                  # TypeScript type definitions
│   ├── camilla.types.ts    # CamillaDSP config types
│   ├── websocket.types.ts  # WebSocket message types
│   └── ui.types.ts         # UI state types
│
├── hooks/                  # Custom React hooks
│   ├── useWebSocket.ts
│   ├── useDSPUnit.ts
│   └── useFilterResponse.ts
│
└── styles/                 # Global styles
    └── globals.css         # Tailwind imports and custom styles
```

---

## Architectural Patterns

### 1. Component Architecture

**Pattern: Compound Components + Composition**

```tsx
// Good: Compound component pattern for complex UI
<FilterEditor>
  <FilterEditor.Header>
    <FilterEditor.Title>Biquad Filter</FilterEditor.Title>
    <FilterEditor.TypeSelector />
  </FilterEditor.Header>
  <FilterEditor.Parameters>
    <FilterEditor.FrequencyInput />
    <FilterEditor.QInput />
    <FilterEditor.GainInput />
  </FilterEditor.Parameters>
  <FilterEditor.ResponseGraph />
  <FilterEditor.Actions onSave={handleSave} onCancel={handleCancel} />
</FilterEditor>

// Good: Composition over configuration
<LevelMeter
  value={level}
  peak={peak}
  orientation="vertical"
>
  <LevelMeter.Scale />
  <LevelMeter.Bar />
  <LevelMeter.PeakHold />
  <LevelMeter.ClipIndicator />
</LevelMeter>
```

**Pattern: Container/Presentation Split**

```tsx
// Container: Handles data and logic
function FilterEditorContainer({ filterId }: { filterId: string }) {
  const filter = useFilter(filterId);
  const updateFilter = useUpdateFilter();
  const response = useFilterResponse(filter);

  return (
    <FilterEditorPresentation
      filter={filter}
      response={response}
      onUpdate={updateFilter}
    />
  );
}

// Presentation: Pure UI rendering
function FilterEditorPresentation({
  filter,
  response,
  onUpdate
}: FilterEditorProps) {
  // Only rendering logic, no data fetching
}
```

### 2. State Management Strategy

**Three-Layer State Model:**

```
┌─────────────────────────────────────────────────────────┐
│                    Server State                          │
│         (TanStack Query - WebSocket data)               │
│  • DSP unit configs, levels, metrics                    │
│  • Cached, auto-refetched, deduplicated                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Client State                           │
│              (Zustand stores)                            │
│  • Connection status, selected unit                     │
│  • UI preferences, modal state                          │
│  • Undo/redo history                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Local State                            │
│           (useState, useReducer)                         │
│  • Form inputs, temporary edits                         │
│  • Component-specific UI state                          │
└─────────────────────────────────────────────────────────┘
```

**TanStack Query for WebSocket Data:**

```tsx
// hooks/useDSPLevels.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

export function useDSPLevels(unitId: string) {
  const ws = useWebSocket(unitId);
  const queryClient = useQueryClient();

  // Subscribe to level updates via WebSocket
  useEffect(() => {
    const unsubscribe = ws.subscribe('levels', (data) => {
      queryClient.setQueryData(['levels', unitId], data);
    });
    return unsubscribe;
  }, [ws, unitId, queryClient]);

  return useQuery({
    queryKey: ['levels', unitId],
    queryFn: () => ws.send('GetSignalLevels'),
    refetchInterval: 100, // 10Hz polling fallback
    staleTime: 50,
  });
}
```

**Zustand Store Pattern:**

```tsx
// stores/connection.store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

interface ConnectionState {
  units: Map<string, DSPUnit>;
  activeUnitId: string | null;

  // Actions
  addUnit: (unit: DSPUnit) => void;
  removeUnit: (unitId: string) => void;
  setActiveUnit: (unitId: string) => void;
  updateUnitStatus: (unitId: string, status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    immer((set) => ({
      units: new Map(),
      activeUnitId: null,

      addUnit: (unit) => set((state) => {
        state.units.set(unit.id, unit);
      }),

      removeUnit: (unitId) => set((state) => {
        state.units.delete(unitId);
        if (state.activeUnitId === unitId) {
          state.activeUnitId = null;
        }
      }),

      setActiveUnit: (unitId) => set((state) => {
        state.activeUnitId = unitId;
      }),

      updateUnitStatus: (unitId, status) => set((state) => {
        const unit = state.units.get(unitId);
        if (unit) {
          unit.status = status;
        }
      }),
    })),
    { name: 'camilla-connections' }
  )
);
```

### 3. WebSocket Communication Pattern

**WebSocket Manager Class:**

```tsx
// lib/websocket/WebSocketManager.ts
import { EventEmitter } from 'events';

type MessageHandler = (data: unknown) => void;

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageQueue: Array<{ command: string; resolve: Function; reject: Function }> = [];
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor(
    private address: string,
    private port: number
  ) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${this.address}:${this.port}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.flushQueue();
        resolve();
      };

      this.ws.onclose = () => {
        this.emit('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  async send<T>(command: string, params?: unknown): Promise<T> {
    const id = crypto.randomUUID();
    const message = params
      ? { [command]: params, _id: id }
      : { _id: id, command };

    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.pendingRequests.set(id, { resolve, reject });
        this.ws.send(JSON.stringify(message));

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`Command ${command} timed out`));
          }
        }, 5000);
      } else {
        this.messageQueue.push({ command: JSON.stringify(message), resolve, reject });
      }
    });
  }

  private handleMessage(data: { _id?: string; result: string; value?: unknown }) {
    if (data._id && this.pendingRequests.has(data._id)) {
      const { resolve, reject } = this.pendingRequests.get(data._id)!;
      this.pendingRequests.delete(data._id);

      if (data.result === 'Ok') {
        resolve(data.value);
      } else {
        reject(new Error(data.value as string));
      }
    }

    // Emit for subscribers (level updates, etc.)
    this.emit('message', data);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const { command, resolve, reject } = this.messageQueue.shift()!;
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(command);
      }
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
```

**React Hook for WebSocket:**

```tsx
// hooks/useWebSocket.ts
import { useEffect, useMemo } from 'react';
import { useConnectionStore } from '@/stores/connection.store';
import { WebSocketManager } from '@/lib/websocket/WebSocketManager';

const managers = new Map<string, WebSocketManager>();

export function useWebSocket(unitId: string) {
  const unit = useConnectionStore((s) => s.units.get(unitId));
  const updateStatus = useConnectionStore((s) => s.updateUnitStatus);

  const manager = useMemo(() => {
    if (!unit) return null;

    if (!managers.has(unitId)) {
      const mgr = new WebSocketManager(unit.address, unit.port);
      managers.set(unitId, mgr);

      mgr.on('connected', () => updateStatus(unitId, 'connected'));
      mgr.on('disconnected', () => updateStatus(unitId, 'disconnected'));
      mgr.on('error', () => updateStatus(unitId, 'error'));

      mgr.connect();
    }

    return managers.get(unitId)!;
  }, [unitId, unit, updateStatus]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount if no other components use this unit
      // (implement reference counting if needed)
    };
  }, [unitId]);

  return manager;
}
```

### 4. Form Handling Pattern

**TanStack Form + Zod:**

```tsx
// components/filters/BiquadFilterEditor.tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

const biquadSchema = z.object({
  type: z.enum([
    'Highpass', 'Lowpass', 'Peaking', 'Notch',
    'Bandpass', 'Allpass', 'Highshelf', 'Lowshelf',
    'LinkwitzRiley', 'Butterworth', 'GeneralNotch'
  ]),
  freq: z.number().min(1).max(24000),
  q: z.number().min(0.1).max(100).optional(),
  gain: z.number().min(-40).max(40).optional(),
  slope: z.number().optional(),
});

type BiquadFormData = z.infer<typeof biquadSchema>;

export function BiquadFilterEditor({
  filter,
  onSave
}: {
  filter: BiquadFilter;
  onSave: (data: BiquadFormData) => void;
}) {
  const form = useForm({
    defaultValues: {
      type: filter.parameters.type,
      freq: filter.parameters.freq,
      q: filter.parameters.q,
      gain: filter.parameters.gain,
    } as BiquadFormData,
    onSubmit: async ({ value }) => {
      onSave(value);
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: biquadSchema,
    },
  });

  // Subscribe to field value for conditional rendering
  const filterType = form.useStore((state) => state.values.type);
  const needsQ = ['Peaking', 'Notch', 'Bandpass', 'Allpass'].includes(filterType);
  const needsGain = ['Peaking', 'Highshelf', 'Lowshelf'].includes(filterType);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="type"
        children={(field) => (
          <div>
            <label htmlFor={field.name}>Filter Type</label>
            <Select
              id={field.name}
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as BiquadFormData['type'])}
              onBlur={field.handleBlur}
            >
              {/* Filter type options */}
            </Select>
            <FieldError field={field} />
          </div>
        )}
      />

      <form.Field
        name="freq"
        children={(field) => (
          <div>
            <label htmlFor={field.name}>Frequency</label>
            <FrequencyInput
              id={field.name}
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
              min={1}
              max={24000}
            />
            <FieldError field={field} />
          </div>
        )}
      />

      {needsQ && (
        <form.Field
          name="q"
          children={(field) => (
            <div>
              <label htmlFor={field.name}>Q Factor</label>
              <NumberInput
                id={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                onBlur={field.handleBlur}
                min={0.1}
                max={100}
                step={0.1}
              />
              <FieldError field={field} />
            </div>
          )}
        />
      )}

      {needsGain && (
        <form.Field
          name="gain"
          children={(field) => (
            <div>
              <label htmlFor={field.name}>Gain (dB)</label>
              <GainInput
                id={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                onBlur={field.handleBlur}
                min={-40}
                max={40}
              />
              <FieldError field={field} />
            </div>
          )}
        />
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        )}
      />
    </form>
  );
}

// Reusable field error component
function FieldError({ field }: { field: { state: { meta: { errors: string[] } } } }) {
  return field.state.meta.errors.length > 0 ? (
    <span className="text-sm text-red-500">
      {field.state.meta.errors.join(', ')}
    </span>
  ) : null;
}
```

**TanStack Form Key Patterns:**

```tsx
// 1. Async validation (e.g., checking if filter name is unique)
const form = useForm({
  defaultValues: { name: '' },
  validatorAdapter: zodValidator(),
  validators: {
    onChangeAsync: z.object({
      name: z.string().min(1),
    }),
    onChangeAsyncDebounceMs: 300,
  },
});

// 2. Field arrays for dynamic lists (e.g., mixer sources)
<form.Field
  name="sources"
  mode="array"
  children={(field) => (
    <div>
      {field.state.value.map((_, index) => (
        <form.Field
          key={index}
          name={`sources[${index}].channel`}
          children={(subField) => (
            <NumberInput
              value={subField.state.value}
              onChange={(v) => subField.handleChange(v)}
            />
          )}
        />
      ))}
      <Button onClick={() => field.pushValue({ channel: 0, gain: 0, inverted: false })}>
        Add Source
      </Button>
    </div>
  )}
/>

// 3. Form-level async submission with loading state
const form = useForm({
  defaultValues: filterDefaults,
  onSubmit: async ({ value }) => {
    // Validate with CamillaDSP before applying
    const validation = await wsManager.send('ValidateConfig', configWithFilter(value));
    if (validation.result === 'Error') {
      throw new Error(validation.value as string);
    }
    await wsManager.send('SetConfig', configWithFilter(value));
  },
});

// 4. Linked fields (e.g., delay unit conversion)
<form.Field
  name="delay"
  children={(delayField) => (
    <form.Field
      name="unit"
      children={(unitField) => (
        <DelayInput
          value={delayField.state.value}
          unit={unitField.state.value}
          onValueChange={(v) => delayField.handleChange(v)}
          onUnitChange={(u) => {
            // Convert value when unit changes
            const converted = convertDelay(delayField.state.value, unitField.state.value, u);
            delayField.handleChange(converted);
            unitField.handleChange(u);
          }}
        />
      )}
    />
  )}
/>

// 5. Form reset and dirty state tracking
<form.Subscribe
  selector={(state) => [state.isDirty, state.isPristine]}
  children={([isDirty, isPristine]) => (
    <div className="flex gap-2">
      <Button type="submit" disabled={!isDirty}>Save</Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => form.reset()}
        disabled={isPristine}
      >
        Reset
      </Button>
    </div>
  )}
/>
```

### 5. Error Handling Pattern

**Error Boundary + Toast Notifications:**

```tsx
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Toast System with Sonner:**

```tsx
// lib/toast.ts
import { toast } from 'sonner';

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string, details?: string) =>
    toast.error(message, { description: details }),
  warning: (message: string) => toast.warning(message),

  connectionLost: (unitName: string) =>
    toast.error(`Connection lost to ${unitName}`, {
      description: 'Attempting to reconnect...',
      duration: Infinity,
      id: `connection-${unitName}`,
    }),

  connectionRestored: (unitName: string) => {
    toast.dismiss(`connection-${unitName}`);
    toast.success(`Reconnected to ${unitName}`);
  },

  configApplied: () => toast.success('Configuration applied successfully'),

  clippingDetected: (channel: number) =>
    toast.warning(`Clipping detected on channel ${channel}`, {
      id: `clipping-${channel}`,
    }),
};
```

---

## Section-Specific Context

### Phase 1: Foundation & Infrastructure

**Context:**
- Initialize with `npm create vite@latest -- --template react-ts`
- Use Vite 7's new features: improved HMR, better TypeScript support
- Configure path aliases in `vite.config.ts` and `tsconfig.json`

**Key Configuration Files:**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
```

```json
// tsconfig.json - key settings
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Phase 2: WebSocket Communication

**Context:**
- CamillaDSP WebSocket uses JSON messages
- Commands without args: send as quoted string `"GetVersion"`
- Commands with args: send as object `{"SetVolume": -10.0}`
- Responses always include `result` ("Ok" or "Error") and optional `value`

**CamillaDSP Message Types:**

```ts
// types/websocket.types.ts

// Command types (sent to CamillaDSP)
export type WSCommand =
  | 'GetVersion'
  | 'GetState'
  | 'GetStopReason'
  | 'GetConfig'
  | 'GetConfigJson'
  | 'Reload'
  | 'Stop'
  | 'Exit'
  | { SetConfig: string }          // YAML string
  | { SetConfigJson: string }      // JSON string
  | { ValidateConfig: string }
  | { SetVolume: number }
  | { AdjustVolume: number | AdjustVolumeParams }
  | { SetMute: boolean }
  | 'ToggleMute'
  | 'GetVolume'
  | 'GetMute'
  | { GetFaderVolume: number }
  | { SetFaderVolume: FaderVolumeParams }
  | { GetSignalLevelsSince: number }  // seconds
  | 'GetSignalLevels'
  | 'GetProcessingLoad'
  | 'GetBufferLevel'
  | 'GetCaptureRate'
  | 'GetClippedSamples'
  | 'ResetClippedSamples'
  | { GetAvailableCaptureDevices: string }   // backend name
  | { GetAvailablePlaybackDevices: string }; // backend name

// Response types (received from CamillaDSP)
export interface WSResponse<T = unknown> {
  result: 'Ok' | 'Error';
  value?: T;
}

export interface SignalLevels {
  playback_peak: number[];
  playback_rms: number[];
  capture_peak: number[];
  capture_rms: number[];
}

export interface FaderState {
  volume: number;
  mute: boolean;
}

export type ProcessingState =
  | 'Running'
  | 'Paused'
  | 'Inactive'
  | 'Starting'
  | 'Stalled';

export type StopReason =
  | 'None'
  | 'Done'
  | 'CaptureError'
  | 'PlaybackError'
  | 'CaptureFormatChange'
  | 'PlaybackFormatChange';
```

### Phase 3: Configuration Engine

**Context:**
- CamillaDSP configs are YAML with specific structure
- Use `js-yaml` for parsing/serialization
- Support token substitution: `$samplerate$`, `$channels$`

**Configuration Type Structure:**

```ts
// types/camilla.types.ts

export interface CamillaConfig {
  devices: DevicesConfig;
  mixers?: Record<string, MixerConfig>;
  filters?: Record<string, FilterConfig>;
  pipeline: PipelineStep[];
  title?: string;
  description?: string;
}

export interface DevicesConfig {
  samplerate: number;
  chunksize: number;
  queuelimit?: number;
  silence_threshold?: number;
  silence_timeout?: number;
  target_level?: number;
  adjust_period?: number;
  enable_rate_adjust?: boolean;
  enable_resampling?: boolean;
  resampler_type?: ResamplerType;
  capture_samplerate?: number;
  capture: CaptureDevice;
  playback: PlaybackDevice;
}

export type CaptureDeviceType =
  | 'Alsa' | 'CoreAudio' | 'Wasapi' | 'Jack'
  | 'Pulse' | 'Bluez' | 'File' | 'Stdin'
  | 'Signalgenerator' | 'Wavfile';

export type PlaybackDeviceType =
  | 'Alsa' | 'CoreAudio' | 'Wasapi' | 'Jack'
  | 'Pulse' | 'File' | 'Stdout';

export interface CaptureDevice {
  type: CaptureDeviceType;
  channels: number;
  device?: string;
  format?: SampleFormat;
  // Type-specific options...
}

export interface PlaybackDevice {
  type: PlaybackDeviceType;
  channels: number;
  device?: string;
  format?: SampleFormat;
  // Type-specific options...
}

// Filter types
export type FilterConfig =
  | BiquadFilter
  | ConvolutionFilter
  | DelayFilter
  | GainFilter
  | VolumeFilter
  | DitherFilter
  | DiffEqFilter
  | CompressorFilter
  | LoudnessFilter
  | NoiseGateFilter;

export interface BiquadFilter {
  type: 'Biquad';
  parameters: BiquadParameters;
}

export type BiquadType =
  | 'Highpass' | 'Lowpass' | 'Peaking' | 'Notch'
  | 'Bandpass' | 'Allpass' | 'Highshelf' | 'Lowshelf'
  | 'HighpassFO' | 'LowpassFO'  // First-order variants
  | 'LinkwitzRileyHighpass' | 'LinkwitzRileyLowpass'
  | 'ButterworthHighpass' | 'ButterworthLowpass'
  | 'GeneralNotch' | 'Tilt' | 'FivePointPeq' | 'GraphicEqualizer'
  | 'Free';  // Custom coefficients

export interface BiquadParameters {
  type: BiquadType;
  freq?: number;
  q?: number;
  gain?: number;
  slope?: number;
  // For Free type:
  a1?: number;
  a2?: number;
  b0?: number;
  b1?: number;
  b2?: number;
}

export interface ConvolutionFilter {
  type: 'Conv';
  parameters: {
    type: 'Raw' | 'Wav' | 'Values';
    filename?: string;
    values?: number[];
    format?: 'TEXT' | 'FLOAT32LE' | 'FLOAT64LE' | 'S16LE' | 'S24LE' | 'S24LE3' | 'S32LE';
    skip_bytes_lines?: number;
    read_bytes_lines?: number;
    channel?: number;
  };
}

export interface DelayFilter {
  type: 'Delay';
  parameters: {
    delay: number;
    unit: 'ms' | 'samples' | 'mm';
    subsample: boolean;
  };
}

export interface GainFilter {
  type: 'Gain';
  parameters: {
    gain: number;
    inverted?: boolean;
    scale?: 'dB' | 'linear';
  };
}

export interface VolumeFilter {
  type: 'Volume';
  parameters: {
    ramp_time?: number;
    fader?: 'Main' | 'Aux1' | 'Aux2' | 'Aux3' | 'Aux4';
  };
}

export interface DitherFilter {
  type: 'Dither';
  parameters: {
    type: 'Simple' | 'Lipshitz' | 'Fweighted' | 'Shibata' | 'ShibataLow' | 'None';
    bits: number;
  };
}

// Pipeline types
export interface PipelineStep {
  type: 'Mixer' | 'Filter';
  name: string;
  description?: string;
  bypassed?: boolean;
  channels?: number[];  // For Filter type: which channels to apply to
}

export interface MixerConfig {
  channels: {
    in: number;
    out: number;
  };
  mapping: MixerMapping[];
}

export interface MixerMapping {
  dest: number;
  sources: MixerSource[];
  mute?: boolean;
}

export interface MixerSource {
  channel: number;
  gain: number;
  inverted: boolean;
  mute?: boolean;
}
```

### Phase 4-6: UI Components

**Context:**
- Use Radix UI primitives for accessibility
- Tailwind for styling with custom DSP-themed colors
- All inputs need real-time validation feedback

**Tailwind Configuration:**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DSP-themed palette
        dsp: {
          bg: '#1a1a2e',
          surface: '#16213e',
          primary: '#0f3460',
          accent: '#e94560',
          meter: {
            green: '#4ade80',
            yellow: '#facc15',
            red: '#ef4444',
          },
        },
      },
      animation: {
        'meter-pulse': 'pulse 0.1s ease-in-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Component Conventions:**

```tsx
// components/ui/Button.tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-dsp-accent text-white hover:bg-dsp-accent/90',
        secondary: 'bg-dsp-primary text-white hover:bg-dsp-primary/80',
        outline: 'border border-dsp-primary bg-transparent hover:bg-dsp-primary/10',
        ghost: 'hover:bg-dsp-primary/10',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

### Phase 7: Monitoring & Analysis

**Context:**
- Level meters update at 10-30Hz (configurable via SetUpdateInterval)
- Peak values in dB (negative, 0 = full scale)
- Frequency response calculated client-side from filter coefficients

**Filter Response Calculation:**

```ts
// lib/dsp/filterResponse.ts

export interface FrequencyPoint {
  frequency: number;
  magnitude: number;  // dB
  phase: number;      // degrees
}

// Calculate biquad filter frequency response
export function calculateBiquadResponse(
  params: BiquadParameters,
  sampleRate: number,
  frequencies: number[]
): FrequencyPoint[] {
  const { b0, b1, b2, a1, a2 } = getBiquadCoefficients(params, sampleRate);

  return frequencies.map((freq) => {
    const omega = (2 * Math.PI * freq) / sampleRate;
    const cosW = Math.cos(omega);
    const sinW = Math.sin(omega);
    const cos2W = Math.cos(2 * omega);
    const sin2W = Math.sin(2 * omega);

    // Numerator: b0 + b1*z^-1 + b2*z^-2
    const numReal = b0 + b1 * cosW + b2 * cos2W;
    const numImag = -(b1 * sinW + b2 * sin2W);

    // Denominator: 1 + a1*z^-1 + a2*z^-2
    const denReal = 1 + a1 * cosW + a2 * cos2W;
    const denImag = -(a1 * sinW + a2 * sin2W);

    // H(z) = num / den
    const denMagSq = denReal * denReal + denImag * denImag;
    const hReal = (numReal * denReal + numImag * denImag) / denMagSq;
    const hImag = (numImag * denReal - numReal * denImag) / denMagSq;

    const magnitude = 20 * Math.log10(Math.sqrt(hReal * hReal + hImag * hImag));
    const phase = (Math.atan2(hImag, hReal) * 180) / Math.PI;

    return { frequency: freq, magnitude, phase };
  });
}

// Generate logarithmic frequency scale
export function generateFrequencyScale(
  minFreq: number = 20,
  maxFreq: number = 20000,
  points: number = 256
): number[] {
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const step = (logMax - logMin) / (points - 1);

  return Array.from(
    { length: points },
    (_, i) => Math.pow(10, logMin + i * step)
  );
}
```

**Level Meter Component:**

```tsx
// components/monitoring/LevelMeter.tsx
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface LevelMeterProps {
  peak: number;      // dB, 0 = full scale, negative values
  rms: number;       // dB
  peakHold?: number; // dB
  clipping?: boolean;
  orientation?: 'horizontal' | 'vertical';
  showScale?: boolean;
}

const DB_MARKS = [-60, -48, -36, -24, -12, -6, -3, 0];

export const LevelMeter = memo(function LevelMeter({
  peak,
  rms,
  peakHold,
  clipping = false,
  orientation = 'vertical',
  showScale = true,
}: LevelMeterProps) {
  // Convert dB to percentage (0dB = 100%, -60dB = 0%)
  const dbToPercent = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));

  const peakPercent = dbToPercent(peak);
  const rmsPercent = dbToPercent(rms);
  const peakHoldPercent = peakHold !== undefined ? dbToPercent(peakHold) : undefined;

  const isVertical = orientation === 'vertical';

  // Determine meter color based on level
  const meterColor = useMemo(() => {
    if (clipping || peak > -0.1) return 'bg-dsp-meter-red';
    if (peak > -6) return 'bg-dsp-meter-yellow';
    return 'bg-dsp-meter-green';
  }, [clipping, peak]);

  return (
    <div
      className={cn(
        'relative bg-black/50 rounded overflow-hidden',
        isVertical ? 'w-6 h-full min-h-[200px]' : 'h-6 w-full min-w-[200px]'
      )}
    >
      {/* RMS bar (wider, behind) */}
      <div
        className={cn(
          'absolute bg-dsp-meter-green/50 transition-all duration-75',
          isVertical ? 'bottom-0 left-1 right-1' : 'left-0 top-1 bottom-1'
        )}
        style={{
          [isVertical ? 'height' : 'width']: `${rmsPercent}%`,
        }}
      />

      {/* Peak bar (narrower, front) */}
      <div
        className={cn(
          'absolute transition-all duration-[50ms]',
          meterColor,
          isVertical ? 'bottom-0 left-2 right-2' : 'left-0 top-2 bottom-2'
        )}
        style={{
          [isVertical ? 'height' : 'width']: `${peakPercent}%`,
        }}
      />

      {/* Peak hold indicator */}
      {peakHoldPercent !== undefined && (
        <div
          className={cn(
            'absolute bg-white',
            isVertical ? 'left-0 right-0 h-0.5' : 'top-0 bottom-0 w-0.5'
          )}
          style={{
            [isVertical ? 'bottom' : 'left']: `${peakHoldPercent}%`,
          }}
        />
      )}

      {/* Clipping indicator */}
      {clipping && (
        <div
          className={cn(
            'absolute bg-red-500 animate-pulse',
            isVertical ? 'top-0 left-0 right-0 h-2' : 'right-0 top-0 bottom-0 w-2'
          )}
        />
      )}

      {/* Scale marks */}
      {showScale && DB_MARKS.map((db) => (
        <div
          key={db}
          className={cn(
            'absolute text-[8px] text-gray-400',
            isVertical ? 'right-full mr-1' : 'top-full mt-1'
          )}
          style={{
            [isVertical ? 'bottom' : 'left']: `${dbToPercent(db)}%`,
            transform: isVertical ? 'translateY(50%)' : 'translateX(-50%)',
          }}
        >
          {db}
        </div>
      ))}
    </div>
  );
});
```

### Phase 8: Device Configuration

**Context:**
- Backend-specific options vary significantly
- Use `GetAvailableCaptureDevices`/`GetAvailablePlaybackDevices` for device lists
- Some backends (WASAPI) have multiple modes (exclusive, shared, loopback)

### Phase 9: Configuration Management

**Context:**
- Store configs in localStorage with IndexedDB for larger files
- Version configs with timestamps and optional user notes
- Support import/export of raw YAML files

### Phase 10: Accessibility

**Context:**
- WCAG 2.1 AA compliance target
- All interactive elements keyboard navigable
- Color alone should not convey information (use patterns/icons too)
- Screen reader announcements for dynamic content

**Key Accessibility Patterns:**

```tsx
// Announce dynamic changes to screen readers
import { useEffect, useRef } from 'react';

export function useAnnounce() {
  const regionRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (regionRef.current) {
      regionRef.current.setAttribute('aria-live', priority);
      regionRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const AnnouncerRegion = () => (
    <div
      ref={regionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncerRegion };
}

// Usage: Announce level changes, connection status, etc.
const { announce } = useAnnounce();
announce('Clipping detected on channel 1', 'assertive');
```

---

## Development Workflow

### Getting Started

```bash
# Clone and install
git clone <repo>
cd hoqsdsp
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/<task-id>-<description>` - Feature branches
- `fix/<task-id>-<description>` - Bug fix branches

### Commit Conventions

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: websocket, filters, pipeline, ui, config, etc.

Examples:
feat(filters): add biquad filter editor component
fix(websocket): handle reconnection on network change
docs(readme): update installation instructions
```

### PR Requirements

1. All tests passing
2. No TypeScript errors
3. ESLint clean
4. At least one reviewer approval
5. Linked to task ID in description

---

## Performance Guidelines

### React 19 Best Practices

1. **Use React Compiler** (when stable) for automatic memoization
2. **Avoid unnecessary re-renders:**
   - Use `memo()` for expensive components
   - Extract static content outside components
   - Use proper key props in lists

3. **Optimize WebSocket updates:**
   - Batch state updates
   - Use `startTransition` for non-urgent updates
   - Throttle high-frequency updates (level meters)

```tsx
// Throttle level meter updates to 30fps
import { useCallback, useRef } from 'react';

function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]) as T;
}

// Usage
const updateMeters = useThrottledCallback((levels: SignalLevels) => {
  setLevels(levels);
}, 33); // ~30fps
```

### Bundle Optimization

- Code split by route with lazy loading
- Tree shake unused filter editors
- Preload critical chunks

```tsx
// Lazy load filter editors
const BiquadEditor = lazy(() => import('@/components/filters/BiquadEditor'));
const ConvolutionEditor = lazy(() => import('@/components/filters/ConvolutionEditor'));

// Preload on hover
function FilterPalette() {
  const preloadBiquad = () => {
    import('@/components/filters/BiquadEditor');
  };

  return (
    <button onMouseEnter={preloadBiquad}>
      Add Biquad Filter
    </button>
  );
}
```
