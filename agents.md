# Agent Guidelines for hoqsdsp

Target: Raspberry Pi (memory-constrained). Prevent memory leaks.

## Critical Rules

### 1. useEffect Always Needs Cleanup
```typescript
useEffect(() => {
  let alive = true;
  const interval = setInterval(() => { /* ... */ }, 1000);
  return () => {
    alive = false;
    clearInterval(interval);
  };
}, []);
```

### 2. Check `alive` Before AND After Async
```typescript
if (!alive) return;           // Before fetch - prevents unnecessary requests
const data = await fetch();
if (!alive) return;           // After fetch - prevents state updates on unmounted
setState(data);
```

### 3. Never Spread State for Dynamic Keys
```typescript
// BAD - orphaned keys accumulate forever
setState(prev => ({ ...prev, ...newData }));

// GOOD - replace completely
setState(newData);
```

### 4. WebSocket: Nullify ALL Handlers
```typescript
this.ws.onopen = null;
this.ws.onclose = null;
this.ws.onerror = null;
this.ws.onmessage = null;
this.ws.close();
```

### 5. EventEmitter: Remove Listeners on Dispose
```typescript
this.removeAllListeners();
```

### 6. Window Listeners: Track for Cleanup
```typescript
const cleanupRef = useRef<(() => void) | null>(null);

useEffect(() => () => cleanupRef.current?.(), []);

// When adding listeners:
cleanupRef.current = () => {
  window.removeEventListener('mousemove', handler);
};
```

### 7. Subscriptions: Check Validity Before Callback
```typescript
await Promise.all(promises);
if (!this.subscriptions.has(id)) return;  // Cancelled during poll
onData(data);
```

### 8. Clear Maps/Sets in Cleanup
```typescript
return () => {
  mapRef.current.clear();
  pendingRequests.clear();
};
```

## High-Frequency Code (60fps/Animation Loops)

### 9. Avoid Allocations in RAF Loops
```typescript
// BAD - creates new array every frame
return newLevels.map((level) => ({ ...level }));

// GOOD - only allocate if changed
let result = null;
for (let i = 0; i < newLevels.length; i++) {
  if (changed) {
    if (!result) result = channels.slice(0, i);
    result.push(newValue);
  } else if (result) {
    result.push(existing);
  }
}
return result ?? channels;
```

### 10. Cache String Keys
```typescript
// BAD - creates strings every frame
const key = `${prefix}-${index}`;

// GOOD - cache keys
const keyCache = new Map<string, string>();
function getKey(prefix: string, index: number): string {
  const k = `${prefix}-${index}`;
  return keyCache.get(k) ?? (keyCache.set(k, k), k);
}
```

### 11. Memoize Render Arrays
```typescript
// BAD - Array.from on every render
{Array.from({ length: count }, (_, i) => <div key={i} />)}

// GOOD - useMemo
const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
{indices.map((i) => <div key={i} />)}
```

### 12. Never Enqueue No-op `setState` in RAF Loops
React can still allocate internal update-queue nodes even when you `return prev`.
If a loop can finish (e.g., smoothing), stop scheduling RAF when it reaches its target and restart only when inputs change.

```typescript
// BAD - enqueues an update every frame (even if React bails out)
setState((prev) => prev);

setState((prev) => {
  if (!changed) return prev; // still enqueues an update
  return { ...prev, value };
});
```

```typescript
// GOOD - only call setState when something actually changed
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);

const animate = (t: number) => {
  const next = computeNext(stateRef.current, t);
  if (next !== stateRef.current) {
    stateRef.current = next;
    setState(next);
  }
  rafId = requestAnimationFrame(animate);
};
```

## Inline Parameter Editing Pattern

For compact inline controls that expand to show settings (like DTH), use this pattern:

### States
- `expanded`: Whether settings panel is visible
- `pinned`: Whether it stays open when mouse leaves

### Behavior Matrix
| Action | Result |
|--------|--------|
| Click toggle (off) | Enable + expand + pin |
| Click toggle (expanded + pinned) | Disable + collapse |
| Click toggle (expanded, not pinned) | Pin it |
| Click toggle (collapsed but enabled) | Expand + pin |
| Hover 400ms (enabled, collapsed) | Expand (not pinned) |
| Mouse leave (not pinned) | Collapse after 150ms |
| Interact with any control | Pin |
| Click outside | Collapse + unpin |
| Press Escape | Collapse + unpin |

### Implementation
```typescript
function ExpandableControl({ enabled, onToggle, ... }) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownOpenRef = useRef(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts
  useEffect(() => () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
  }, []);

  // Click outside + Escape handling
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpenRef.current) return;
      if (!containerRef.current?.contains(e.target as Node)) {
        setExpanded(false);
        setPinned(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dropdownOpenRef.current) {
        setExpanded(false);
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  // Auto-expand when enabled externally
  useEffect(() => {
    if (enabled) {
      setExpanded(true);
      setPinned(true);
    }
  }, [enabled]);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!enabled) {
      onToggle(); // Will auto-expand via useEffect
    } else if (expanded && pinned) {
      onToggle();
      setExpanded(false);
      setPinned(false);
    } else if (expanded && !pinned) {
      setPinned(true);
    } else {
      setExpanded(true);
      setPinned(true);
    }
  }, [enabled, expanded, pinned, onToggle]);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!expanded && enabled) {
      hoverTimeoutRef.current = setTimeout(() => setExpanded(true), 400);
    }
  }, [expanded, enabled]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (expanded && !pinned && !dropdownOpenRef.current) {
      leaveTimeoutRef.current = setTimeout(() => setExpanded(false), 150);
    }
  }, [expanded, pinned]);

  const handleInteraction = useCallback(() => {
    if (expanded && !pinned) setPinned(true);
  }, [expanded, pinned]);

  // Use Framer Motion for smooth width animation
  return (
    <motion.div ref={containerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button onClick={handleToggleClick}>Toggle</button>
      <AnimatePresence initial={false}>
        {expanded && enabled && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Controls - call handleInteraction on click/focus/change */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### Key Points
- Use `framer-motion` for smooth width animations (`width: 0` → `width: 'auto'`)
- Track dropdown/portal open state via ref to prevent premature collapse
- Pin on any interaction to avoid frustrating users mid-edit
- Short delays (150ms) on mouse leave prevent flicker during normal mouse movement

## Quick Checklist

- [ ] Every `setInterval`/`setTimeout` has matching `clear*` in cleanup
- [ ] Every `addEventListener` has matching `removeEventListener`
- [ ] Async operations check mounted state after `await`
- [ ] Dynamic state objects replaced, not spread-merged
- [ ] WebSocket handlers nullified before close
- [ ] Maps/Sets cleared on disposal
- [ ] Every RAF loop has matching `cancelAnimationFrame` in cleanup
- [ ] No allocations inside RAF/animation loops
- [ ] No no-op `setState` inside RAF loops (skip calling setState when unchanged)
- [ ] String keys cached for high-frequency lookups
- [ ] Render arrays memoized with useMemo
