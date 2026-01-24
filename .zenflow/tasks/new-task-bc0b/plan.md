# CamillaDSP Frontend Implementation Plan

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`
- **Reference Documents**: `requirements.md`, `spec.md`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: ba17e3c3-d0e5-4054-87de-1443ed35c316 -->
Created Product Requirements Document. See `requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 4f71a7a0-4ea1-4669-9f9f-32ec80d7ce60 -->
Created Technical Specification. See `spec.md`.

### [x] Step: Planning
<!-- chat-id: c8972cad-fefe-4d10-9500-58c91d727587 -->
Created detailed implementation plan (this document).

---

## Phase 1: Foundation & Infrastructure

### [ ] Step: 1.1 - Project Initialization
Initialize the Vite + React + TypeScript project with proper configuration.

**Tasks:**
- [ ] Create Vite project with React and TypeScript template
- [ ] Configure TypeScript strict mode in `tsconfig.json`
- [ ] Set up `.gitignore` with node_modules, dist, coverage, etc.
- [ ] Create project folder structure per spec (src/app, components, features, hooks, lib, stores, types, styles, test)

**Verification:** `npm run dev` starts development server successfully.

### [ ] Step: 1.2 - ESLint & Prettier Configuration
Set up linting and code formatting.

**Tasks:**
- [ ] Install ESLint 9 with flat config
- [ ] Install and configure typescript-eslint
- [ ] Install eslint-plugin-react-hooks
- [ ] Configure Prettier with project settings
- [ ] Add lint and format scripts to package.json

**Verification:** `npm run lint` passes with no errors.

### [ ] Step: 1.3 - Testing Infrastructure
Set up Vitest, React Testing Library, and MSW.

**Tasks:**
- [ ] Install and configure Vitest 3
- [ ] Install @testing-library/react and @testing-library/user-event
- [ ] Install jsdom for DOM testing
- [ ] Install MSW 2 for API mocking
- [ ] Create test/setup.ts with testing library configuration
- [ ] Create test/mocks/MockWebSocket.ts skeleton
- [ ] Add test scripts to package.json

**Verification:** `npm test` runs successfully (with placeholder test).

### [ ] Step: 1.4 - Tailwind CSS & Theme
Configure Tailwind CSS 4 with DSP-specific theme.

**Tasks:**
- [ ] Install Tailwind CSS 4 and @tailwindcss/vite
- [ ] Configure Tailwind in vite.config.ts
- [ ] Create src/styles/globals.css with Tailwind directives
- [ ] Add DSP theme colors (dsp-bg, dsp-surface, dsp-primary, dsp-accent, meter colors)
- [ ] Add filter type colors (cyan for EQ, orange for dynamics, etc.)
- [ ] Install clsx and tailwind-merge
- [ ] Create lib/utils/cn.ts utility function

**Verification:** Custom theme colors render correctly in dev server.

### [ ] Step: 1.5 - TypeScript Type Definitions
Create comprehensive type definitions for CamillaDSP.

**Tasks:**
- [ ] Create types/camilla.types.ts (CamillaConfig, DevicesConfig, MixerConfig, PipelineStep)
- [ ] Create types/websocket.types.ts (WSCommand, WSResponse, ProcessingState, SignalLevels)
- [ ] Create types/filters.types.ts (FilterConfig union, all filter parameter types)
- [ ] Create types/ui.types.ts (DSPUnit, ConnectionStatus, UIState)
- [ ] Create types/index.ts barrel export

**Verification:** `npm run typecheck` passes with all types defined.

---

## Phase 2: Core UI & State

### [ ] Step: 2.1 - WebSocket Manager
Implement core WebSocket communication layer.

**Tasks:**
- [ ] Install eventemitter3
- [ ] Create lib/websocket/WebSocketManager.ts class extending EventEmitter
- [ ] Implement connect(), disconnect(), send<T>() methods
- [ ] Implement request/response correlation with unique IDs
- [ ] Implement timeout handling (5s default)
- [ ] Create lib/websocket/ReconnectionStrategy.ts with exponential backoff + jitter
- [ ] Create lib/websocket/MessageQueue.ts with priority levels (high/normal/low)
- [ ] Create lib/websocket/index.ts barrel export
- [ ] Write unit tests for WebSocketManager

**Verification:** Unit tests pass, WebSocket can connect to mock server.

### [ ] Step: 2.2 - Zustand Stores
Create client-side state management stores.

**Tasks:**
- [ ] Install zustand 5
- [ ] Create stores/connectionStore.ts (connection status per unit, active unit)
- [ ] Create stores/unitStore.ts (unit list with localStorage persistence)
- [ ] Create stores/uiStore.ts (sidebar state, selected items, modal state)
- [ ] Create stores/index.ts barrel export

**Verification:** Stores initialize correctly, persistence works for unitStore.

### [ ] Step: 2.3 - TanStack Query Setup
Configure server state management.

**Tasks:**
- [ ] Install @tanstack/react-query
- [ ] Create app/providers.tsx with QueryClientProvider
- [ ] Configure default query options (staleTime, retry)
- [ ] Create features/connection/connectionQueries.ts (version, state)
- [ ] Create features/configuration/configQueries.ts (getConfig, getConfigJson)
- [ ] Create features/configuration/configMutations.ts (setConfig)

**Verification:** Queries can be defined and used in components.

### [ ] Step: 2.4 - Application Shell
Build the main application layout.

**Tasks:**
- [ ] Install react-router-dom 7
- [ ] Create app/App.tsx with main layout structure
- [ ] Create app/router.tsx with route configuration
- [ ] Create app/main.tsx entry point
- [ ] Create components/layout/TopNav.tsx (unit selector, title)
- [ ] Create components/layout/Sidebar.tsx (navigation menu)
- [ ] Create components/layout/StatusBar.tsx (connection status, metrics)
- [ ] Create components/layout/index.ts barrel export

**Verification:** Application shell renders with navigation working.

### [ ] Step: 2.5 - Base UI Components
Create reusable UI primitive components.

**Tasks:**
- [ ] Install Radix UI packages (dialog, dropdown-menu, select, slider, switch, tooltip)
- [ ] Install class-variance-authority
- [ ] Create components/ui/Button.tsx with CVA variants
- [ ] Create components/ui/Dialog.tsx wrapping Radix Dialog
- [ ] Create components/ui/Slider.tsx wrapping Radix Slider
- [ ] Create components/ui/Select.tsx wrapping Radix Select
- [ ] Create components/ui/Switch.tsx wrapping Radix Switch
- [ ] Create components/ui/Tooltip.tsx wrapping Radix Tooltip
- [ ] Create components/ui/index.ts barrel export

**Verification:** All UI components render with correct styling.

---

## Phase 3: Filter System

### [ ] Step: 3.1 - Filter Handler Interface
Define the filter handling architecture.

**Tasks:**
- [ ] Create lib/filters/types.ts with FilterHandler<T> interface
- [ ] Define parse, serialize, validate, getDefault, getDisplayName methods
- [ ] Create ValidationResult type
- [ ] Install zod 3

**Verification:** Interface compiles with no errors.

### [ ] Step: 3.2 - Biquad Filter Handler
Implement biquad filter handling with all subtypes.

**Tasks:**
- [ ] Create lib/filters/biquad.ts
- [ ] Define Zod schemas for all biquad subtypes (Highpass, Lowpass, Peaking, etc.)
- [ ] Implement biquadHandler with parse/serialize/validate
- [ ] Handle discriminated union by subtype
- [ ] Write comprehensive unit tests for biquad handler

**Verification:** All biquad types parse and validate correctly.

### [ ] Step: 3.3 - Other Filter Handlers
Implement handlers for remaining filter types.

**Tasks:**
- [ ] Create lib/filters/convolution.ts (File/Values variants)
- [ ] Create lib/filters/delay.ts (ms/samples/mm units)
- [ ] Create lib/filters/gain.ts (dB/linear scale)
- [ ] Create lib/filters/volume.ts (fader linking)
- [ ] Create lib/filters/dither.ts (type variants)
- [ ] Create lib/filters/diffeq.ts (coefficient arrays)
- [ ] Create lib/filters/compressor.ts (dynamics params)
- [ ] Create lib/filters/loudness.ts (reference level)
- [ ] Create lib/filters/noisegate.ts (threshold/timing)
- [ ] Create lib/filters/index.ts registry with all handlers
- [ ] Write unit tests for each handler

**Verification:** All filter types parse, validate, and serialize correctly.

### [ ] Step: 3.4 - DSP Calculations
Implement biquad frequency response calculations.

**Tasks:**
- [ ] Create lib/dsp/biquad.ts with coefficient calculation functions
- [ ] Implement calculateBiquadResponse(band, freq, sampleRate) → dB
- [ ] Create lib/dsp/response.ts for composite response calculation
- [ ] Calculate response for 512 points across 20Hz-20kHz (logarithmic)
- [ ] Create lib/dsp/index.ts barrel export
- [ ] Write unit tests verifying accuracy against known values
- [ ] Performance test: ensure <16ms calculation time

**Verification:** Response calculations accurate, tests pass, performance target met.

### [ ] Step: 3.5 - Specialized Input Components
Create audio-specific input components.

**Tasks:**
- [ ] Create components/ui/NumericInput.tsx with validation
- [ ] Create components/ui/FrequencyInput.tsx with logarithmic scale (20Hz-20kHz)
- [ ] Create components/ui/GainInput.tsx with dB display
- [ ] Create components/ui/QInput.tsx for Q factor
- [ ] Add keyboard increment/decrement support
- [ ] Write component tests

**Verification:** Inputs work correctly with appropriate value ranges.

---

## Phase 4: Main Views

### [ ] Step: 4.1 - Network Dashboard
Build the network dashboard with unit cards.

**Tasks:**
- [ ] Create pages/Dashboard.tsx (or views/Dashboard.tsx)
- [ ] Create components/dashboard/UnitCard.tsx with status indicators
- [ ] Display unit name, address, sample rate, channel config
- [ ] Show connection status with color coding (green/gray/red)
- [ ] Create components/dashboard/AddUnitDialog.tsx with form validation
- [ ] Implement unit grouping by zone
- [ ] Create components/monitoring/MiniMeter.tsx for unit cards
- [ ] Add quick volume control and mute toggle

**Verification:** Dashboard displays units, can add/remove units, status updates.

### [ ] Step: 4.2 - Channel Strip View
Build the channel processing view.

**Tasks:**
- [ ] Create pages/ChannelStrip.tsx
- [ ] Create components/channel-strip/ChannelStrip.tsx
- [ ] Create components/channel-strip/ProcessingBlock.tsx with filter type colors
- [ ] Display condensed info per block (EQ bands, delay ms, etc.)
- [ ] Create components/channel-strip/ChannelMeter.tsx
- [ ] Implement click-to-edit functionality
- [ ] Implement mute/solo controls
- [ ] Add right-click context menu (copy/paste/delete/bypass)
- [ ] Implement quick-add buttons for common filters

**Verification:** Channel strips display, processing blocks show correctly.

### [ ] Step: 4.3 - Interactive EQ Editor
Build the graphical EQ editor.

**Tasks:**
- [ ] Create components/eq-editor/EQEditor.tsx container
- [ ] Create components/eq-editor/EQCanvas.tsx with SVG frequency graph
- [ ] Implement logarithmic frequency axis (20Hz-20kHz)
- [ ] Implement linear gain axis (-24dB to +24dB)
- [ ] Draw grid lines at standard frequencies and gains
- [ ] Create components/eq-editor/EQNode.tsx for draggable band points
- [ ] Implement drag horizontally for frequency (logarithmic)
- [ ] Implement drag vertically for gain
- [ ] Implement scroll on node for Q adjustment
- [ ] Create components/eq-editor/BandSelector.tsx
- [ ] Create components/eq-editor/BandParameters.tsx with sliders
- [ ] Draw composite frequency response curve
- [ ] Implement keyboard shortcuts (1-9 select, Delete, B bypass, Arrow keys)

**Verification:** EQ editor renders, nodes are draggable, response updates.

### [ ] Step: 4.4 - Routing Matrix
Build the input/output routing matrix.

**Tasks:**
- [ ] Create components/routing/RoutingMatrix.tsx grid component
- [ ] Create components/routing/CrosspointCell.tsx for matrix cells
- [ ] Implement click to toggle connections
- [ ] Display filled square for active, dimmed for muted
- [ ] Show gain value and phase invert indicator (φ)
- [ ] Create components/routing/CrosspointEditor.tsx panel
- [ ] Add gain slider, phase invert toggle, mute toggle
- [ ] Implement keyboard navigation (arrow keys, Space, I, M, Delete)
- [ ] Support summing multiple inputs and splitting to outputs

**Verification:** Matrix displays, crosspoints toggle, gain/phase work.

### [ ] Step: 4.5 - Filter Editor Modals
Create editor modals for all filter types.

**Tasks:**
- [ ] Create components/filters/FilterEditorModal.tsx base layout
- [ ] Create components/filters/BiquadEditor.tsx with type-specific controls
- [ ] Create components/filters/ConvolutionEditor.tsx
- [ ] Create components/filters/DelayEditor.tsx
- [ ] Create components/filters/GainEditor.tsx
- [ ] Create components/filters/CompressorEditor.tsx
- [ ] Create components/filters/NoiseGateEditor.tsx
- [ ] Create components/filters/DitherEditor.tsx
- [ ] Create components/filters/LoudnessEditor.tsx
- [ ] Add real-time frequency response preview where applicable
- [ ] Implement Apply/Save/Cancel buttons
- [ ] Wire up Zod validation with immediate feedback

**Verification:** All filter editors open, validate, and apply changes.

---

## Phase 5: Monitoring & Polish

### [ ] Step: 5.1 - Real-time Level Meters
Implement level metering components.

**Tasks:**
- [ ] Create components/monitoring/LevelMeter.tsx with peak/RMS display
- [ ] Implement color coding (green -60 to -12, yellow -12 to -3, red above -3)
- [ ] Add clipping indicator with sample count
- [ ] Create features/realtime/useLevels.ts hook
- [ ] Use requestAnimationFrame for 60fps updates
- [ ] Implement React.memo for performance

**Verification:** Meters update smoothly at 60fps, colors correct.

### [ ] Step: 5.2 - Processing Metrics
Implement processing load and buffer monitoring.

**Tasks:**
- [ ] Create components/monitoring/ProcessingMetrics.tsx
- [ ] Display CPU load percentage
- [ ] Display buffer fill level indicator
- [ ] Display capture sample rate
- [ ] Create features/realtime/useProcessingLoad.ts hook
- [ ] Create features/realtime/realtimeSubscriptions.ts

**Verification:** Metrics display and update in real-time.

### [ ] Step: 5.3 - Keyboard Shortcuts & Accessibility
Implement keyboard navigation and ARIA support.

**Tasks:**
- [ ] Create hooks/useKeyboardShortcuts.ts
- [ ] Implement global shortcuts (Escape to deselect, etc.)
- [ ] Add Tab navigation through all interactive elements
- [ ] Add ARIA labels for all controls and indicators
- [ ] Implement focus management in modals (focus trap)
- [ ] Add screen reader announcements for connection changes
- [ ] Verify color contrast minimum 4.5:1

**Verification:** All controls keyboard accessible, ARIA labels present.

### [ ] Step: 5.4 - Configuration Import/Export
Implement configuration file handling.

**Tasks:**
- [ ] Implement YAML configuration parsing (load from file)
- [ ] Implement configuration export (download as YAML)
- [ ] Add configuration validation before import
- [ ] Create UI for import/export in settings or toolbar

**Verification:** Can import valid configs, export current config.

### [ ] Step: 5.5 - Error Handling & Loading States
Add polish and error handling.

**Tasks:**
- [ ] Install sonner for toast notifications
- [ ] Create error boundary component
- [ ] Add loading skeletons for async content
- [ ] Add error UI for failed connections/operations
- [ ] Add confirmation dialogs for destructive actions

**Verification:** Graceful error handling, loading states visible.

### [ ] Step: 5.6 - Unit Tests
Complete test coverage for critical modules.

**Tasks:**
- [ ] Write unit tests for lib/dsp/ (100% coverage target)
- [ ] Write unit tests for lib/filters/ (100% coverage target)
- [ ] Write unit tests for lib/websocket/ (90%+ coverage target)
- [ ] Write component tests for key UI components (80%+ coverage)
- [ ] Write integration tests with MSW for WebSocket flows

**Verification:** `npm run test:coverage` meets targets.

### [ ] Step: 5.7 - Final Verification & Documentation
Final checks and cleanup.

**Tasks:**
- [ ] Run full lint check: `npm run lint`
- [ ] Run type check: `npm run typecheck`
- [ ] Run all tests: `npm test`
- [ ] Test in Chrome, Firefox, Safari, Edge
- [ ] Verify responsive layout (768px minimum)
- [ ] Performance check: bundle size <200KB gzipped
- [ ] Create README.md with setup and development instructions

**Verification:** All checks pass, browser testing complete.

---

## Summary

| Phase | Steps | Focus |
|-------|-------|-------|
| Phase 1 | 1.1-1.5 | Foundation & Infrastructure |
| Phase 2 | 2.1-2.5 | Core UI & State |
| Phase 3 | 3.1-3.5 | Filter System |
| Phase 4 | 4.1-4.5 | Main Views |
| Phase 5 | 5.1-5.7 | Monitoring & Polish |

**Total: 22 implementation steps**

Each step is designed to be independently completable and testable. Steps within a phase can often be parallelized, while phases generally build on each other sequentially.
