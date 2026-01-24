# Product Requirements Document: CamillaDSP Frontend

## 1. Overview

### 1.1 Product Summary
CamillaDSP Frontend is a modern web application for controlling and monitoring CamillaDSP audio processing units via WebSocket. It provides real-time audio monitoring, filter configuration, pipeline management, and multi-unit network control for professional audio applications.

### 1.2 Target Users
- Audio engineers managing DSP configurations
- Live sound professionals controlling multiple DSP units
- Home audio enthusiasts configuring room correction
- System integrators setting up multi-zone audio systems

### 1.3 Key Value Proposition
- Real-time control and monitoring of CamillaDSP units
- Visual, intuitive interface for complex audio configurations
- Multi-unit network management from a single dashboard
- Professional-grade tools (EQ editors, routing matrix, level meters)

---

## 2. Functional Requirements

### 2.1 Network Dashboard

**FR-2.1.1**: Display all configured CamillaDSP units as cards in a responsive grid layout.

**FR-2.1.2**: Show unit status indicators (online/offline/error) with color coding:
- Green: Connected and running
- Gray: Disconnected
- Red: Error state

**FR-2.1.3**: Display per-unit information:
- Unit name and IP address
- Sample rate with mismatch warnings
- Channel configuration (inputs → outputs)
- Processing load percentage
- Buffer fill level
- Last seen timestamp (when offline)

**FR-2.1.4**: Provide mini level meters showing input/output activity per unit.

**FR-2.1.5**: Enable quick volume control and mute toggle on each unit card.

**FR-2.1.6**: Support grouping units by zone (FOH, Monitors, Fills, Delays).

**FR-2.1.7**: Enable batch operations:
- Mute all units
- Gain adjustment to multiple selected units

**FR-2.1.8**: Support add/remove/rename unit operations.

### 2.2 Channel Processing View

**FR-2.2.1**: Display channel strips with:
- Channel number and name
- Source selector
- Processing blocks as compact indicators
- Level meters
- Mute/Solo controls

**FR-2.2.2**: Color-code processing blocks by filter type:
- Cyan: EQ/Biquad filters
- Orange: Dynamics (compressor, gate)
- Purple: Convolution/FIR
- Blue: Delay
- Red: Limiter
- Green: Gain/Volume
- Pink: Dither
- Yellow: Bypassed
- Gray: Inactive/empty

**FR-2.2.3**: Show condensed info on each block:
- EQ: count of active bands
- Dynamics: type (CMP, GATE)
- Delay: delay value in ms
- FIR: filename abbreviation
- Limiter: threshold value

**FR-2.2.4**: Enable click-to-edit functionality for any processing block.

**FR-2.2.5**: Support drag-and-drop reordering of processing chain.

**FR-2.2.6**: Provide channel linking for stereo/group processing.

**FR-2.2.7**: Enable solo and mute per channel.

**FR-2.2.8**: Provide quick-add buttons for common filter types (HP, LP, Peak, Comp, Delay, FIR).

**FR-2.2.9**: Support right-click context menu for copy/paste/delete/bypass operations.

### 2.3 Interactive EQ Editor

**FR-2.3.1**: Display frequency response graph with:
- Logarithmic frequency axis (20Hz - 20kHz)
- Linear gain axis (-24dB to +24dB)
- Grid lines at standard frequencies (100, 1k, 10k) and gains (-12, 0, +12)
- Composite frequency response curve

**FR-2.3.2**: Represent each EQ band as a draggable node on the curve.

**FR-2.3.3**: Support all CamillaDSP biquad types:
- Highpass, Lowpass (with Q)
- HighpassFO, LowpassFO (first-order)
- Peaking (freq, Q, gain)
- Highshelf, Lowshelf (freq, slope, gain)
- Notch, Bandpass, Allpass (freq, Q)
- Butterworth and Linkwitz-Riley crossovers (up to 8th order)

**FR-2.3.4**: Implement interaction model:
- Click empty area: Add new band
- Drag horizontally: Change frequency (logarithmic)
- Drag vertically: Change gain (linear)
- Scroll on node: Adjust Q factor
- Double-click node: Open detailed editor
- Right-click node: Context menu (delete, bypass, copy)

**FR-2.3.5**: Provide band selector buttons showing active bands with type labels.

**FR-2.3.6**: Display parameter controls (frequency, Q, gain) for selected band.

**FR-2.3.7**: Support keyboard shortcuts:
- 1-9: Select band
- Delete: Remove selected band
- B: Bypass selected band
- Escape: Deselect
- Arrow keys: Fine-tune freq/gain

### 2.4 Routing Matrix

**FR-2.4.1**: Display crosspoint grid showing inputs (rows) vs outputs (columns).

**FR-2.4.2**: Enable click to toggle connections at crosspoints.

**FR-2.4.3**: Provide per-crosspoint gain adjustment (-40 to +12 dB).

**FR-2.4.4**: Support phase invert toggle per crosspoint (Shift+click).

**FR-2.4.5**: Display visual indicators:
- Filled square for active connections
- Gain value in dB
- φ symbol for inverted phase
- Dimmed for muted

**FR-2.4.6**: Support summing multiple inputs to single output.

**FR-2.4.7**: Support splitting single input to multiple outputs.

**FR-2.4.8**: Provide crosspoint editor panel with:
- Gain slider with numeric display
- Phase invert toggle
- Mute toggle
- Remove connection button

**FR-2.4.9**: Support keyboard navigation:
- Arrow keys: Navigate cells
- Space: Toggle connection
- I: Invert phase
- M: Mute
- Delete: Remove connection

### 2.5 Filter Configuration

**FR-2.5.1**: Support all CamillaDSP filter types:
- Biquad (all subtypes)
- Convolution/FIR
- Delay (ms, samples, mm units)
- Gain (dB/linear, with inversion)
- Volume (linked to faders)
- Dither (all dither types)
- DiffEq (generic difference equation)
- Compressor (threshold, ratio, attack, release)
- Loudness (reference level)
- NoiseGate (threshold and timing)

**FR-2.5.2**: Provide specialized editor modal for each filter type with:
- Real-time frequency response preview
- Immediate validation feedback
- Apply and Save buttons

**FR-2.5.3**: Validate all filter parameters using Zod schemas.

**FR-2.5.4**: Convert between TypeScript objects and CamillaDSP YAML format.

### 2.6 Real-time Monitoring

**FR-2.6.1**: Display level meters for capture and playback channels.

**FR-2.6.2**: Show peak and RMS levels with color coding:
- Green: Normal (-60 to -12 dB)
- Yellow: High (-12 to -3 dB)
- Red: Clipping (above -3 dB)

**FR-2.6.3**: Display processing load percentage.

**FR-2.6.4**: Show buffer fill level indicator.

**FR-2.6.5**: Provide clipping indicator with sample count since reset.

**FR-2.6.6**: Display capture sample rate (for rate adjustment monitoring).

### 2.7 WebSocket Communication

**FR-2.7.1**: Implement WebSocket manager supporting all CamillaDSP commands:
- Connection lifecycle (connect, disconnect, reconnect)
- All no-argument commands (GetVersion, GetState, GetConfig, etc.)
- All parameterized commands (SetVolume, SetConfig, etc.)
- Fader control (GetFaderVolume, SetFaderVolume, etc.)

**FR-2.7.2**: Implement exponential backoff reconnection with jitter.

**FR-2.7.3**: Provide request/response correlation with timeout handling.

**FR-2.7.4**: Support message queue with priority levels (high/normal/low).

**FR-2.7.5**: Handle multiple concurrent unit connections.

### 2.8 Configuration Management

**FR-2.8.1**: Load and parse CamillaDSP YAML configurations.

**FR-2.8.2**: Validate configurations before applying.

**FR-2.8.3**: Support configuration import/export.

**FR-2.8.4**: Persist unit list to local storage.

---

## 3. Non-Functional Requirements

### 3.1 Performance

**NFR-3.1.1**: Level meter updates at 60fps minimum.

**NFR-3.1.2**: EQ frequency response calculation completes in <16ms (one frame).

**NFR-3.1.3**: UI remains responsive during WebSocket operations.

**NFR-3.1.4**: Memory usage stays stable during extended sessions.

### 3.2 Accessibility

**NFR-3.2.1**: All interactive elements keyboard accessible (Tab navigation).

**NFR-3.2.2**: ARIA labels for all controls and indicators.

**NFR-3.2.3**: Focus management in modals and dialogs.

**NFR-3.2.4**: Color contrast minimum 4.5:1.

**NFR-3.2.5**: Screen reader announcements for connection changes.

### 3.3 Code Quality

**NFR-3.3.1**: TypeScript strict mode with no `any` types.

**NFR-3.3.2**: All exported functions have explicit return types.

**NFR-3.3.3**: JSDoc comments for public APIs.

**NFR-3.3.4**: Unit tests for utility functions and DSP calculations.

**NFR-3.3.5**: ESLint and Prettier compliance.

### 3.4 Browser Support

**NFR-3.4.1**: Support modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).

**NFR-3.4.2**: Responsive design for tablet and desktop (minimum 768px width).

---

## 4. Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 with TypeScript 5.7+ |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Components | Radix UI primitives |
| Server State | TanStack Query 5 |
| Client State | Zustand 5 |
| Forms | TanStack Form 1 |
| Validation | Zod 3 |
| Icons | Lucide React |
| Testing | Vitest 3, React Testing Library 16, MSW 2 |

---

## 5. Project Structure

```
src/
├── app/                 # App shell, routing, providers
├── components/
│   ├── ui/             # Reusable primitives (Button, Slider, Dialog)
│   ├── layout/         # Shell (TopNav, Sidebar, StatusBar)
│   ├── channel-strip/  # Channel processing view components
│   ├── eq-editor/      # Interactive EQ editor
│   ├── routing/        # Routing matrix components
│   ├── filters/        # Filter editor modals
│   └── monitoring/     # Level meters, metrics
├── features/
│   ├── connection/     # WebSocket connection logic
│   ├── configuration/  # Config parsing/validation
│   ├── devices/        # Device management
│   └── realtime/       # Real-time data subscriptions
├── hooks/              # Shared custom hooks
├── lib/
│   ├── dsp/           # DSP calculations, filter math
│   ├── websocket/     # WebSocket management
│   └── utils/         # General utilities
├── stores/            # Zustand stores
├── types/             # TypeScript type definitions
└── styles/            # Global styles, theme
```

---

## 6. Design System

### 6.1 Color Palette (Dark Theme)

| Name | Hex | Usage |
|------|-----|-------|
| dsp-bg | #1a1a2e | Main background |
| dsp-surface | #16213e | Cards, panels |
| dsp-primary | #0f3460 | Primary actions |
| dsp-accent | #e94560 | Highlights, focus |
| dsp-meter-green | #4ade80 | Normal levels |
| dsp-meter-yellow | #facc15 | Warning levels |
| dsp-meter-red | #ef4444 | Clipping/error |

### 6.2 Filter Colors

| Type | Color |
|------|-------|
| EQ/Biquad | Cyan (#22d3ee) |
| Dynamics | Orange (#fb923c) |
| FIR/Conv | Purple (#a78bfa) |
| Delay | Blue (#60a5fa) |
| Limiter | Red (#f87171) |
| Gain | Green (#4ade80) |
| Dither | Pink (#f472b6) |
| Bypassed | Yellow (#fbbf24) |
| Inactive | Gray (#4b5563) |

---

## 7. Delivery Phases

### Phase 1: Foundation & Infrastructure
- Project initialization (Vite, React, TypeScript)
- ESLint, Prettier, Vitest configuration
- Tailwind CSS with DSP theme
- Project folder structure
- Type definitions (CamillaDSP, WebSocket, UI)
- WebSocket communication layer

### Phase 2: Core UI & State
- Application shell (TopNav, Sidebar, StatusBar)
- Base UI components (Button, Slider, Dialog, Select)
- Zustand stores (connection, UI, units)
- TanStack Query integration

### Phase 3: Filter System
- Filter type definitions and handlers
- Biquad response calculation
- Filter editor modals for all types
- Zod validation schemas

### Phase 4: Main Views
- Network dashboard with unit cards
- Channel processing view
- Interactive EQ editor
- Routing matrix

### Phase 5: Monitoring & Polish
- Real-time level meters
- Processing metrics display
- Configuration import/export
- Testing and accessibility audit

---

## 8. Assumptions

1. CamillaDSP units are accessible via WebSocket on the local network.
2. Users have basic understanding of audio DSP concepts.
3. The application runs in a modern browser with WebSocket support.
4. Units are pre-configured with CamillaDSP and running before connection.
5. No authentication is required for WebSocket connections (as per CamillaDSP design).

---

## 9. Open Questions

None at this time. The context files provide comprehensive requirements for implementation.
