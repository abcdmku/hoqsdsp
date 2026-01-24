# Technical Specification: CamillaDSP Frontend

## 1. Technical Context

### 1.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.x |
| Language | TypeScript | 5.7+ |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Components | Radix UI | latest |
| Server State | TanStack Query | 5.x |
| Client State | Zustand | 5.x |
| Forms | TanStack Form | 1.x |
| Validation | Zod | 3.x |
| Icons | Lucide React | latest |
| Testing | Vitest 3, React Testing Library 16, MSW 2 | - |
| Package Manager | npm | latest |

### 1.2 Runtime Environment

- **Target**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- **Minimum viewport**: 768px width (tablet/desktop)
- **Protocol**: WebSocket (ws://) for CamillaDSP communication
- **Default port**: 1234 (configurable per unit)

### 1.3 External Dependencies

- **CamillaDSP**: Audio processing backend accessible via WebSocket
- **CamillaDSP WebSocket API**: JSON-based command/response protocol
- Reference: https://github.com/HEnquist/camilladsp/blob/master/websocket.md

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Application                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Views     │  │ Components  │  │      Features           │  │
│  │ Dashboard   │  │ UI/Layout   │  │ Connection/Config/RT    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐  │
│  │                    State Management                         │  │
│  │         Zustand (UI) + TanStack Query (Server)             │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────┴───────────────────────────────────┐  │
│  │                    Library Layer                             │  │
│  │  WebSocket Manager │ DSP Calculations │ Filter Handlers     │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  CamillaDSP     │
                    │  (WebSocket)    │
                    └─────────────────┘
```

### 2.2 Directory Structure

```
src/
├── app/                      # Application shell and providers
│   ├── App.tsx              # Root component with layout
│   ├── providers.tsx        # Context providers (Query, Theme)
│   ├── router.tsx           # React Router configuration
│   └── main.tsx             # Entry point
│
├── components/
│   ├── ui/                  # Reusable UI primitives
│   │   ├── Button.tsx       # CVA-based button variants
│   │   ├── Dialog.tsx       # Radix Dialog wrapper
│   │   ├── Slider.tsx       # Radix Slider wrapper
│   │   ├── Select.tsx       # Radix Select wrapper
│   │   ├── NumericInput.tsx # Number input with validation
│   │   ├── FrequencyInput.tsx # Logarithmic frequency slider
│   │   └── index.ts         # Barrel export
│   │
│   ├── layout/              # Application shell components
│   │   ├── TopNav.tsx       # Header with unit selector
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── StatusBar.tsx    # Footer with connection status
│   │   └── index.ts
│   │
│   ├── channel-strip/       # Channel processing view
│   │   ├── ChannelStrip.tsx
│   │   ├── ProcessingBlock.tsx
│   │   ├── ChannelMeter.tsx
│   │   └── index.ts
│   │
│   ├── eq-editor/           # Interactive EQ editor
│   │   ├── EQEditor.tsx
│   │   ├── EQCanvas.tsx
│   │   ├── EQNode.tsx
│   │   ├── BandSelector.tsx
│   │   ├── BandParameters.tsx
│   │   └── index.ts
│   │
│   ├── routing/             # Routing matrix
│   │   ├── RoutingMatrix.tsx
│   │   ├── CrosspointCell.tsx
│   │   ├── CrosspointEditor.tsx
│   │   └── index.ts
│   │
│   ├── filters/             # Filter editor modals
│   │   ├── FilterEditorModal.tsx
│   │   ├── BiquadEditor.tsx
│   │   ├── ConvolutionEditor.tsx
│   │   ├── DelayEditor.tsx
│   │   ├── GainEditor.tsx
│   │   ├── CompressorEditor.tsx
│   │   └── index.ts
│   │
│   └── monitoring/          # Level meters and metrics
│       ├── LevelMeter.tsx
│       ├── MiniMeter.tsx
│       ├── ProcessingMetrics.tsx
│       ├── FrequencyResponse.tsx
│       └── index.ts
│
├── features/
│   ├── connection/          # WebSocket connection logic
│   │   ├── useConnection.ts
│   │   ├── useUnitConnections.ts
│   │   └── connectionQueries.ts
│   │
│   ├── configuration/       # Config management
│   │   ├── useConfig.ts
│   │   ├── configQueries.ts
│   │   └── configMutations.ts
│   │
│   ├── devices/             # Device/unit management
│   │   ├── useUnits.ts
│   │   └── unitQueries.ts
│   │
│   └── realtime/            # Real-time data subscriptions
│       ├── useLevels.ts
│       ├── useProcessingLoad.ts
│       └── realtimeSubscriptions.ts
│
├── hooks/                   # Shared custom hooks
│   ├── useDebounce.ts
│   ├── useKeyboardShortcuts.ts
│   ├── usePrevious.ts
│   └── index.ts
│
├── lib/
│   ├── websocket/           # WebSocket management
│   │   ├── WebSocketManager.ts
│   │   ├── ReconnectionStrategy.ts
│   │   ├── MessageQueue.ts
│   │   └── index.ts
│   │
│   ├── dsp/                 # DSP calculations
│   │   ├── biquad.ts        # Biquad coefficient calculation
│   │   ├── response.ts      # Frequency response calculation
│   │   └── index.ts
│   │
│   ├── filters/             # Filter handlers
│   │   ├── types.ts         # FilterHandler interface
│   │   ├── biquad.ts
│   │   ├── convolution.ts
│   │   ├── delay.ts
│   │   ├── gain.ts
│   │   ├── compressor.ts
│   │   └── index.ts
│   │
│   └── utils/               # General utilities
│       ├── cn.ts            # clsx + tailwind-merge
│       ├── format.ts        # Number/frequency formatting
│       └── index.ts
│
├── stores/                  # Zustand stores
│   ├── connectionStore.ts   # Connection state
│   ├── unitStore.ts         # Unit list (persisted)
│   ├── uiStore.ts           # UI state (sidebar, modals)
│   └── index.ts
│
├── types/                   # TypeScript type definitions
│   ├── camilla.types.ts     # CamillaDSP configuration types
│   ├── websocket.types.ts   # WebSocket message types
│   ├── filters.types.ts     # Filter parameter types
│   ├── ui.types.ts          # UI state types
│   └── index.ts
│
├── styles/                  # Global styles
│   └── globals.css          # Tailwind directives + custom styles
│
└── test/                    # Test utilities
    ├── setup.ts             # Vitest setup
    ├── mocks/
    │   ├── MockWebSocket.ts
    │   └── handlers.ts      # MSW handlers
    └── utils.tsx            # Test render utilities
```

---

## 3. Implementation Approach

### 3.1 WebSocket Communication Layer

#### WebSocketManager Class

```typescript
// src/lib/websocket/WebSocketManager.ts
export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private reconnection: ReconnectionStrategy;
  private messageQueue: MessageQueue;

  // Core methods
  connect(): Promise<void>
  disconnect(): void
  send<T>(command: WSCommand): Promise<T>

  // Events emitted
  // 'connected' | 'disconnected' | 'error' | 'stateChange'
}
```

**Key patterns:**
- Request/response correlation via unique IDs
- Exponential backoff with jitter for reconnection
- Message queue with priority levels (high/normal/low)
- Timeout handling (5s default)
- Clean cleanup of pending requests on disconnect

#### Protocol Implementation

Commands are sent as JSON:
- No-argument: `"GetVersion"`
- With arguments: `{"SetVolume": -10.0}`

Responses:
```json
{"result": "Ok", "value": <data>}
{"result": "Error", "value": "Error message"}
```

### 3.2 State Management Strategy

#### Zustand Stores (Client State)

| Store | Purpose | Persisted |
|-------|---------|-----------|
| `connectionStore` | WebSocket connection status per unit | No |
| `unitStore` | List of configured units | Yes (localStorage) |
| `uiStore` | UI state (sidebar, selected items, modals) | No |

#### TanStack Query (Server State)

| Query Key | Data | Stale Time |
|-----------|------|------------|
| `['config', unitId]` | CamillaDSP configuration | 5000ms |
| `['levels', unitId]` | Signal levels (real-time) | 0ms |
| `['processingLoad', unitId]` | CPU load | 1000ms |
| `['bufferLevel', unitId]` | Buffer fill | 1000ms |

### 3.3 Filter System Architecture

#### FilterHandler Interface

```typescript
interface FilterHandler<T extends FilterConfig> {
  parse(yaml: unknown): T;
  serialize(config: T): Record<string, unknown>;
  validate(config: T): ValidationResult;
  getDefault(): T;
  getDisplayName(config: T): string;
}
```

#### Supported Filter Types

| Type | Handler | Zod Schema |
|------|---------|------------|
| Biquad | `biquadHandler` | Discriminated union by subtype |
| Conv | `convolutionHandler` | File/Values variants |
| Delay | `delayHandler` | ms/samples/mm units |
| Gain | `gainHandler` | dB/linear scale |
| Volume | `volumeHandler` | Fader linking |
| Dither | `ditherHandler` | Type variants |
| DiffEq | `diffEqHandler` | Coefficient arrays |
| Compressor | `compressorHandler` | Dynamics params |
| Loudness | `loudnessHandler` | Reference level |
| NoiseGate | `noiseGateHandler` | Threshold/timing |

### 3.4 DSP Calculations

#### Biquad Response Calculation

```typescript
function calculateBiquadResponse(
  band: EQBand,
  freq: number,
  sampleRate: number
): number // Returns dB
```

Uses bilinear transform coefficients based on filter type. Must complete in <16ms for smooth UI.

#### Composite Response

Sum individual filter responses (in dB) for 512 points across 20Hz-20kHz logarithmic scale.

### 3.5 Component Patterns

#### CVA for Variants

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: { default: "...", secondary: "...", outline: "..." },
      size: { default: "h-10 px-4", sm: "h-8 px-3", lg: "h-12 px-6" }
    }
  }
);
```

#### Radix UI Composition

Wrap Radix primitives with project styling:
- `Dialog` → `DialogPrimitive` + DSP theme styles
- `Select` → `SelectPrimitive` + custom trigger/content
- `Slider` → `SliderPrimitive` + DSP colors

---

## 4. Data Models

### 4.1 CamillaDSP Configuration

```typescript
interface CamillaConfig {
  devices: DevicesConfig;
  mixers?: Record<string, MixerConfig>;
  filters?: Record<string, FilterConfig>;
  pipeline: PipelineStep[];
  title?: string;
  description?: string;
}

interface DevicesConfig {
  samplerate: number;
  chunksize: number;
  capture: CaptureDevice;
  playback: PlaybackDevice;
  // ... additional options
}
```

### 4.2 Mixer Configuration

```typescript
interface MixerConfig {
  channels: { in: number; out: number };
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

### 4.3 Filter Types (Discriminated Union)

```typescript
type FilterConfig =
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

interface BiquadFilter {
  type: 'Biquad';
  parameters: BiquadParameters;
}

// ... other filter interfaces
```

### 4.4 UI State Types

```typescript
interface DSPUnit {
  id: string;
  name: string;
  address: string;
  port: number;
  status: ConnectionStatus;
  version?: string;
  lastSeen?: number;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
```

---

## 5. API/Interface Changes

### 5.1 WebSocket Commands Used

| Command | Arguments | Response |
|---------|-----------|----------|
| `GetVersion` | - | string |
| `GetState` | - | ProcessingState |
| `GetConfig` | - | YAML string |
| `GetConfigJson` | - | JSON string |
| `SetConfig` | YAML string | void |
| `SetConfigJson` | JSON string | void |
| `GetVolume` | - | number |
| `SetVolume` | number | void |
| `GetMute` | - | boolean |
| `SetMute` | boolean | void |
| `GetSignalLevels` | - | SignalLevels |
| `GetProcessingLoad` | - | number |
| `GetBufferLevel` | - | number |
| `GetFaderVolume` | index | number |
| `SetFaderVolume` | {fader, vol} | void |

### 5.2 Internal Events

```typescript
// WebSocketManager events
type WSEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'stateChange'
  | 'message';
```

---

## 6. Delivery Phases

### Phase 1: Foundation & Infrastructure (P0)

**Goal**: Bootstrapped project with core infrastructure ready.

| Task | Description | Output |
|------|-------------|--------|
| 1.1.1 | Initialize Vite + React + TypeScript | Working dev server |
| 1.1.2 | ESLint 9 flat config + Prettier | Linting passes |
| 1.1.3 | Vitest + RTL + MSW setup | Test infrastructure |
| 1.1.4 | TypeScript strict config | tsconfig.json |
| 1.1.5 | Tailwind CSS 4 + DSP theme | Custom colors working |
| 1.1.6 | Project folder structure | All directories created |
| 1.2.1 | CamillaDSP config types | camilla.types.ts |
| 1.2.2 | WebSocket message types | websocket.types.ts |
| 1.2.3 | UI state types | ui.types.ts |
| 1.2.4 | Filter parameter types | filters.types.ts |

**Verification**: `npm run typecheck && npm run lint && npm test`

### Phase 2: Core UI & State (P1)

**Goal**: Application shell with state management working.

| Task | Description | Output |
|------|-------------|--------|
| 2.1.1 | WebSocketManager class | lib/websocket/ |
| 2.1.2 | ReconnectionStrategy | Exponential backoff |
| 2.1.3 | MessageQueue | Priority queue |
| 2.2.1 | Connection store (Zustand) | stores/connectionStore.ts |
| 2.2.2 | Unit store (persisted) | stores/unitStore.ts |
| 2.2.3 | UI store | stores/uiStore.ts |
| 2.3.1 | TanStack Query setup | providers.tsx |
| 2.3.2 | Config queries | features/configuration/ |
| 2.4.1 | App shell component | app/App.tsx |
| 2.4.2 | TopNav component | components/layout/ |
| 2.4.3 | Sidebar component | components/layout/ |
| 2.4.4 | StatusBar component | components/layout/ |
| 2.5.1 | Button component (CVA) | components/ui/ |
| 2.5.2 | Dialog component | components/ui/ |
| 2.5.3 | Slider component | components/ui/ |
| 2.5.4 | Select component | components/ui/ |

**Verification**: UI renders, state updates work, WebSocket connects to mock

### Phase 3: Filter System (P2)

**Goal**: Complete filter handling with validation.

| Task | Description | Output |
|------|-------------|--------|
| 3.1.1 | FilterHandler interface | lib/filters/types.ts |
| 3.1.2 | Biquad handler + schema | lib/filters/biquad.ts |
| 3.1.3 | Convolution handler | lib/filters/convolution.ts |
| 3.1.4 | Delay handler | lib/filters/delay.ts |
| 3.1.5 | Gain handler | lib/filters/gain.ts |
| 3.1.6 | Other filter handlers | lib/filters/*.ts |
| 3.2.1 | Biquad response calc | lib/dsp/biquad.ts |
| 3.2.2 | Composite response calc | lib/dsp/response.ts |
| 3.3.1 | NumericInput component | components/ui/ |
| 3.3.2 | FrequencyInput component | components/ui/ |
| 3.3.3 | GainInput component | components/ui/ |

**Verification**: All filters parse/validate correctly, response calculation accurate

### Phase 4: Main Views (P3)

**Goal**: All primary views functional.

| Task | Description | Output |
|------|-------------|--------|
| 4.1.1 | Network Dashboard | Dashboard page |
| 4.1.2 | UnitCard component | Unit display with meters |
| 4.1.3 | AddUnitDialog | Form with validation |
| 4.2.1 | Channel Strip view | Channel list display |
| 4.2.2 | ProcessingBlock component | Filter indicators |
| 4.2.3 | Channel context menu | Copy/paste/bypass |
| 4.3.1 | EQ Editor canvas | SVG frequency graph |
| 4.3.2 | EQ Node interaction | Drag/scroll handlers |
| 4.3.3 | BandSelector | Band buttons |
| 4.3.4 | BandParameters | Parameter sliders |
| 4.4.1 | Routing Matrix grid | Input/output crosspoints |
| 4.4.2 | CrosspointCell | Click/toggle handling |
| 4.4.3 | CrosspointEditor | Gain/phase/mute panel |
| 4.5.1 | FilterEditorModal base | Modal layout |
| 4.5.2 | BiquadEditor | Type-specific controls |
| 4.5.3 | Other filter editors | All filter types |

**Verification**: All views render, interactions work, data persists

### Phase 5: Monitoring & Polish (P4)

**Goal**: Real-time monitoring, accessibility, testing complete.

| Task | Description | Output |
|------|-------------|--------|
| 5.1.1 | LevelMeter component | Peak/RMS display |
| 5.1.2 | MiniMeter component | Compact meters |
| 5.1.3 | ProcessingMetrics | CPU/buffer display |
| 5.1.4 | ClippingIndicator | Red flash on clip |
| 5.2.1 | Real-time level hook | useLevels() |
| 5.2.2 | Processing load hook | useProcessingLoad() |
| 5.3.1 | Keyboard shortcuts | useKeyboardShortcuts() |
| 5.3.2 | Focus management | Modal focus trap |
| 5.3.3 | ARIA labels | All controls labeled |
| 5.4.1 | Unit tests for DSP | lib/dsp/ tests |
| 5.4.2 | Unit tests for handlers | lib/filters/ tests |
| 5.4.3 | Component tests | RTL tests |
| 5.5.1 | Config import/export | File handling |
| 5.5.2 | Error boundaries | Error UI |
| 5.5.3 | Loading states | Skeleton UI |

**Verification**: Full test suite passes, accessibility audit passes

---

## 7. Verification Approach

### 7.1 Linting & Type Checking

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src/
```

**Requirements:**
- No TypeScript errors in strict mode
- No ESLint errors (warnings allowed in development)
- No `any` types except explicit library boundaries

### 7.2 Unit Tests

```bash
npm test           # vitest
npm run test:coverage
```

**Coverage targets:**
- `lib/dsp/`: 100% (critical calculations)
- `lib/filters/`: 100% (parsing/validation)
- `lib/websocket/`: 90%+ (edge cases)
- `components/`: 80%+ (user interactions)

### 7.3 Integration Tests

- MSW for WebSocket mocking
- Test connection lifecycle
- Test config load/save flow
- Test real-time data updates

### 7.4 Accessibility Testing

- Keyboard navigation through all views
- Screen reader testing (VoiceOver/NVDA)
- Color contrast verification (4.5:1 minimum)
- Focus indicators visible

### 7.5 Performance Benchmarks

| Metric | Target |
|--------|--------|
| Level meter updates | 60fps |
| EQ response calculation | <16ms |
| Initial load | <2s |
| Bundle size (gzipped) | <200KB |

---

## 8. Risk Mitigation

### 8.1 WebSocket Reliability

**Risk**: Connection instability on poor networks.

**Mitigation**:
- Exponential backoff with jitter
- Message queue for offline buffering
- Optimistic UI updates with rollback
- Connection status prominently displayed

### 8.2 Performance

**Risk**: UI jank during real-time updates.

**Mitigation**:
- `React.memo` for meter components
- `useMemo` for expensive calculations
- `requestAnimationFrame` for animations
- Debounced parameter updates

### 8.3 Browser Compatibility

**Risk**: API differences across browsers.

**Mitigation**:
- Stick to well-supported Web APIs
- Polyfill only if necessary
- Test on all target browsers
- Use Radix UI for cross-browser accessibility

---

## 9. Dependencies

### 9.1 Production Dependencies

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^7.0.0",
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-form": "^1.0.0",
  "zustand": "^5.0.0",
  "zod": "^3.23.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "@radix-ui/react-select": "^2.1.0",
  "@radix-ui/react-slider": "^1.2.0",
  "@radix-ui/react-switch": "^1.1.0",
  "@radix-ui/react-tooltip": "^1.1.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.5.0",
  "class-variance-authority": "^0.7.0",
  "lucide-react": "^0.460.0",
  "eventemitter3": "^5.0.0",
  "sonner": "^1.7.0"
}
```

### 9.2 Development Dependencies

```json
{
  "vite": "^7.0.0",
  "@vitejs/plugin-react": "^4.3.0",
  "typescript": "^5.7.0",
  "tailwindcss": "^4.0.0",
  "@tailwindcss/vite": "^4.0.0",
  "eslint": "^9.16.0",
  "@eslint/js": "^9.16.0",
  "typescript-eslint": "^8.18.0",
  "eslint-plugin-react-hooks": "^5.0.0",
  "prettier": "^3.4.0",
  "vitest": "^3.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/user-event": "^14.5.0",
  "jsdom": "^25.0.0",
  "msw": "^2.6.0"
}
```

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Biquad** | Second-order IIR filter with 5 coefficients (b0, b1, b2, a1, a2) |
| **CamillaDSP** | Open-source audio processing software for Linux |
| **Crosspoint** | Intersection of input and output in a routing matrix |
| **FIR** | Finite Impulse Response filter (convolution) |
| **Q Factor** | Quality factor - bandwidth/selectivity of a filter |
| **Sample Rate** | Number of audio samples per second (e.g., 48000 Hz) |
| **WebSocket** | Full-duplex communication protocol over TCP |
