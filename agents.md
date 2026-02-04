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
