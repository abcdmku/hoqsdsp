# Technical Specification — Unified “Signal Flow” Page

## Technical context

### Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS, Radix UI primitives
- **State**:
  - **Zustand** for client UI state (`src/stores/*`)
  - **TanStack Query** for “server state” (`src/app/providers.tsx`, `src/features/*`)
- **Validation/Parsing**: Zod schemas + YAML/JSON helpers (`src/lib/config/*`)
- **DSP UI**:
  - Multi-band EQ graph editor (`src/components/eq-editor/*`)
  - Filter editors (`src/components/filters/*`)
  - Routing matrix UI for a single mixer (`src/components/routing/*`)

### Existing architecture notes
- Navigation currently mixes **React Router** (`src/app/router.tsx`) and a separate `activeView` in Zustand (`src/stores/uiStore.ts`, `src/components/layout/Sidebar.tsx`). The Sidebar highlights views but does not navigate routes.
- Channel UI (`src/pages/ChannelStrip.tsx`) is currently mock-driven.
- Config + WS hooks exist (`src/features/configuration/*`, `src/features/connection/*`) but aren’t yet wired to a live WebSocket manager.

### CamillaDSP WebSocket protocol (validated against `ws://192.168.4.49:1234`)
- The running DSP reports **CamillaDSP `3.0.0`** (`"GetVersion"`).
- This instance **does not accept** the `{ "command": "…", "id": "…" }` message format.
- Instead, it accepts **Serde-style commands**:
  - Unit variants: JSON string, e.g. `"GetConfigJson"`
  - Payload variants: JSON object with a single key, e.g. `{ "SetConfigJson": "{...}" }`
- Responses are **externally tagged** objects keyed by command name:
  - Example: `{ "GetVersion": { "result": "Ok", "value": "3.0.0" } }`

Implication: `src/lib/websocket/WebSocketManager.ts` and `src/types/websocket.types.ts` must be aligned to CamillaDSP v3 format for this feature to be testable on the provided unit.

## Implementation approach

### High-level design
Add a new page (working name: **Signal Flow**) that combines:
- **Inputs bank** (left): input channels grouped by “device”
- **Outputs bank** (right): output channels grouped by “device”
- **Connections canvas** (center): click/drag to create routes; curved lines styled similarly to the EQ response curve
- **Editor panel** (overlay/drawer): edit either a selected channel’s processing or a selected connection’s parameters

The page operates on the **currently selected CamillaDSP unit** (existing “unit” model from the Dashboard).

### “Device grouping” definition (assumption for this iteration)
Because a single CamillaDSP config typically exposes one capture and one playback device, and multi-device semantics are unclear, the initial implementation will:

- Group **inputs** under a single “device group” label derived from `config.devices.capture.device ?? config.devices.capture.type`.
- Group **outputs** under a single “device group” label derived from `config.devices.playback.device ?? config.devices.playback.type`.

This yields the required grouped-bank UX today, and keeps the model extensible.

Future-proofing:
- Internally represent channels as `{ deviceId, channelIndex }` so we can later support user-defined groups (ranges) or true multi-device configs.

### Signal-flow view model
Introduce a view-model layer in `src/lib/signalflow/*` to isolate UI from CamillaDSP config complexity.

Proposed types:

```ts
export type ChannelSide = 'input' | 'output';

export interface DeviceGroup {
  id: string;        // stable id
  label: string;     // UI label
}

export interface ChannelNode {
  side: ChannelSide;
  deviceId: string;
  channelIndex: number; // 0-based
  label: string;
  processingSummary: {
    biquadCount: number;
    hasDelay: boolean;
    hasGain: boolean;
    hasConv: boolean;
    hasCompressor: boolean;
    hasDither: boolean;
    hasNoiseGate: boolean;
    hasLoudness: boolean;
  };
}

export interface RouteEdge {
  from: { deviceId: string; channelIndex: number };
  to: { deviceId: string; channelIndex: number };
  gain: number;      // dB
  inverted: boolean;
  mute: boolean;
}

export interface SignalFlowModel {
  inputGroups: DeviceGroup[];
  outputGroups: DeviceGroup[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  routes: RouteEdge[];
}
```

### Mapping to CamillaDSP config

#### Routing (mixer mapping)
Map connections to a dedicated routing mixer in `config.mixers`:

- Select or create a canonical mixer name, e.g. `"routing"`.
- Ensure `mixer.channels.in === capture.channels` and `mixer.channels.out === playback.channels`.
- Represent each output destination with one mapping entry:
  - `mapping[].dest = outIndex`
  - `mapping[].sources[] = { channel: inIndex, gain, inverted, mute }`

This matches the PRD’s “per-connection settings” requirement.

#### Channel processing (filters + pipeline)
To keep the “signal flow” mental model consistent and allow deterministic edits, adopt a **canonical pipeline layout** for configs managed by this page:

1. **Input-stage filters** (optional)
2. **Routing mixer** (`routing`)
3. **Output-stage filters** (optional)

Rules:
- Input-stage filters are filter steps whose `channel` refers to capture channel indices and appear **before** the routing mixer step.
- Output-stage filters are filter steps whose `channel` refers to playback channel indices and appear **after** the routing mixer step.

If an incoming config can’t be cleanly represented in this model (e.g., multiple mixers interleaved, channel-count changes mid-pipeline):
- Load what we can.
- Show a warning banner: “This config isn’t representable in Signal Flow mode.”
- Disable edits or provide an explicit “Normalize to Signal Flow” action (deferred unless needed for MVP).

#### Filter coverage by side
- **Input channels**: allow the full filter registry except those explicitly marked output-only in UI (initially: allow `Gain`, `Delay`, `Biquad`, `DiffEq`, `Volume` if present).
- **Output channels**: allow all supported filter types including `Conv`, `Compressor`, `Dither`, `NoiseGate`, `Loudness`.

Enforcement is a UI constraint; the underlying config format remains the same.

#### PEQ representation
- PEQ is represented as a set of **Biquad filters**.
- The EQ graph editor (`src/components/eq-editor/*`) edits a list of “bands” that correspond 1:1 with Biquad filters.
- Highpass/notch/etc remain **Biquad types**, edited in the same EQ UI.

### Live updates + safety

Edits are applied by sending full config updates:
- Validate config with `validateConfig` before sending.
- Use `SetConfigJson` to apply.

To avoid flooding the DSP while dragging sliders/nodes:
- Apply immediately for discrete actions (add/remove connection, toggle invert/mute).
- Debounce high-frequency actions (gain slider drag, EQ node drag) and/or only commit on drag-end.

### WebSocket + unit integration

Introduce a unit-scoped connection layer that creates a WebSocket manager per unit and exposes it to query hooks.

Key changes:
- Update `WebSocketManager` to match CamillaDSP v3 message/response formats.
- Provide a small “manager registry” keyed by `unitId` (Zustand or module singleton) so pages can reuse connections.
- Wire existing hooks:
  - `useConfigJson`, `useSetConfigJson`
  - `useVersion`, `useProcessingState`

## UI composition

### Page layout
New page route: `/signal-flow`.

Layout (CSS grid/flex):
- Left column: Inputs (device groups + channel cards)
- Center column: SVG canvas overlay for connection lines
- Right column: Outputs (device groups + channel cards)

### Interaction model

#### Create a connection
- Pointer down on an input channel’s “port” starts a drag.
- Pointer move renders a temporary bezier path in the center SVG.
- Pointer up on an output channel’s “port” creates a `RouteEdge`.

#### Select/edit a connection
- Click a connection path to select it.
- Show a compact editor (drawer or floating panel) with:
  - gain (dB)
  - invert
  - mute
  - delete

#### Select/edit a channel
- Click a channel card to open a channel editor panel.
- The panel includes:
  - PEQ graph (multi-band biquad editor)
  - Additional filters list (reuse existing filter editor components)

### Rendering connection lines
- Use a single `<svg>` that spans the center region.
- Compute endpoints from DOM element bounding boxes (via refs + `ResizeObserver`).
- Render smooth cubic bezier paths styled similarly to `EQCanvas`’ response curve.
- Add an invisible “hit area” stroke for easier selection.

## Source code structure changes

### New files/folders
- `src/pages/SignalFlow.tsx` (main page)
- `src/components/signal-flow/*`
  - `ChannelBank.tsx` (grouped list)
  - `ChannelCard.tsx` (compact card + ports)
  - `ConnectionsCanvas.tsx` (SVG paths + drag preview)
  - `ConnectionEditor.tsx`
  - `ChannelEditorDrawer.tsx`
- `src/lib/signalflow/*`
  - `model.ts` (view-model types)
  - `fromConfig.ts` (CamillaConfig -> SignalFlowModel)
  - `toConfig.ts` (apply model/patch -> CamillaConfig)
  - `normalize.ts` (optional canonicalization helpers)

### Modified files (expected)
- `src/app/router.tsx`: add `/signal-flow` route and replace placeholders if desired.
- `src/components/layout/Sidebar.tsx`: add nav item and make it navigate (use `useNavigate` or `NavLink`) while keeping `activeView` in sync (or derive active view from route).
- `src/types/ui.types.ts`: add new `ViewType` for signal flow (if keeping `activeView`).
- `src/lib/websocket/WebSocketManager.ts` + `src/types/websocket.types.ts`: update protocol for CamillaDSP v3.

## Delivery phases (incremental milestones)

1. **WebSocket v3 alignment**: update manager + tests; verify `GetVersion`, `GetConfigJson`, `SetConfigJson` against `ws://192.168.4.49:1234`.
2. **Config state wiring**: instantiate manager per unit; hook up `useConfigJson`/`useSetConfigJson`.
3. **SignalFlow model mapping**: implement `fromConfig`/`toConfig` with unit tests.
4. **Signal Flow page skeleton**: banks + selection + empty states.
5. **Routing UX**: drag-to-connect + editable connections; update mixer mapping + push config.
6. **Channel processing UX**: channel editor drawer with PEQ + filters; update pipeline/filters + push config.
7. **Polish**: performance tuning, keyboard accessibility, warnings for non-representable configs.

## Verification approach

### Automated
- `npm run lint`
- `npm run typecheck`
- `npm test`

Add new tests where logic is pure:
- `src/lib/signalflow/*.test.ts` for mapping and normalization.

### Manual (target DSP)
- Connect to `ws://192.168.4.49:1234`.
- Verify:
  - Creating/removing connections changes mixer mapping.
  - Adjusting connection gain/invert/mute is reflected in `GetConfigJson` and audible behavior.
  - Editing PEQ updates `filters` and `pipeline` correctly.

## Open questions (to confirm before full implementation)

1. Does “device grouping” mean capture/playback device names, channel ranges, or something else?
2. Should the Signal Flow page replace `/channels`, `/eq`, `/routing` routes (or coexist)?
3. Preferred processing UX: fixed-order “sections” vs reorderable filter chain per channel?

