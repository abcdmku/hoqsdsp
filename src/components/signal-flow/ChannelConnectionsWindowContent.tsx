import { Plus, Trash2 } from 'lucide-react';
import type { ChannelNode, ChannelSide, RouteEdge, RouteEndpoint } from '../../lib/signalflow';
import { sameEndpoint } from '../../lib/signalflow/endpointUtils';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { useState } from 'react';

export interface ChannelConnectionsWindowContentProps {
  node: ChannelNode;
  side: ChannelSide;
  routes: RouteEdge[];
  allInputs: ChannelNode[];
  allOutputs: ChannelNode[];
  onAddRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  onDeleteRoute: (routeIndex: number) => void;
  onEditRoute: (routeIndex: number) => void;
}

export function ChannelConnectionsWindowContent({
  node,
  side,
  routes,
  allInputs,
  allOutputs,
  onAddRoute,
  onDeleteRoute,
  onEditRoute,
}: ChannelConnectionsWindowContentProps) {
  const endpoint: RouteEndpoint = { deviceId: node.deviceId, channelIndex: node.channelIndex };

  // Get connections for this channel
  const connections = routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => {
      if (side === 'input') {
        return sameEndpoint(route.from, endpoint);
      }
      return sameEndpoint(route.to, endpoint);
    });

  // Available channels to connect to
  const availableTargets = side === 'input' ? allOutputs : allInputs;

  // Find channels not yet connected
  const unconnectedTargets = availableTargets.filter((target) => {
    const targetEndpoint: RouteEndpoint = { deviceId: target.deviceId, channelIndex: target.channelIndex };
    return !connections.some(({ route }) => {
      const connectedEndpoint = side === 'input' ? route.to : route.from;
      return sameEndpoint(connectedEndpoint, targetEndpoint);
    });
  });

  const [selectedNewTarget, setSelectedNewTarget] = useState<string>('');

  const handleAddConnection = () => {
    if (!selectedNewTarget) return;
    // Device IDs contain colons (e.g., "in:alsa"), so we need to split from the end
    const lastColonIndex = selectedNewTarget.lastIndexOf(':');
    if (lastColonIndex < 0) return;
    const deviceId = selectedNewTarget.slice(0, lastColonIndex);
    const channelIndexStr = selectedNewTarget.slice(lastColonIndex + 1);
    if (!deviceId || !channelIndexStr) return;
    const channelIndex = parseInt(channelIndexStr, 10);
    if (isNaN(channelIndex)) return;

    const targetEndpoint: RouteEndpoint = { deviceId, channelIndex };
    if (side === 'input') {
      onAddRoute(endpoint, targetEndpoint);
    } else {
      onAddRoute(targetEndpoint, endpoint);
    }
    setSelectedNewTarget('');
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted mb-2">
          {side === 'input' ? 'Connected Outputs' : 'Connected Inputs'}
        </div>

        {connections.length === 0 ? (
          <div className="text-sm text-dsp-text-muted py-2">
            No connections yet.
          </div>
        ) : (
          <div className="space-y-1">
            {connections.map(({ route, index }) => {
              const connectedEndpoint = side === 'input' ? route.to : route.from;
              const connectedNode = (side === 'input' ? allOutputs : allInputs).find(
                (n) => n.deviceId === connectedEndpoint.deviceId && n.channelIndex === connectedEndpoint.channelIndex,
              );

              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border border-dsp-primary/20 bg-dsp-bg px-3 py-2',
                    route.mute && 'opacity-50',
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-sm text-dsp-text hover:text-dsp-accent transition-colors"
                    onClick={() => { onEditRoute(index); }}
                  >
                    <span className="font-medium">{connectedNode?.label ?? 'Unknown'}</span>
                    {route.gain !== 0 && (
                      <span className="ml-2 text-xs text-dsp-text-muted">
                        {route.gain > 0 ? '+' : ''}{route.gain.toFixed(1)} dB
                      </span>
                    )}
                    {route.inverted && (
                      <span className="ml-1 text-xs text-filter-dynamics">Ø</span>
                    )}
                    {route.mute && (
                      <span className="ml-1 text-xs text-red-400">muted</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="p-1 text-dsp-text-muted hover:text-red-400 transition-colors"
                    onClick={() => { onDeleteRoute(index); }}
                    aria-label="Delete connection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-dsp-primary/20 pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-dsp-text-muted mb-2">
          Add Connection
        </div>
        <div className="flex gap-2">
          <Select value={selectedNewTarget} onValueChange={setSelectedNewTarget}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`Select ${side === 'input' ? 'output' : 'input'}...`} />
            </SelectTrigger>
            <SelectContent>
              {unconnectedTargets.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  All channels connected
                </SelectItem>
              ) : (
                unconnectedTargets.map((target) => (
                  <SelectItem
                    key={`${target.deviceId}:${target.channelIndex}`}
                    value={`${target.deviceId}:${target.channelIndex}`}
                  >
                    {target.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!selectedNewTarget || selectedNewTarget === '__none__'}
            onClick={handleAddConnection}
            aria-label="Add connection"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-xs text-dsp-text-muted">
        Click a connection to edit its gain and settings.
      </div>
    </div>
  );
}
