# Agent Context: Code Standards & Quality Guide

## Overview

This context defines the coding standards, patterns, and quality requirements for all code in the CamillaDSP Frontend project. Use this as a reference for code review and refactoring tasks.

## TypeScript Standards

### Strict Mode Requirements
- Enable all strict flags in tsconfig.json
- No `any` types except when interfacing with external untyped libraries
- Explicit return types on all exported functions
- No implicit `undefined` returns

### Type Definitions
```typescript
// ✓ Good: Explicit interface with JSDoc
/** Represents a CamillaDSP unit on the network */
interface UnitInfo {
  id: string;
  name: string;
  address: string;
  port: number;
  status: ConnectionStatus;
}

// ✗ Bad: Inline object types, no documentation
function connect(unit: { id: string; addr: string }) { ... }
```

### Null Handling
```typescript
// ✓ Good: Explicit null checks with early returns
function getUnitName(unit: UnitInfo | null): string {
  if (!unit) return 'Unknown';
  return unit.name;
}

// ✗ Bad: Non-null assertions
function getUnitName(unit: UnitInfo | null): string {
  return unit!.name;
}
```

### Enums vs Union Types
```typescript
// ✓ Good: String literal unions for simple cases
type ConnectionStatus = 'connected' | 'disconnected' | 'error';

// ✓ Good: Const objects for values needing runtime access
const FilterType = {
  Highpass: 'Highpass',
  Lowpass: 'Lowpass',
  Peaking: 'Peaking',
} as const;
type FilterType = typeof FilterType[keyof typeof FilterType];
```

## React Component Standards

### Component Structure
```typescript
// Standard order for component files:
// 1. Imports (external, internal, types, styles)
// 2. Type definitions (Props, State interfaces)
// 3. Component function
// 4. Helper functions (if component-specific)
// 5. Export

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { EQBand } from '@/types/filters.types';

interface EQNodeProps {
  band: EQBand;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<EQBand>) => void;
}

export function EQNode({ band, isSelected, onSelect, onChange }: EQNodeProps) {
  // Component implementation
}
```

### Props Interface Naming
- Always suffix with `Props`: `ButtonProps`, `EQNodeProps`
- Export props interfaces for reusable components
- Use `children?: React.ReactNode` for wrapper components

### Event Handlers
```typescript
// ✓ Good: Descriptive handler names, useCallback for stability
const handleFrequencyChange = useCallback((newFreq: number) => {
  onChange({ freq: newFreq });
}, [onChange]);

// ✗ Bad: Anonymous handlers in JSX, generic names
<Slider onChange={(v) => onChange({ freq: v })} />
```

### Conditional Rendering
```typescript
// ✓ Good: Early returns for complex conditions
if (!isVisible) return null;
if (isLoading) return <Spinner />;

return (
  <div>
    {/* Main content */}
  </div>
);

// ✗ Bad: Nested ternaries
return isVisible ? (isLoading ? <Spinner /> : <Content />) : null;
```

## Styling Standards (Tailwind CSS)

### Dark Theme Colors
```typescript
// Use semantic color names defined in tailwind.config.ts
const THEME_COLORS = {
  bg: 'bg-dsp-bg',           // Main background (#0a0a0a)
  surface: 'bg-dsp-surface', // Card/panel background (#1a1a1a)
  accent: 'bg-dsp-accent',   // Primary accent (cyan-400)
  border: 'border-white/10', // Subtle borders
  text: 'text-white',        // Primary text
  muted: 'text-gray-400',    // Secondary text
};
```

### Filter Type Color Coding
```typescript
const FILTER_COLORS = {
  eq: 'bg-cyan-500',         // EQ/Biquad filters
  dynamics: 'bg-orange-500', // Compressor, Gate
  fir: 'bg-purple-500',      // Convolution/FIR
  delay: 'bg-blue-500',      // Delay
  limiter: 'bg-red-500',     // Limiter
  gain: 'bg-green-500',      // Gain/Volume
  dither: 'bg-pink-500',     // Dither
  bypassed: 'bg-yellow-500', // Bypassed state
  inactive: 'bg-gray-600',   // Empty/inactive
};
```

### Class Organization
```typescript
// ✓ Good: Logical grouping with cn()
className={cn(
  // Layout
  "flex items-center gap-2",
  // Sizing
  "w-16 h-10",
  // Appearance
  "rounded-lg border",
  // Interactive states
  "hover:bg-white/5 focus:ring-2 focus:ring-dsp-accent",
  // Conditional
  isSelected && "ring-2 ring-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)}
```

## State Management Standards

### Zustand Store Structure
```typescript
// Each store in its own file with clear interface
interface ConnectionState {
  // State
  status: ConnectionStatus;
  units: UnitInfo[];
  activeUnitId: string | null;

  // Actions (verb prefixes)
  connect: (address: string, port: number) => Promise<void>;
  disconnect: () => void;
  setActiveUnit: (id: string) => void;

  // Derived (get prefix)
  getActiveUnit: () => UnitInfo | null;
}
```

### TanStack Query Patterns
```typescript
// Query keys as const arrays
const queryKeys = {
  units: ['units'] as const,
  unit: (id: string) => ['units', id] as const,
  config: (unitId: string) => ['config', unitId] as const,
};

// Consistent query hook pattern
export function useUnitConfig(unitId: string) {
  return useQuery({
    queryKey: queryKeys.config(unitId),
    queryFn: () => wsManager.getConfig(unitId),
    staleTime: 5000,
  });
}
```

## Accessibility Requirements

### Keyboard Navigation
- All interactive elements focusable via Tab
- Arrow keys for grid/list navigation
- Escape to close modals/deselect
- Space/Enter to activate

### ARIA Labels
```typescript
// ✓ Good: Descriptive labels for screen readers
<button
  aria-label={`${band.type} filter at ${band.freq}Hz`}
  aria-pressed={isSelected}
>

// ✓ Good: Live regions for dynamic content
<div role="status" aria-live="polite">
  {connectionStatus}
</div>
```

### Focus Management
```typescript
// Return focus after modal close
const previousFocus = useRef<HTMLElement>();

useEffect(() => {
  if (isOpen) {
    previousFocus.current = document.activeElement as HTMLElement;
  } else {
    previousFocus.current?.focus();
  }
}, [isOpen]);
```

## Error Handling Standards

### Async Operations
```typescript
// ✓ Good: Explicit error handling with user feedback
async function saveConfig(config: CamillaConfig): Promise<void> {
  try {
    await wsManager.setConfig(config);
    toast.success('Configuration saved');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to save: ${message}`);
    throw error; // Re-throw for caller handling
  }
}
```

### Form Validation
```typescript
// Use Zod schemas for validation
const configSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().ip({ message: 'Valid IP address required' }),
  port: z.number().int().min(1).max(65535),
});
```

## Performance Guidelines

### Memoization
```typescript
// Memoize expensive calculations
const frequencyResponse = useMemo(() => {
  return calculateResponse(bands, sampleRate);
}, [bands, sampleRate]);

// Memoize callbacks passed to children
const handleChange = useCallback((value: number) => {
  onChange({ gain: value });
}, [onChange]);
```

### Render Optimization
```typescript
// Use React.memo for pure components
export const LevelMeter = React.memo(function LevelMeter({
  level
}: LevelMeterProps) {
  return <div style={{ height: `${level}%` }} />;
});

// Avoid object literals in JSX
// ✗ Bad: Creates new object every render
<Component style={{ color: 'red' }} />

// ✓ Good: Stable reference
const styles = { color: 'red' };
<Component style={styles} />
```

## File Organization

### Directory Structure
```
src/
├── app/                 # App shell, routing
├── components/
│   ├── ui/             # Reusable primitives (Button, Slider, etc.)
│   ├── layout/         # Shell components (TopNav, Sidebar, etc.)
│   ├── channel-strip/  # Channel strip feature components
│   ├── eq-editor/      # EQ editor feature components
│   ├── routing/        # Routing matrix components
│   └── monitoring/     # Level meters, metrics
├── features/           # Feature-specific logic/hooks
├── hooks/              # Shared custom hooks
├── lib/
│   ├── dsp/           # DSP calculations, filter math
│   ├── websocket/     # WebSocket management
│   └── utils/         # General utilities
├── stores/            # Zustand stores
└── types/             # TypeScript type definitions
```

### Import Order
```typescript
// 1. React/external libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// 3. Relative imports
import { BandSelector } from './BandSelector';

// 4. Types (with type keyword)
import type { EQBand } from '@/types/filters.types';

// 5. Styles/assets
import './EQEditor.css';
```

## Code Review Checklist

### Must Pass
- [ ] No TypeScript errors or warnings
- [ ] No `any` types without justification
- [ ] All exports have explicit return types
- [ ] Proper error handling for async operations
- [ ] Keyboard accessible interactive elements
- [ ] ARIA labels for screen readers
- [ ] Uses semantic color variables
- [ ] Follows component structure conventions

### Should Pass
- [ ] Memoization for expensive operations
- [ ] Callbacks wrapped in useCallback when passed as props
- [ ] No inline object/array literals in JSX
- [ ] Consistent naming conventions
- [ ] JSDoc comments for exported functions
- [ ] Unit tests for utility functions

### Nice to Have
- [ ] Storybook stories for UI components
- [ ] E2E tests for critical paths
- [ ] Performance profiling for complex components
