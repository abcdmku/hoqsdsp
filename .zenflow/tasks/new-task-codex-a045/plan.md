# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 43f1b667-9e87-4190-9d43-5c6666f4b303 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 6489cd7c-e8ed-41cc-9af5-4cf2aabff76c -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 83747bd4-e26a-4dc3-b7cb-61904f994986 -->

Implementation plan created from `{@artifacts_path}/spec.md`.

Assumptions (MVP):
- “Device grouping” is derived from `config.devices.capture` for inputs and `config.devices.playback` for outputs.
- All edits emit a full updated config via `SetConfigJson` after running `validateConfig` (`src/lib/config/validation.ts`).
- Routing is represented via a canonical mixer (name: `routing`) in `config.mixers`.

### [x] Step: Baseline & Guardrails
<!-- chat-id: c0715d90-47b0-454d-bf56-d02d099756e8 -->

- Confirm `.gitignore` includes generated paths (already includes `node_modules`, `dist`, `build`, `.cache`, `*.log`).
- Install dependencies: `npm ci` (or `npm install`).
- Record baseline results:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:run`

Baseline notes:
- `.gitignore` verified (includes `node_modules/`, `dist/`, `build/`, `.cache/`, `*.log`).
- `npm ci`: success.
- `npm run lint`: fails (15 errors, 70 warnings).
- `npm run typecheck`: success.
- `npm run test:run`: success (60 files, 1126 tests).

### [x] Step: WebSocket v3 Protocol Alignment
<!-- chat-id: f3a3bfda-ac3c-4341-a100-d6f0687cfe99 -->

Contract (CamillaDSP v3.0.0 on `ws://192.168.4.49:1234`):
- Unit commands are sent as JSON strings (e.g. `"GetConfigJson"`).
- Payload commands are sent as single-key JSON objects (e.g. `{ "SetConfigJson": "{...}" }`).
- Responses are externally-tagged objects keyed by command name.

Tasks:
- Update `src/lib/websocket/WebSocketManager.ts` message encode/decode to match the contract.
- Align `src/types/websocket.types.ts` and any helpers as needed.
- Update/extend existing tests:
  - `src/lib/websocket/WebSocketManager.test.ts`
  - `src/lib/websocket/index.test.ts`

Verification:
- `npm run test:run -- src/lib/websocket`
- Manual smoke: connect to `ws://192.168.4.49:1234` and verify `GetVersion`, `GetConfigJson`, `SetConfigJson`.

### [x] Step: Unit-Scoped Connection Wiring
<!-- chat-id: 4019e68f-cc60-48e7-a020-5d9be64a25f8 -->

Tasks:
- Implement a per-unit WebSocketManager registry (store or module singleton) keyed by `unitId`.
- Drive connection status/version into `src/stores/connectionStore.ts`.
- Wire query/mutation hooks to the real manager:
  - `src/features/connection/connectionQueries.ts`
  - `src/features/configuration/configQueries.ts`
  - `src/features/configuration/configMutations.ts`

Verification:
- `npm run test:run -- src/stores`
- `npm run dev` and confirm a configured unit can connect.

### [x] Step: Signal Flow Model & Mapping Layer
<!-- chat-id: eb66cd7e-1766-4605-aba5-074fd82d3013 -->

Tasks:
- Add `src/lib/signalflow/`:
  - `src/lib/signalflow/model.ts`
  - `src/lib/signalflow/fromConfig.ts`
  - `src/lib/signalflow/toConfig.ts`
  - `src/lib/signalflow/normalize.ts` (optional helper)
- Implement `fromConfig` (CamillaConfig → SignalFlowModel):
  - Derive device group labels from `config.devices.capture.*` and `config.devices.playback.*`.
  - Derive input/output channel nodes from capture/playback channel counts.
  - Extract routes from the canonical routing mixer.
- Implement `toConfig` patches:
  - Create/update the canonical `routing` mixer mapping.
  - Enforce (or detect) canonical pipeline layout: input-stage filters → routing mixer → output-stage filters.
  - Detect non-representable configs and surface a warning flag for the UI.
- Add unit tests for mapping/patching:
  - `src/lib/signalflow/*.test.ts`

Verification:
- `npm run test:run -- src/lib/signalflow`

### [x] Step: Signal Flow Page Skeleton & Navigation
<!-- chat-id: d67e0ba7-e79f-43ce-8e0b-fbe90355ed86 -->

Tasks:
- Add route: `src/app/router.tsx` → `/signal-flow`.
- Add page: `src/pages/SignalFlow.tsx`.
- Add components scaffold: `src/components/signal-flow/*`:
  - `ChannelBank.tsx`, `ChannelCard.tsx` (grouped banks)
  - `ConnectionsCanvas.tsx` (empty-state canvas for now)
- Update `src/components/layout/Sidebar.tsx` to navigate via React Router (and add “Signal Flow”).
  - Decide whether `activeView` remains necessary (`src/stores/uiStore.ts`, `src/types/ui.types.ts`).
- Fetch config for active unit via `useConfigJson`, map to model via `fromConfig`, render banks.

Verification:
- `npm run typecheck`
- `npm run dev` and load `/signal-flow`.

### [x] Step: Routing Canvas (Drag-to-Connect)
<!-- chat-id: 8d947b13-7b9f-4d5c-abf4-b0ac2c5bdb9e -->

Tasks:
- Implement interactive routing canvas:
  - Pointer drag from input port → output port creates a `RouteEdge`.
  - Render bezier paths styled similarly to `src/components/eq-editor/EQCanvas.tsx`.
  - Compute port positions via refs + `ResizeObserver`.
- Implement selection + connection editor:
  - `ConnectionEditor.tsx`: gain, invert, mute, delete.
- Apply route edits by patching config via `toConfig` and sending `SetConfigJson`.
- Debounce high-frequency updates (gain slider drag).

Verification:
- Manual (DSP): create/delete routes; change gain/invert/mute; confirm via `GetConfigJson` + audible behavior.

### [x] Step: Channel Processing Editor (Inputs & Outputs)
<!-- chat-id: 8fb0fb38-1098-4027-8478-fca51c925cfa -->

Tasks:
- Add channel editor drawer/panel: `ChannelEditorDrawer.tsx`.
- Reuse existing editors:
  - PEQ graph: `src/components/eq-editor/EQEditor.tsx` (Biquad-only representation).
  - Filter editors: `src/components/filters/*` (Gain/Delay/Biquad/DiffEq/Volume/Conv/Compressor/Dither/NoiseGate/Loudness).
- Enforce UI-level filter availability:
  - Inputs: exclude output-only filters.
  - Outputs: include all.
- Persist processing changes via `toConfig` (filters + canonical pipeline), validate, then `SetConfigJson`.

Verification:
- Manual (DSP): edit PEQ and enable Conv/Compressor on an output; confirm via `GetConfigJson` + audible behavior.

### [ ] Step: Polish, Warnings, and Final Verification

Tasks:
- Add warning UI for non-representable configs (and optionally a “Normalize to Signal Flow” action).
- Accessibility pass (keyboard selection of ports/edges, focus states, ARIA labels).
- Performance pass (memoization, debounced WS sends, avoid layout thrash).

Verification:
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
