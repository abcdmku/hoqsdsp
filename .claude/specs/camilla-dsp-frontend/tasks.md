# CamillaDSP Frontend - Implementation Tasks

## Task Overview

This document outlines all implementation tasks for the CamillaDSP Frontend application, organized by phase with dependencies clearly marked. Tasks that can be worked on in parallel are grouped together.

---

## Phase 1: Foundation & Infrastructure

### P1.1 Project Setup
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 1.1.1 | Initialize React project with TypeScript and Vite | None | A |
| 1.1.2 | Configure ESLint, Prettier, and TypeScript strict mode | 1.1.1 | B |
| 1.1.3 | Set up testing framework (Vitest + React Testing Library) | 1.1.1 | B |
| 1.1.4 | Configure CI/CD pipeline (GitHub Actions) | 1.1.1 | B |
| 1.1.5 | Set up component library (Material-UI or Tailwind) | 1.1.1 | B |
| 1.1.6 | Create project folder structure and architecture | 1.1.1 | B |

**Parallel Note:** After 1.1.1, tasks 1.1.2-1.1.6 can all run in parallel (Group B).

### P1.2 Core Type Definitions
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 1.2.1 | Define CamillaDSP configuration types (devices, filters, pipeline, mixers) | 1.1.6 | C |
| 1.2.2 | Define WebSocket message types (commands, responses) | 1.1.6 | C |
| 1.2.3 | Define UI state types (connection, units, editing) | 1.1.6 | C |
| 1.2.4 | Define filter parameter types for all filter kinds | 1.1.6 | C |
| 1.2.5 | Create type guards and validation utilities | 1.2.1, 1.2.2, 1.2.3, 1.2.4 | D |

**Parallel Note:** Tasks 1.2.1-1.2.4 can all run in parallel (Group C).

### P1.3 State Management Setup
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 1.3.1 | Set up Zustand or Redux Toolkit for global state | 1.1.5, 1.2.3 | E |
| 1.3.2 | Create connection state slice (units, status, errors) | 1.3.1 | F |
| 1.3.3 | Create configuration state slice (current config, history) | 1.3.1 | F |
| 1.3.4 | Create UI state slice (modals, editing, preferences) | 1.3.1 | F |
| 1.3.5 | Create monitoring state slice (levels, metrics) | 1.3.1 | F |
| 1.3.6 | Implement undo/redo middleware for configuration changes | 1.3.3 | G |

**Parallel Note:** Tasks 1.3.2-1.3.5 can all run in parallel (Group F).

---

## Phase 2: WebSocket Communication Layer

### P2.1 WebSocket Core
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 2.1.1 | Create WebSocket connection manager class | 1.2.2, 1.3.1 | H |
| 2.1.2 | Implement connection lifecycle (connect, disconnect, reconnect) | 2.1.1 | I |
| 2.1.3 | Implement exponential backoff reconnection strategy | 2.1.2 | J |
| 2.1.4 | Create message queue for command batching | 2.1.1 | I |
| 2.1.5 | Implement request/response correlation | 2.1.1 | I |

**Parallel Note:** Tasks 2.1.2, 2.1.4, 2.1.5 can run in parallel (Group I).

### P2.2 Command Implementation
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 2.2.1 | Implement configuration commands (GetConfig, SetConfig, SetConfigJson, Reload, ValidateConfig) | 2.1.5 | K |
| 2.2.2 | Implement state commands (GetState, GetStopReason, Stop, GetVersion) | 2.1.5 | K |
| 2.2.3 | Implement volume commands (Get/Set/AdjustVolume, Get/Set/ToggleMute) | 2.1.5 | K |
| 2.2.4 | Implement fader commands (all fader variants for Main + Aux1-4) | 2.1.5 | K |
| 2.2.5 | Implement level commands (GetSignalLevels, peak/RMS variants) | 2.1.5 | K |
| 2.2.6 | Implement processing commands (GetProcessingLoad, GetBufferLevel, GetClippedSamples) | 2.1.5 | K |
| 2.2.7 | Implement device commands (GetAvailableCaptureDevices, GetAvailablePlaybackDevices) | 2.1.5 | K |
| 2.2.8 | Implement update interval management (Get/SetUpdateInterval) | 2.1.5 | K |

**Parallel Note:** All 2.2.x tasks can run in parallel (Group K).

### P2.3 Multi-Unit Management
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 2.3.1 | Create MultiUnitManager service | 2.1.3, 1.3.2 | L |
| 2.3.2 | Implement unit discovery (manual add + network scan) | 2.3.1 | M |
| 2.3.3 | Implement connection pool management | 2.3.1 | M |
| 2.3.4 | Implement unit health monitoring and status tracking | 2.3.1 | M |
| 2.3.5 | Create unit switching logic (preserve state between switches) | 2.3.1, 1.3.3 | N |

**Parallel Note:** Tasks 2.3.2-2.3.4 can run in parallel (Group M).

---

## Phase 3: Configuration Engine

### P3.1 YAML Processing
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 3.1.1 | Integrate YAML parser library (js-yaml) | 1.1.1 | O |
| 3.1.2 | Create YAML-to-TypeScript config converter | 3.1.1, 1.2.1 | P |
| 3.1.3 | Create TypeScript-to-YAML config serializer | 3.1.1, 1.2.1 | P |
| 3.1.4 | Implement token substitution ($samplerate$, $channels$) | 3.1.2 | Q |
| 3.1.5 | Create configuration validation engine | 3.1.2, 1.2.5 | Q |

**Parallel Note:** Tasks 3.1.2 and 3.1.3 can run in parallel (Group P). Tasks 3.1.4 and 3.1.5 can run in parallel (Group Q).

### P3.2 Filter Configuration
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 3.2.1 | Create Biquad filter configuration handlers (all 11 types) | 1.2.4, 3.1.2 | R |
| 3.2.2 | Create Convolution/FIR filter configuration handlers | 1.2.4, 3.1.2 | R |
| 3.2.3 | Create Delay filter configuration handler (ms, samples, mm) | 1.2.4, 3.1.2 | R |
| 3.2.4 | Create Gain filter configuration handler (dB, linear, invert) | 1.2.4, 3.1.2 | R |
| 3.2.5 | Create Volume filter configuration handler (with fader link) | 1.2.4, 3.1.2 | R |
| 3.2.6 | Create Dither filter configuration handler (all 5 types) | 1.2.4, 3.1.2 | R |
| 3.2.7 | Create DiffEq filter configuration handler | 1.2.4, 3.1.2 | R |
| 3.2.8 | Create Compressor filter configuration handler | 1.2.4, 3.1.2 | R |
| 3.2.9 | Create Loudness filter configuration handler | 1.2.4, 3.1.2 | R |
| 3.2.10 | Create Noise Gate filter configuration handler | 1.2.4, 3.1.2 | R |
| 3.2.11 | Create Biquad combo handlers (Tilt EQ, Graphic EQ, FivePointPeq) | 1.2.4, 3.1.2 | R |

**Parallel Note:** ALL 3.2.x tasks can run in parallel (Group R) - this is a major parallelization opportunity.

### P3.3 Pipeline Configuration
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 3.3.1 | Create pipeline stage data model | 1.2.1 | S |
| 3.3.2 | Create mixer configuration handler (channels, mapping, sources) | 3.3.1 | T |
| 3.3.3 | Implement channel count validation between stages | 3.3.1 | T |
| 3.3.4 | Create pipeline step bypass toggle logic | 3.3.1 | T |
| 3.3.5 | Implement multi-channel filter step support | 3.3.1, 3.2.1 | U |

**Parallel Note:** Tasks 3.3.2-3.3.4 can run in parallel (Group T).

### P3.4 Device Configuration
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 3.4.1 | Create device configuration model for all backends | 1.2.1 | V |
| 3.4.2 | Implement WASAPI-specific options (exclusive, shared, loopback) | 3.4.1 | W |
| 3.4.3 | Implement ALSA-specific options | 3.4.1 | W |
| 3.4.4 | Implement CoreAudio-specific options | 3.4.1 | W |
| 3.4.5 | Implement special capture types (Signal Generator, WavFile, Stdin) | 3.4.1 | W |
| 3.4.6 | Create resampler configuration handler | 3.4.1 | W |
| 3.4.7 | Create silence detection configuration handler | 3.4.1 | W |

**Parallel Note:** Tasks 3.4.2-3.4.7 can all run in parallel (Group W).

---

## Phase 4: UI Components - Core

### P4.1 Layout Components
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 4.1.1 | Create main application shell with responsive layout | 1.1.5 | X |
| 4.1.2 | Create top navigation bar with unit selector and status | 4.1.1 | Y |
| 4.1.3 | Create sidebar with navigation menu | 4.1.1 | Y |
| 4.1.4 | Create persistent status bar (connection, processing, clipping, volume) | 4.1.1, 1.3.2 | Y |
| 4.1.5 | Create modal/dialog system for configuration editors | 4.1.1 | Y |

**Parallel Note:** Tasks 4.1.2-4.1.5 can all run in parallel (Group Y).

### P4.2 Connection Management UI
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 4.2.1 | Create DSP unit list component | 4.1.1, 2.3.1 | Z |
| 4.2.2 | Create "Add Unit" dialog with IP/port input | 4.2.1, 4.1.5 | AA |
| 4.2.3 | Create unit card component (status, quick actions) | 4.2.1 | AA |
| 4.2.4 | Create connection status indicator component | 4.2.1, 1.3.2 | AA |
| 4.2.5 | Create unit detail view with version and device info | 4.2.1, 2.2.2, 2.2.7 | AB |

**Parallel Note:** Tasks 4.2.2-4.2.4 can run in parallel (Group AA).

### P4.3 Volume & Fader Controls
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 4.3.1 | Create volume fader component with dB scale | 4.1.1, 2.2.3 | AC |
| 4.3.2 | Create mute toggle button component | 4.3.1 | AD |
| 4.3.3 | Create multi-fader panel (Main + Aux1-4) | 4.3.1, 4.3.2, 2.2.4 | AE |
| 4.3.4 | Implement real-time fader sync with WebSocket | 4.3.3 | AF |
| 4.3.5 | Create quick-access volume controls for status bar | 4.3.1, 4.1.4 | AE |

**Parallel Note:** Tasks 4.3.3 and 4.3.5 can run in parallel (Group AE).

---

## Phase 5: UI Components - Audio Matrix & Pipeline

### P5.1 Audio Matrix
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 5.1.1 | Create matrix grid layout component | 4.1.1, 3.3.1 | AG |
| 5.1.2 | Create input channel row components | 5.1.1 | AH |
| 5.1.3 | Create output channel column components | 5.1.1 | AH |
| 5.1.4 | Create pipeline stage cell component (condensed filter display) | 5.1.1, 3.2.1 | AH |
| 5.1.5 | Create connection line/path visualization | 5.1.1 | AH |
| 5.1.6 | Implement click-to-edit for matrix cells | 5.1.4, 4.1.5 | AI |
| 5.1.7 | Create signal flow animation/indication | 5.1.5, 1.3.5 | AI |

**Parallel Note:** Tasks 5.1.2-5.1.5 can all run in parallel (Group AH). Tasks 5.1.6 and 5.1.7 can run in parallel (Group AI).

### P5.2 Pipeline Builder
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 5.2.1 | Create pipeline canvas/container component | 4.1.1, 3.3.1 | AJ |
| 5.2.2 | Create draggable pipeline stage component | 5.2.1 | AK |
| 5.2.3 | Implement drag-and-drop reordering | 5.2.2 | AL |
| 5.2.4 | Create filter/mixer type selector palette | 5.2.1 | AK |
| 5.2.5 | Create pipeline validation error display | 5.2.1, 3.3.3 | AK |
| 5.2.6 | Implement stage bypass toggle UI | 5.2.2, 3.3.4 | AL |
| 5.2.7 | Create pipeline flowchart visualization mode | 5.2.1 | AM |

**Parallel Note:** Tasks 5.2.2, 5.2.4, 5.2.5 can run in parallel (Group AK). Tasks 5.2.3 and 5.2.6 can run in parallel (Group AL).

---

## Phase 6: UI Components - Filter Editors

### P6.1 Common Filter Editor Infrastructure
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 6.1.1 | Create base filter editor modal component | 4.1.5, 3.2.1 | AN |
| 6.1.2 | Create numeric input with units (Hz, dB, ms, etc.) | 6.1.1 | AO |
| 6.1.3 | Create frequency input with logarithmic slider | 6.1.2 | AP |
| 6.1.4 | Create gain input with dB/linear toggle | 6.1.2 | AP |
| 6.1.5 | Create coefficient array input component | 6.1.1 | AO |
| 6.1.6 | Create file picker for impulse response files | 6.1.1 | AO |

**Parallel Note:** Tasks 6.1.2, 6.1.5, 6.1.6 can run in parallel (Group AO). Tasks 6.1.3 and 6.1.4 can run in parallel (Group AP).

### P6.2 Individual Filter Editors
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 6.2.1 | Create Biquad filter editor (all types with type selector) | 6.1.1, 6.1.3, 6.1.4 | AQ |
| 6.2.2 | Create Convolution filter editor (file picker + format) | 6.1.1, 6.1.6 | AQ |
| 6.2.3 | Create Delay filter editor (ms/samples/mm selector) | 6.1.1, 6.1.2 | AQ |
| 6.2.4 | Create Gain filter editor (dB/linear + invert) | 6.1.1, 6.1.4 | AQ |
| 6.2.5 | Create Volume filter editor (fader link + limits) | 6.1.1, 6.1.4 | AQ |
| 6.2.6 | Create Dither filter editor (type selector + bits) | 6.1.1, 6.1.2 | AQ |
| 6.2.7 | Create DiffEq filter editor (coefficient arrays) | 6.1.1, 6.1.5 | AQ |
| 6.2.8 | Create Compressor filter editor (threshold, ratio, attack, release) | 6.1.1, 6.1.2 | AQ |
| 6.2.9 | Create Loudness filter editor (reference level) | 6.1.1, 6.1.2 | AQ |
| 6.2.10 | Create Noise Gate filter editor (threshold, timing) | 6.1.1, 6.1.2 | AQ |
| 6.2.11 | Create Tilt EQ editor | 6.1.1, 6.1.3, 6.1.4 | AQ |
| 6.2.12 | Create Graphic EQ editor (band sliders) | 6.1.1, 6.1.3, 6.1.4 | AQ |
| 6.2.13 | Create FivePointPeq editor | 6.1.1, 6.1.3, 6.1.4 | AQ |

**Parallel Note:** ALL 6.2.x tasks can run in parallel (Group AQ) - another major parallelization opportunity.

### P6.3 Mixer Editor
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 6.3.1 | Create mixer editor modal | 6.1.1, 3.3.2 | AR |
| 6.3.2 | Create channel mapping matrix UI | 6.3.1 | AS |
| 6.3.3 | Create source gain/mute/invert controls | 6.3.1, 6.1.4 | AS |
| 6.3.4 | Create channel labels editor | 6.3.1 | AS |
| 6.3.5 | Implement input/output channel count configuration | 6.3.1 | AS |

**Parallel Note:** Tasks 6.3.2-6.3.5 can all run in parallel (Group AS).

---

## Phase 7: UI Components - Monitoring & Analysis

### P7.1 Level Meters
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 7.1.1 | Create level meter component (peak + RMS) | 4.1.1, 2.2.5 | AT |
| 7.1.2 | Create multi-channel meter strip | 7.1.1 | AU |
| 7.1.3 | Create capture meters panel | 7.1.2 | AV |
| 7.1.4 | Create playback meters panel | 7.1.2 | AV |
| 7.1.5 | Implement peak hold with decay | 7.1.1 | AU |
| 7.1.6 | Create clipping indicator with reset | 7.1.1, 2.2.6 | AU |
| 7.1.7 | Implement configurable update rate | 7.1.2, 2.2.8 | AW |

**Parallel Note:** Tasks 7.1.3 and 7.1.4 can run in parallel (Group AV). Tasks 7.1.2, 7.1.5, 7.1.6 depend on 7.1.1 but can run in parallel (Group AU).

### P7.2 Frequency Response Display
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 7.2.1 | Integrate charting library (Chart.js or D3) | 1.1.1 | AX |
| 7.2.2 | Create frequency response graph component | 7.2.1 | AY |
| 7.2.3 | Implement Biquad filter response calculation | 7.2.2, 3.2.1 | AZ |
| 7.2.4 | Implement filter chain response aggregation | 7.2.3 | BA |
| 7.2.5 | Create interactive graph controls (zoom, pan) | 7.2.2 | AZ |
| 7.2.6 | Create magnitude and phase display toggle | 7.2.2 | AZ |

**Parallel Note:** Tasks 7.2.3, 7.2.5, 7.2.6 can run in parallel (Group AZ).

### P7.3 Performance Metrics
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 7.3.1 | Create processing load gauge component | 4.1.1, 2.2.6 | BB |
| 7.3.2 | Create buffer level indicator component | 4.1.1, 2.2.6 | BB |
| 7.3.3 | Create capture rate display component | 4.1.1, 2.2.6 | BB |
| 7.3.4 | Create rate adjustment indicator | 4.1.1, 2.2.6 | BB |
| 7.3.5 | Create combined metrics dashboard panel | 7.3.1, 7.3.2, 7.3.3, 7.3.4 | BC |

**Parallel Note:** Tasks 7.3.1-7.3.4 can all run in parallel (Group BB).

---

## Phase 8: Device Configuration UI

### P8.1 Device Selection
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 8.1.1 | Create device selector dropdown component | 4.1.1, 2.2.7 | BD |
| 8.1.2 | Create capture device configuration panel | 8.1.1, 3.4.1 | BE |
| 8.1.3 | Create playback device configuration panel | 8.1.1, 3.4.1 | BE |
| 8.1.4 | Create backend-specific options subpanels | 8.1.2, 8.1.3, 3.4.2-3.4.5 | BF |
| 8.1.5 | Create sample format selector | 8.1.2 | BG |
| 8.1.6 | Create sample rate configuration | 8.1.2 | BG |

**Parallel Note:** Tasks 8.1.2 and 8.1.3 can run in parallel (Group BE). Tasks 8.1.5 and 8.1.6 can run in parallel (Group BG).

### P8.2 Buffer & Resampling Settings
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 8.2.1 | Create buffer size (chunksize) configuration | 4.1.1, 3.4.1 | BH |
| 8.2.2 | Create queue limit configuration | 8.2.1 | BI |
| 8.2.3 | Create latency calculator display | 8.2.1, 8.2.2 | BJ |
| 8.2.4 | Create resampler configuration panel | 4.1.1, 3.4.6 | BH |
| 8.2.5 | Create silence detection configuration | 4.1.1, 3.4.7 | BH |

**Parallel Note:** Tasks 8.2.1, 8.2.4, 8.2.5 can run in parallel (Group BH).

---

## Phase 9: Configuration Management UI

### P9.1 Configuration Operations
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 9.1.1 | Create configuration export dialog (YAML download) | 4.1.5, 3.1.3 | BK |
| 9.1.2 | Create configuration import dialog (YAML upload + validation) | 4.1.5, 3.1.2, 3.1.5 | BK |
| 9.1.3 | Create configuration diff/preview view | 9.1.2, 3.1.2 | BL |
| 9.1.4 | Create configuration apply confirmation dialog | 9.1.2, 2.2.1 | BL |

**Parallel Note:** Tasks 9.1.1 and 9.1.2 can run in parallel (Group BK). Tasks 9.1.3 and 9.1.4 can run in parallel (Group BL).

### P9.2 Version History & Templates
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 9.2.1 | Create local storage persistence layer | 1.1.1 | BM |
| 9.2.2 | Create configuration history list component | 9.2.1, 4.1.1 | BN |
| 9.2.3 | Create configuration restore functionality | 9.2.2, 2.2.1 | BO |
| 9.2.4 | Create configuration template library | 9.2.1 | BN |
| 9.2.5 | Create template browser and apply dialog | 9.2.4, 4.1.5 | BP |
| 9.2.6 | Create preset templates (2-way crossover, room correction, etc.) | 9.2.4, 3.2.1 | BP |

**Parallel Note:** Tasks 9.2.2 and 9.2.4 can run in parallel (Group BN). Tasks 9.2.5 and 9.2.6 can run in parallel (Group BP).

---

## Phase 10: UX & Accessibility

### P10.1 User Experience
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 10.1.1 | Create contextual help tooltip system | 4.1.1 | BQ |
| 10.1.2 | Add tooltips to all DSP parameters and controls | 10.1.1, Phase 6 complete | BR |
| 10.1.3 | Create beginner/expert mode toggle | 1.3.4 | BQ |
| 10.1.4 | Implement progressive disclosure for complex panels | 10.1.3, Phase 6 complete | BR |
| 10.1.5 | Create search/filter for large parameter sets | 4.1.1 | BQ |
| 10.1.6 | Create keyboard shortcut system | 4.1.1 | BQ |

**Parallel Note:** Tasks 10.1.1, 10.1.3, 10.1.5, 10.1.6 can all run in parallel (Group BQ).

### P10.2 Accessibility
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 10.2.1 | Implement keyboard navigation for all interactive elements | Phase 4-9 complete | BS |
| 10.2.2 | Add ARIA labels and roles | Phase 4-9 complete | BS |
| 10.2.3 | Implement focus management for modals | 4.1.5 | BT |
| 10.2.4 | Create high-contrast theme option | 4.1.1 | BT |
| 10.2.5 | Test and fix screen reader compatibility | 10.2.1, 10.2.2 | BU |

**Parallel Note:** Tasks 10.2.1 and 10.2.2 can run in parallel (Group BS). Tasks 10.2.3 and 10.2.4 can run in parallel (Group BT).

### P10.3 Responsive Design
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 10.3.1 | Create responsive breakpoints and layouts | 4.1.1 | BV |
| 10.3.2 | Adapt audio matrix for mobile/tablet | 5.1.1, 10.3.1 | BW |
| 10.3.3 | Adapt pipeline builder for mobile/tablet | 5.2.1, 10.3.1 | BW |
| 10.3.4 | Create mobile-optimized navigation | 4.1.2, 4.1.3, 10.3.1 | BW |
| 10.3.5 | Test and fix touch interactions | 10.3.2, 10.3.3 | BX |

**Parallel Note:** Tasks 10.3.2, 10.3.3, 10.3.4 can run in parallel (Group BW).

---

## Phase 11: Error Handling & Edge Cases

### P11.1 Error Handling
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 11.1.1 | Create global error boundary component | 4.1.1 | BY |
| 11.1.2 | Create error notification/toast system | 4.1.1 | BY |
| 11.1.3 | Implement WebSocket error recovery | 2.1.3 | BZ |
| 11.1.4 | Implement configuration validation error display | 3.1.5, 4.1.5 | BZ |
| 11.1.5 | Create offline mode indicator and handling | 2.3.4 | BZ |
| 11.1.6 | Implement user-friendly error messages with solutions | 11.1.2, 11.1.4 | CA |

**Parallel Note:** Tasks 11.1.1 and 11.1.2 can run in parallel (Group BY). Tasks 11.1.3, 11.1.4, 11.1.5 can run in parallel (Group BZ).

---

## Phase 12: Testing & Documentation

### P12.1 Unit Testing
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 12.1.1 | Write unit tests for WebSocket commands | 2.2.x complete | CB |
| 12.1.2 | Write unit tests for configuration engine | 3.1.x, 3.2.x complete | CB |
| 12.1.3 | Write unit tests for filter response calculations | 7.2.3 | CB |
| 12.1.4 | Write component tests for all filter editors | 6.2.x complete | CB |

**Parallel Note:** All 12.1.x tasks can run in parallel (Group CB).

### P12.2 Integration Testing
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 12.2.1 | Write integration tests for connection flow | Phase 2 complete | CC |
| 12.2.2 | Write integration tests for configuration round-trip | Phase 3, Phase 9 complete | CC |
| 12.2.3 | Write integration tests for real-time control | Phase 4-7 complete | CC |
| 12.2.4 | Write E2E tests for critical user flows | All phases complete | CD |

**Parallel Note:** Tasks 12.2.1, 12.2.2, 12.2.3 can run in parallel (Group CC).

### P12.3 Documentation
| Task ID | Task | Dependencies | Parallel Group |
|---------|------|--------------|----------------|
| 12.3.1 | Create API documentation for WebSocket wrapper | Phase 2 complete | CE |
| 12.3.2 | Create component documentation (Storybook) | Phase 4-8 complete | CE |
| 12.3.3 | Create user guide for common workflows | All phases complete | CF |
| 12.3.4 | Create developer setup and contribution guide | 1.1.x complete | CE |

**Parallel Note:** Tasks 12.3.1, 12.3.2, 12.3.4 can run in parallel once their dependencies are met (Group CE).

---

## Dependency Graph Summary

```
Phase 1 (Foundation)
    └── Phase 2 (WebSocket) ─────────────────────────────────────┐
    └── Phase 3 (Config Engine) ─────────────────────────────────┤
    └── Phase 4 (Core UI) ──┬── Phase 5 (Matrix/Pipeline) ──────┤
                            ├── Phase 6 (Filter Editors) ────────┤
                            ├── Phase 7 (Monitoring) ────────────┤
                            └── Phase 8 (Device UI) ─────────────┤
                                                                 │
Phase 9 (Config Management) ─────────────────────────────────────┤
                                                                 │
Phase 10 (UX/Accessibility) ─────────────────────────────────────┤
                                                                 │
Phase 11 (Error Handling) ───────────────────────────────────────┤
                                                                 │
Phase 12 (Testing/Docs) ─────────────────────────────────────────┘
```

## Maximum Parallelization Strategy

For fastest development with multiple developers:

### Sprint 1 (Foundation)
- **Dev 1:** 1.1.1 → 1.1.2, 1.2.1, 1.3.1
- **Dev 2:** 1.1.1 → 1.1.3, 1.2.2, 3.1.1
- **Dev 3:** 1.1.1 → 1.1.5, 1.2.3, 1.2.4

### Sprint 2 (Core Infrastructure)
- **Dev 1:** 2.1.1 → 2.1.2 → 2.1.3, 2.2.1-2.2.4
- **Dev 2:** 2.2.5-2.2.8, 2.3.1 → 2.3.2-2.3.4
- **Dev 3:** 3.1.2, 3.1.3 → 3.1.4, 3.1.5
- **Dev 4:** 4.1.1 → 4.1.2-4.1.5

### Sprint 3 (Filters - High Parallelization)
- **Dev 1:** 3.2.1-3.2.3
- **Dev 2:** 3.2.4-3.2.6
- **Dev 3:** 3.2.7-3.2.9
- **Dev 4:** 3.2.10-3.2.11, 3.3.1-3.3.5
- **Dev 5:** 3.4.1 → 3.4.2-3.4.7

### Sprint 4 (UI Components - High Parallelization)
- **Dev 1:** 5.1.1 → 5.1.2-5.1.7
- **Dev 2:** 5.2.1 → 5.2.2-5.2.7
- **Dev 3:** 6.1.1 → 6.1.2-6.1.6
- **Dev 4:** 4.2.1-4.2.5, 4.3.1-4.3.5

### Sprint 5 (Filter Editors - Maximum Parallelization)
- **Dev 1:** 6.2.1, 6.2.2
- **Dev 2:** 6.2.3, 6.2.4, 6.2.5
- **Dev 3:** 6.2.6, 6.2.7, 6.2.8
- **Dev 4:** 6.2.9, 6.2.10, 6.2.11
- **Dev 5:** 6.2.12, 6.2.13, 6.3.1-6.3.5

### Sprint 6 (Monitoring & Device)
- **Dev 1:** 7.1.1 → 7.1.2-7.1.7
- **Dev 2:** 7.2.1 → 7.2.2 → 7.2.3-7.2.6
- **Dev 3:** 7.3.1-7.3.5
- **Dev 4:** 8.1.1-8.1.6, 8.2.1-8.2.5

### Sprint 7 (Polish & Testing)
- **Dev 1:** 9.1.1-9.1.4, 9.2.1-9.2.6
- **Dev 2:** 10.1.1-10.1.6
- **Dev 3:** 10.2.1-10.2.5, 10.3.1-10.3.5
- **Dev 4:** 11.1.1-11.1.6, 12.1.1-12.1.4

### Sprint 8 (Final Testing & Docs)
- All devs: 12.2.1-12.2.4, 12.3.1-12.3.4

---

## Critical Path

The longest dependency chain (critical path) is:

```
1.1.1 → 1.1.5 → 1.3.1 → 2.1.1 → 2.1.2 → 2.1.3 → 2.3.1 → 2.3.5 →
4.1.1 → 5.1.1 → 5.1.4 → 5.1.6 → 10.2.1 → 10.2.5 → 12.2.4
```

Focus resources on this path to minimize overall timeline.
