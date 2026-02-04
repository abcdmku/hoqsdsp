import { ChevronDown, Plus, RotateCcw, Trash2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChannelNode, ChannelSide, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import { sameEndpoint } from '../../lib/signalflow/endpointUtils';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { GainInput } from '../ui/GainInput';
import { Switch } from '../ui/Switch';

export interface ChannelConnectionsWindowContentProps {
  node: ChannelNode;
  side: ChannelSide;
  routes: RouteEdge[];
  allInputs: ChannelNode[];
  allOutputs: ChannelNode[];
  onAddRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  onUpdateRoute: (routeIndex: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  onDeleteRoute: (routeIndex: number) => void;
}

export function ChannelConnectionsWindowContent({
  node,
  side,
  routes,
  allInputs,
  allOutputs,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: ChannelConnectionsWindowContentProps) {
  const endpoint: RouteEndpoint = { deviceId: node.deviceId, channelIndex: node.channelIndex };

  const connections = routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => {
      if (side === 'input') return sameEndpoint(route.from, endpoint);
      return sameEndpoint(route.to, endpoint);
    });

  const availableTargets = side === 'input' ? allOutputs : allInputs;
  const unconnectedTargets = availableTargets.filter((target) => {
    const targetEndpoint: RouteEndpoint = { deviceId: target.deviceId, channelIndex: target.channelIndex };
    return !connections.some(({ route }) => {
      const connectedEndpoint = side === 'input' ? route.to : route.from;
      return sameEndpoint(connectedEndpoint, targetEndpoint);
    });
  });

  const phaseSymbol = '\u00d8';

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [connectionSearch, setConnectionSearch] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(() => new Set());

  const bulkSearchRef = useRef<HTMLInputElement | null>(null);
  const bulkItemRefs = useRef<(HTMLInputElement | null)[]>([]);

  const searchQuery = bulkSearch.trim().toLowerCase();
  const filteredTargets = searchQuery
    ? unconnectedTargets.filter((t) => t.label.toLowerCase().includes(searchQuery))
    : unconnectedTargets;

  useEffect(() => {
    if (bulkOpen) bulkSearchRef.current?.focus();
  }, [bulkOpen]);

  useEffect(() => {
    const available = new Set(unconnectedTargets.map((t) => `${t.deviceId}:${String(t.channelIndex)}`));
    setBulkSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (available.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [unconnectedTargets]);

  const parseTargetKey = (key: string): RouteEndpoint | null => {
    if (!key) return null;
    // Device IDs contain colons (e.g., "in:alsa"), so split from the end.
    const lastColonIndex = key.lastIndexOf(':');
    if (lastColonIndex < 0) return null;
    const deviceId = key.slice(0, lastColonIndex);
    const channelIndexStr = key.slice(lastColonIndex + 1);
    if (!deviceId || !channelIndexStr) return null;
    const channelIndex = parseInt(channelIndexStr, 10);
    if (Number.isNaN(channelIndex)) return null;
    return { deviceId, channelIndex };
  };

  const addSelectedTargets = () => {
    if (bulkSelected.size === 0) return;

    for (const key of bulkSelected) {
      const targetEndpoint = parseTargetKey(key);
      if (!targetEndpoint) continue;
      if (side === 'input') onAddRoute(endpoint, targetEndpoint);
      else onAddRoute(targetEndpoint, endpoint);
    }

    setBulkSelected(new Set());
    bulkSearchRef.current?.focus();
  };

  // Filter connections by search
  const connectionSearchQuery = connectionSearch.trim().toLowerCase();
  const filteredConnections = connectionSearchQuery
    ? connections.filter(({ route }) => {
        const connectedEndpoint = side === 'input' ? route.to : route.from;
        const connectedNode = (side === 'input' ? allOutputs : allInputs).find(
          (n) => n.deviceId === connectedEndpoint.deviceId && n.channelIndex === connectedEndpoint.channelIndex,
        );
        return connectedNode?.label.toLowerCase().includes(connectionSearchQuery);
      })
    : connections;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
            {side === 'input' ? 'Connected Outputs' : 'Connected Inputs'} ({connections.length})
          </div>
        </div>

        {/* Search filter for connections */}
        {connections.length > 3 && (
          <div className="mb-2">
            <input
              value={connectionSearch}
              onChange={(e) => setConnectionSearch(e.target.value)}
              className={cn(
                'h-8 w-full rounded-md border border-dsp-primary/40 bg-dsp-bg px-3',
                'text-sm text-dsp-text placeholder:text-dsp-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent/50',
              )}
              placeholder="Filter connections..."
              aria-label="Filter connections"
            />
          </div>
        )}

        {connections.length === 0 ? (
          <div className="py-2 text-sm text-dsp-text-muted">No connections yet.</div>
        ) : filteredConnections.length === 0 ? (
          <div className="py-2 text-sm text-dsp-text-muted">No matching connections.</div>
        ) : (
          <div className="space-y-1">
            {filteredConnections.map(({ route, index }) => {
              const connectedEndpoint = side === 'input' ? route.to : route.from;
              const connectedNode = (side === 'input' ? allOutputs : allInputs).find(
                (n) => n.deviceId === connectedEndpoint.deviceId && n.channelIndex === connectedEndpoint.channelIndex,
              );

              const key = `${route.from.deviceId}:${route.from.channelIndex}->${route.to.deviceId}:${route.to.channelIndex}`;
              const expanded = expandedKey === key;

              return (
                <div
                  key={key}
                  className={cn('rounded-md border border-dsp-primary/20 bg-dsp-bg', route.mute && 'opacity-60')}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <button
                      type="button"
                      className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => {
                        setExpandedKey((prev) => (prev === key ? null : key));
                      }}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} connection controls`}
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-dsp-text-muted transition-transform group-hover:text-dsp-accent',
                          expanded && 'rotate-180',
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate text-sm font-medium text-dsp-text group-hover:text-dsp-accent transition-colors">
                            {connectedNode?.label ?? 'Unknown'}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-xs text-dsp-text-muted">
                            {route.gain !== 0 && (
                              <span className="font-mono">
                                {route.gain > 0 ? '+' : ''}
                                {route.gain.toFixed(1)} dB
                              </span>
                            )}
                            {route.inverted && (
                              <span
                                className="font-semibold text-filter-dynamics"
                                aria-label="Phase inverted"
                                title="Phase inverted"
                              >
                                {phaseSymbol}
                              </span>
                            )}
                            {route.mute && (
                              <span aria-label="Muted" title="Muted" className="text-red-400">
                                <VolumeX className="inline-block h-3.5 w-3.5" />
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="p-1 text-dsp-text-muted transition-colors hover:text-red-400"
                      onClick={() => {
                        onDeleteRoute(index);
                      }}
                      aria-label="Disconnect"
                      title="Disconnect"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="space-y-3 border-t border-dsp-primary/20 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
                            Gain
                          </div>
                          <GainInput
                            value={route.gain}
                            ariaLabel={`Gain for ${connectedNode?.label ?? 'connection'}`}
                            onChange={(value) => {
                              onUpdateRoute(index, { gain: value }, { debounce: true });
                            }}
                            min={-60}
                            max={24}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          aria-label="Reset gain to 0 dB"
                          title="Reset gain"
                          onClick={() => {
                            onUpdateRoute(index, { gain: 0 });
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center justify-between gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/30 px-3 py-2">
                          <span className="text-sm text-dsp-text">Phase</span>
                          <Switch
                            checked={route.inverted}
                            onCheckedChange={(checked) => {
                              onUpdateRoute(index, { inverted: checked });
                            }}
                            aria-label="Invert phase"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/30 px-3 py-2">
                          <span className="text-sm text-dsp-text">Mute</span>
                          <Switch
                            checked={route.mute}
                            onCheckedChange={(checked) => {
                              onUpdateRoute(index, { mute: checked });
                            }}
                            aria-label="Mute route"
                          />
                        </label>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            onDeleteRoute(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-dsp-primary/20 pt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
          Add {side === 'input' ? 'Outputs' : 'Inputs'}
        </div>

        {unconnectedTargets.length === 0 ? (
          <div className="py-2 text-sm text-dsp-text-muted">All channels connected.</div>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkOpen((prev) => !prev);
              }}
              aria-expanded={bulkOpen}
              aria-label={`Bulk add ${side === 'input' ? 'outputs' : 'inputs'}`}
            >
              <Plus className="h-4 w-4" />
              Add {side === 'input' ? 'outputs' : 'inputs'}...
            </Button>

            {bulkOpen && (
              <div className="space-y-2 rounded-md border border-dsp-primary/20 bg-dsp-bg/20 p-3">
                <input
                  ref={bulkSearchRef}
                  value={bulkSearch}
                  onChange={(e) => {
                    setBulkSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      bulkItemRefs.current[0]?.focus();
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSelectedTargets();
                    }
                  }}
                  className={cn(
                    'h-10 w-full rounded-md border border-dsp-primary/40 bg-dsp-bg px-3',
                    'text-sm text-dsp-text placeholder:text-dsp-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-dsp-accent/50',
                  )}
                  placeholder={`Search ${side === 'input' ? 'outputs' : 'inputs'}...`}
                  aria-label={`Search ${side === 'input' ? 'outputs' : 'inputs'}`}
                />

                <div className="max-h-56 space-y-1 overflow-auto">
                  {filteredTargets.length === 0 ? (
                    <div className="py-2 text-xs text-dsp-text-muted">No matches.</div>
                  ) : (
                    filteredTargets.map((target, idx) => {
                      const targetKey = `${target.deviceId}:${String(target.channelIndex)}`;
                      const checked = bulkSelected.has(targetKey);

                      return (
                        <label
                          key={targetKey}
                          className={cn(
                            'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm',
                            'hover:bg-dsp-primary/15',
                          )}
                        >
                          <input
                            ref={(el) => {
                              bulkItemRefs.current[idx] = el;
                            }}
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setBulkSelected((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(targetKey);
                                else next.delete(targetKey);
                                return next;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                bulkItemRefs.current[idx + 1]?.focus();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (idx === 0) bulkSearchRef.current?.focus();
                                else bulkItemRefs.current[idx - 1]?.focus();
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                addSelectedTargets();
                              }
                            }}
                            aria-label={`Select ${target.label}`}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-dsp-text">{target.label}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-dsp-text-muted">{bulkSelected.size} selected</div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBulkSelected(new Set());
                        bulkSearchRef.current?.focus();
                      }}
                      disabled={bulkSelected.size === 0}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={addSelectedTargets}
                      disabled={bulkSelected.size === 0}
                    >
                      Add selected
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-dsp-text-muted">Tip: Arrow keys move, Space toggles, Enter adds.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-dsp-text-muted">
        Expand a row to adjust gain, phase, and mute without leaving Signal Flow.
      </div>
    </div>
  );
}
