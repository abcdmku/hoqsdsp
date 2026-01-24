# Agent Context: Core UI Components

## Your Role
You are building the foundational UI components and application shell. These components will be used across the entire application.

## Design System

### Colors (Tailwind Classes)
```
Background:     bg-dsp-bg (#1a1a2e)
Surface:        bg-dsp-surface (#16213e)
Primary:        bg-dsp-primary (#0f3460)
Accent:         bg-dsp-accent (#e94560)
Meter Green:    bg-dsp-meter-green (#4ade80)
Meter Yellow:   bg-dsp-meter-yellow (#facc15)
Meter Red:      bg-dsp-meter-red (#ef4444)
```

### Typography
- Headings: `font-semibold`
- Body: `font-normal`
- Monospace for values: `font-mono`

### Spacing
- Use Tailwind spacing scale (4, 8, 12, 16, 24, 32, 48)
- Component padding: `p-4` minimum
- Section gaps: `gap-6`

## Task 4.1.1: Application Shell

Create `src/app/App.tsx`:
```tsx
export function App() {
  return (
    <div className="min-h-screen bg-dsp-bg text-white">
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet /> {/* React Router */}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
```

Create `src/app/providers.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" theme="dark" />
    </QueryClientProvider>
  );
}
```

## Task 4.1.2: Top Navigation Bar

Create `src/components/layout/TopNav.tsx`:

Features:
- Logo/app name on left
- Unit selector dropdown (shows connected units)
- Processing state indicator
- Settings button

```tsx
export function TopNav() {
  const activeUnit = useConnectionStore((s) => s.activeUnit);
  const units = useConnectionStore((s) => s.units);

  return (
    <header className="h-14 bg-dsp-surface border-b border-white/10 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Logo />
        <UnitSelector units={units} activeUnit={activeUnit} />
      </div>
      <div className="flex items-center gap-4">
        <ProcessingState />
        <SettingsButton />
      </div>
    </header>
  );
}
```

## Task 4.1.3: Sidebar Navigation

Create `src/components/layout/Sidebar.tsx`:

Navigation items:
- Dashboard
- Pipeline
- Filters
- Mixer
- Devices
- Monitoring
- Configuration

```tsx
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: GitBranch, label: 'Pipeline', path: '/pipeline' },
  { icon: Sliders, label: 'Filters', path: '/filters' },
  { icon: Merge, label: 'Mixer', path: '/mixer' },
  { icon: HardDrive, label: 'Devices', path: '/devices' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: FileJson, label: 'Config', path: '/config' },
];
```

## Task 4.1.4: Status Bar

Create `src/components/layout/StatusBar.tsx`:

Always visible at bottom, shows:
- Connection status (connected/disconnected with unit name)
- Processing state (Running/Paused/etc)
- Clipping indicator (red when clipping)
- Main volume fader (compact)
- Buffer level indicator

```tsx
export function StatusBar() {
  return (
    <footer className="h-10 bg-dsp-surface border-t border-white/10 px-4 flex items-center justify-between text-sm">
      <ConnectionIndicator />
      <ProcessingIndicator />
      <ClippingIndicator />
      <CompactVolume />
      <BufferIndicator />
    </footer>
  );
}
```

## Task 4.1.5: Modal/Dialog System

Use Radix UI Dialog as base:

```tsx
// src/components/ui/Dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function Dialog({ children, ...props }: DialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dsp-surface rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;
```

## Component Library Pattern

Use CVA (class-variance-authority) for variant components:

```tsx
// src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-dsp-accent text-white hover:bg-dsp-accent/90',
        secondary: 'bg-dsp-primary text-white hover:bg-dsp-primary/80',
        outline: 'border border-white/20 bg-transparent hover:bg-white/5',
        ghost: 'hover:bg-white/5',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-sm',
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
```

## Accessibility Requirements
- All interactive elements must be keyboard accessible
- Use `aria-label` for icon-only buttons
- Maintain focus management in modals
- Color contrast minimum 4.5:1

## Testing
- Use React Testing Library
- Test keyboard navigation
- Test screen reader accessibility
