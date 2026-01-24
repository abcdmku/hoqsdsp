# Agent Context: Channel Processing View

## Overview

Build the channel processing view - the main interface for viewing and editing audio channels. Each channel displays its processing chain with inline status indicators.

## Requirements

### Channel Strip Features
- Display channel number, name, source selector, processing blocks, meters, mute
- Processing blocks shown as compact indicators with active/bypassed state
- Color-coded by filter type (EQ=cyan, dynamics=orange, FIR=purple, etc.)
- Click any block to edit in detail panel
- Drag blocks to reorder processing chain
- Channel linking for stereo/group processing
- Solo and mute per channel

### Processing Block Indicators
- EQ block shows count of active bands (e.g., "3" or dots)
- Dynamics block shows type (CMP for compressor, GATE for gate)
- Delay block shows delay value in ms
- FIR block shows filename abbreviation
- Limiter block shows threshold
- Bypassed blocks dimmed with yellow tint
- Inactive/empty slots shown as gray placeholder

### Quick Actions
- Add filter buttons for common types (HP, LP, Peak, Comp, Delay, FIR)
- Right-click context menu for copy/paste/delete/bypass
- Double-click channel name to rename

## Filter Color Mapping

```typescript
const FILTER_COLORS = {
  eq: '#22d3ee',        // Cyan
  dynamics: '#fb923c', // Orange
  fir: '#a78bfa',      // Purple
  delay: '#60a5fa',    // Blue
  limiter: '#f87171',  // Red
  gain: '#4ade80',     // Green
  dither: '#f472b6',   // Pink
  bypassed: '#fbbf24', // Yellow
  inactive: '#4b5563', // Gray
};
```

## State Management

```typescript
// Selection state (Zustand)
interface UIState {
  selectedChannel: number | null;
  selectedFilter: string | null;
  setSelectedChannel: (index: number | null) => void;
  setSelectedFilter: (id: string | null) => void;
}

// Config from TanStack Query
const { data: config } = useQuery({
  queryKey: ['config', unitId],
  queryFn: () => wsManager.getConfig(),
});
```

## Accessibility
- Tab navigation between channels and filter blocks
- Arrow keys to navigate blocks within a channel
- Space/Enter to select
- Escape to deselect
- ARIA labels for all interactive elements
