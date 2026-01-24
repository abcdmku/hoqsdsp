# Product Requirements Document (PRD)

## Overview

We want to simplify the CamillaDSP Frontend UI by introducing a single, primary “signal flow” page that combines:

- **Channel processing** (per-channel filters, gain, delay, PEQ, etc.)
- **EQ editing** (graph + band editing for PEQ)
- **Routing** (connect inputs to outputs)

The new page should present two vertical banks:

- **Left bank**: input channels (grouped by device)
- **Right bank**: output channels (grouped by device)

Users create routes by click/drag between channels, producing connection lines styled similarly to the EQ graph line. Multiple inputs may connect to multiple outputs.

Changes must emit correct CamillaDSP configuration updates over WebSocket (tested against `ws://192.168.4.49:1234`).

## Goals

- Replace the mental model of “separate pages for channels / EQ / routing” with a unified signal-flow workflow.
- Make per-channel processing and routing edits fast (few clicks, visually obvious).
- Ensure edits reliably translate into valid CamillaDSP config and apply on the running DSP.

## Non-Goals (for this iteration)

- Supporting arbitrary complex CamillaDSP pipelines/topologies (multiple mixers, multi-stage branching, etc.).
- Designing a full patchbay/network-audio system unless explicitly confirmed.
- Full parity with every CamillaDSP feature if it conflicts with the simplified signal-flow model.

## Users

- Users running one or more CamillaDSP instances ("units") and wanting a fast way to configure per-channel processing + routing.

## Core User Stories

1. As a user, I can see all input and output channels, grouped by device, at a glance.
2. As a user, I can drag from an input channel to an output channel to create a route.
3. As a user, I can select a route and adjust its parameters (gain, invert/phase, mute).
4. As a user, I can select a channel and edit its processing (gain, polarity/phase, delay, PEQ, etc.) without switching pages.
5. As a user, I can apply output-only processing like FIR (convolution), compressor, dither, noise gate, loudness.
6. As a user, I can connect multiple inputs to one output (mixing) and one input to multiple outputs (splitting).
7. As a user, when I make changes, they are applied to the DSP unit via WebSocket and I can verify the DSP is behaving accordingly.

## UX Requirements

### Page layout

- One page (name TBD, e.g. **Signal Flow**) with 3 visual regions:
  - Left: **Inputs** (vertical lists grouped by device)
  - Center: **Connections canvas** (lines between inputs and outputs)
  - Right: **Outputs** (vertical lists grouped by device)

### Channel representation

Each channel appears as a compact “channel card” in its bank:

- Label (user-friendly channel name)
- Quick controls (at minimum):
  - Mute (optional)
  - Gain (optional quick knob/slider)
  - A small processing summary (e.g. “PEQ: 5 bands, Delay: 1.2ms”)

Selecting a channel opens an **editor panel** (inline, side drawer, or bottom sheet) that exposes the full processing controls.

### Processing model

- **Inputs**: provide access to all input-stage processing needed for typical setups (gain, phase/invert, delay, PEQ/biquads, etc.).
- **Outputs**: includes everything inputs have, plus advanced output-stage features:
  - FIR / Convolution
  - Compressor
  - Dither
  - Noise gate
  - Loudness

PEQ is edited through the existing-style EQ graph interaction (draggable nodes + response line). Highpass/lowpass/notch/etc. should be represented as Biquad types inside the PEQ editor rather than separate “filter categories”.

### Routing interactions

- Dragging from an input channel to an output channel creates a connection.
- Connections render as smooth lines, visually similar to the EQ graph line.
- Selecting a connection reveals connection parameters:
  - Gain
  - Invert/phase
  - Mute
- Users can delete a connection.
- Multiple connections are supported:
  - N-to-1 mixing (multiple inputs into one output)
  - 1-to-N splitting (one input to multiple outputs)

### Keyboard & accessibility

- Users can create/delete/select connections without a mouse (exact interaction TBD).
- All controls have visible focus states and ARIA labels.

## Functional Requirements

### FR1: Unit selection and scope

- The page must operate against a specific CamillaDSP WebSocket endpoint (unit).
- It must work with the existing “unit” concept (address/port) stored in the app.

### FR2: Read current DSP config

- Fetch the current config via CamillaDSP `GetConfigJson`.
- Display channels and routing derived from the config.

### FR3: Edit routing

- Routing edits must update the CamillaDSP mixer mapping.
- Per-connection settings must map to CamillaDSP mixer source fields:
  - `gain`
  - `inverted` (phase)
  - `mute`

### FR4: Edit channel processing

- Channel processing edits must translate into CamillaDSP `filters` + `pipeline` updates.
- The UI must support, at minimum, the filter families already present in the codebase:
  - Gain
  - Delay
  - Biquad (PEQ and other biquad types)
  - Convolution (FIR)
  - Compressor
  - Dither
  - Loudness
  - Noise gate

### FR5: Emit config updates

- Edits are applied by sending a full updated configuration via `SetConfigJson`.
- The emitted config must validate against the frontend schema and be accepted by CamillaDSP.

### FR6: Device grouping

- Inputs/outputs must be grouped “by device”.
- Each group shows a header (device name) and the channels for that device.

### FR7: Cross-device connections

- The UI must support creating connections between channels in different device groups.
- When a cross-device connection is made, the frontend must emit the correct CamillaDSP changes for the affected device(s).

Note: how cross-device routing maps to CamillaDSP config depends on what “device” means in this context (see Open Questions).

## Data/Config Mapping Requirements (high-level)

To keep the UI simple, the system should prefer a canonical CamillaDSP structure:

- Input-stage processing (per capture channel)
- A routing mixer (mapping capture channels → playback channels)
- Output-stage processing (per playback channel)

If an existing config doesn’t match the expected structure, the UI should:

- Still load it when possible
- Clearly warn when it cannot faithfully represent the configuration in the simplified signal-flow model
- Offer a “migrate to simplified layout” workflow (optional, may be deferred)

## Quality Requirements

- **Reliability**: configuration updates must be atomic and leave the DSP in a valid state.
- **Performance**: UI remains responsive with at least 32×32 routable channels.
- **Safety**: avoid sending partially-constructed configs; validate before `SetConfigJson`.
- **Observability**: show clear error feedback when CamillaDSP rejects config changes.

## Acceptance Criteria

- The user can connect to the DSP at `ws://192.168.4.49:1234`.
- Creating a route via drag produces audible/observable routing changes on the DSP.
- Adjusting a route’s gain/phase/mute updates the DSP behavior.
- Editing a channel’s PEQ updates the config and changes DSP behavior.
- Output-only features (at least convolution + compressor) can be enabled and applied.

## Open Questions / Clarifications Needed

1. What does “device” mean for grouping?
   - A CamillaDSP “unit” (one WebSocket endpoint)?
   - A physical capture/playback device inside a single unit?
   - A user-defined grouping of channels (e.g., "USB DAC #1", "USB DAC #2")?

2. When connecting inputs to outputs of *other* devices, how does audio flow between those devices?
   - If this means routing across multiple CamillaDSP units, what transport/bridge is expected (network audio, ALSA loopback, etc.)?
   - If it’s within a single unit, what defines device boundaries?

3. Does this new page replace the existing “Channels / EQ / Routing” navigation items, or is it additive?

4. Do you want a fixed processing order (e.g., Gain → Delay → PEQ → …), or a reorderable filter chain per channel?

5. Should channel names be user-editable and persisted (and if so, where—CamillaDSP config title/metadata vs frontend-only storage)?

