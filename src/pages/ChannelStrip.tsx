import { useState, useCallback, useMemo } from 'react';
import { Plus, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useConnectionStore } from '../stores/connectionStore';
import { Button } from '../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/Tooltip';
import { ChannelStrip } from '../components/channel-strip/ChannelStrip';
import { QuickAddMenu } from '../components/channel-strip/QuickAddMenu';
import type { FilterConfig, FilterType } from '../types';

// Mock pipeline data for development - will be replaced with real data from TanStack Query
interface ChannelFilter {
  id: string;
  name: string;
  config: FilterConfig;
  bypassed: boolean;
}

interface ChannelData {
  id: number;
  name: string;
  filters: ChannelFilter[];
  muted: boolean;
  solo: boolean;
  gain: number;
  inputLevel: number;
  outputLevel: number;
}

const mockChannels: ChannelData[] = [
  {
    id: 0,
    name: 'Left',
    filters: [
      {
        id: 'hp-left',
        name: 'High Pass',
        config: { type: 'Biquad', parameters: { type: 'Highpass', freq: 80, q: 0.707 } },
        bypassed: false,
      },
      {
        id: 'peak1-left',
        name: 'Peak EQ 1',
        config: { type: 'Biquad', parameters: { type: 'Peaking', freq: 250, gain: -3, q: 1.4 } },
        bypassed: false,
      },
      {
        id: 'peak2-left',
        name: 'Peak EQ 2',
        config: { type: 'Biquad', parameters: { type: 'Peaking', freq: 3000, gain: 2, q: 2 } },
        bypassed: true,
      },
      {
        id: 'delay-left',
        name: 'Delay',
        config: { type: 'Delay', parameters: { delay: 2.5, unit: 'ms', subsample: true } },
        bypassed: false,
      },
    ],
    muted: false,
    solo: false,
    gain: 0,
    inputLevel: -18,
    outputLevel: -12,
  },
  {
    id: 1,
    name: 'Right',
    filters: [
      {
        id: 'hp-right',
        name: 'High Pass',
        config: { type: 'Biquad', parameters: { type: 'Highpass', freq: 80, q: 0.707 } },
        bypassed: false,
      },
      {
        id: 'peak1-right',
        name: 'Peak EQ 1',
        config: { type: 'Biquad', parameters: { type: 'Peaking', freq: 250, gain: -3, q: 1.4 } },
        bypassed: false,
      },
      {
        id: 'comp-right',
        name: 'Compressor',
        config: {
          type: 'Compressor',
          parameters: { channels: 1, threshold: -20, factor: 4, attack: 5, release: 100 },
        },
        bypassed: false,
      },
    ],
    muted: false,
    solo: false,
    gain: -1.5,
    inputLevel: -20,
    outputLevel: -14,
  },
  {
    id: 2,
    name: 'Sub',
    filters: [
      {
        id: 'lp-sub',
        name: 'Low Pass',
        config: { type: 'Biquad', parameters: { type: 'Lowpass', freq: 120, q: 0.707 } },
        bypassed: false,
      },
      {
        id: 'gain-sub',
        name: 'Gain',
        config: { type: 'Gain', parameters: { gain: 6, scale: 'dB' } },
        bypassed: false,
      },
    ],
    muted: false,
    solo: false,
    gain: 3,
    inputLevel: -24,
    outputLevel: -18,
  },
];

/**
 * Channel Strip View - Main interface for viewing and editing audio channels.
 * Displays processing chains with inline status indicators.
 */
export function ChannelStripPage() {
  const selectedChannel = useUIStore((state) => state.selectedChannel);
  const selectedFilter = useUIStore((state) => state.selectedFilter);
  const setSelectedChannel = useUIStore((state) => state.setSelectedChannel);
  const setSelectedFilter = useUIStore((state) => state.setSelectedFilter);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

  const [channels, setChannels] = useState<ChannelData[]>(mockChannels);
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddTarget, setQuickAddTarget] = useState<{ channelId: number; position: number } | null>(null);

  // Check if any channel is soloed
  const hasSoloedChannel = useMemo(() => channels.some((ch) => ch.solo), [channels]);

  // Handle channel selection
  const handleChannelSelect = useCallback(
    (channelId: number) => {
      setSelectedChannel(channelId === selectedChannel ? null : channelId);
      setSelectedFilter(null);
    },
    [selectedChannel, setSelectedChannel, setSelectedFilter]
  );

  // Handle filter selection
  const handleFilterSelect = useCallback(
    (channelId: number, filterId: string) => {
      setSelectedChannel(channelId);
      setSelectedFilter(filterId === selectedFilter ? null : filterId);
    },
    [selectedFilter, setSelectedChannel, setSelectedFilter]
  );

  // Handle filter bypass toggle
  const handleFilterBypass = useCallback((channelId: number, filterId: string) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        return {
          ...ch,
          filters: ch.filters.map((f) => (f.id === filterId ? { ...f, bypassed: !f.bypassed } : f)),
        };
      })
    );
  }, []);

  // Handle filter delete
  const handleFilterDelete = useCallback(
    (channelId: number, filterId: string) => {
      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id !== channelId) return ch;
          return {
            ...ch,
            filters: ch.filters.filter((f) => f.id !== filterId),
          };
        })
      );
      if (selectedFilter === filterId) {
        setSelectedFilter(null);
      }
    },
    [selectedFilter, setSelectedFilter]
  );

  // Handle filter reorder
  const handleFilterReorder = useCallback((channelId: number, fromIndex: number, toIndex: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        const newFilters = [...ch.filters];
        const [removed] = newFilters.splice(fromIndex, 1);
        if (removed) {
          newFilters.splice(toIndex, 0, removed);
        }
        return { ...ch, filters: newFilters };
      })
    );
  }, []);

  // Handle mute toggle
  const handleMuteToggle = useCallback((channelId: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, muted: !ch.muted } : ch))
    );
  }, []);

  // Handle solo toggle
  const handleSoloToggle = useCallback((channelId: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, solo: !ch.solo } : ch))
    );
  }, []);

  // Handle gain change
  const handleGainChange = useCallback((channelId: number, gain: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, gain } : ch))
    );
  }, []);

  // Handle quick add filter
  const handleQuickAdd = useCallback((channelId: number, position: number) => {
    setQuickAddTarget({ channelId, position });
    setQuickAddMenuOpen(true);
  }, []);

  // Handle filter type selection from quick add menu
  const handleAddFilter = useCallback(
    (filterType: FilterType) => {
      if (!quickAddTarget) return;

      const newFilter = {
        id: `${filterType.toLowerCase()}-${String(Date.now())}`,
        name: filterType,
        config: getDefaultFilter(filterType),
        bypassed: false,
      };

      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id !== quickAddTarget.channelId) return ch;
          const newFilters = [...ch.filters];
          newFilters.splice(quickAddTarget.position, 0, newFilter);
          return { ...ch, filters: newFilters };
        })
      );

      setQuickAddMenuOpen(false);
      setQuickAddTarget(null);
      setSelectedFilter(newFilter.id);
    },
    [quickAddTarget, setSelectedFilter]
  );

  // Handle clear all solo
  const handleClearSolo = useCallback(() => {
    setChannels((prev) => prev.map((ch) => ({ ...ch, solo: false })));
  }, []);

  // Handle mute all
  const handleMuteAll = useCallback(() => {
    const allMuted = channels.every((ch) => ch.muted);
    setChannels((prev) => prev.map((ch) => ({ ...ch, muted: !allMuted })));
  }, [channels]);

  // Empty state when no unit is selected
  if (!activeUnitId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <Volume2 className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Unit Selected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Select a CamillaDSP unit from the dashboard to view and edit its channels.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dsp-primary/30 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-dsp-text">Channels</h1>
            <p className="text-sm text-dsp-text-muted">
              {channels.length} channel{channels.length !== 1 ? 's' : ''} configured
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasSoloedChannel && (
              <Button variant="secondary" size="sm" onClick={handleClearSolo}>
                Clear Solo
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleMuteAll} aria-label="Mute/Unmute all">
                  {channels.every((ch) => ch.muted) ? (
                    <VolumeX className="h-5 w-5 text-meter-red" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {channels.every((ch) => ch.muted) ? 'Unmute all' : 'Mute all'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Refresh">
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh channels</TooltipContent>
            </Tooltip>

            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Channel
            </Button>
          </div>
        </div>

        {/* Channel strips container */}
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {channels.map((channel) => (
            <ChannelStrip
              key={channel.id}
              channelId={channel.id}
              name={channel.name}
              filters={channel.filters}
              muted={channel.muted}
              solo={channel.solo}
              gain={channel.gain}
              inputLevel={channel.inputLevel}
              outputLevel={channel.outputLevel}
              isSelected={selectedChannel === channel.id}
              selectedFilterId={selectedChannel === channel.id ? selectedFilter : null}
              isMutedBySolo={hasSoloedChannel && !channel.solo && !channel.muted}
              onSelect={() => { handleChannelSelect(channel.id); }}
              onMuteToggle={() => { handleMuteToggle(channel.id); }}
              onSoloToggle={() => { handleSoloToggle(channel.id); }}
              onGainChange={(gain) => { handleGainChange(channel.id, gain); }}
              onFilterSelect={(filterId) => { handleFilterSelect(channel.id, filterId); }}
              onFilterBypass={(filterId) => { handleFilterBypass(channel.id, filterId); }}
              onFilterDelete={(filterId) => { handleFilterDelete(channel.id, filterId); }}
              onFilterReorder={(from, to) => { handleFilterReorder(channel.id, from, to); }}
              onQuickAdd={(pos) => { handleQuickAdd(channel.id, pos); }}
            />
          ))}
        </div>

        {/* Quick Add Menu */}
        <QuickAddMenu
          open={quickAddMenuOpen}
          onOpenChange={setQuickAddMenuOpen}
          onSelect={handleAddFilter}
        />
      </div>
  );
}

// Helper function to get default filter configuration
function getDefaultFilter(filterType: FilterType): FilterConfig {
  switch (filterType) {
    case 'Biquad':
      return { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } };
    case 'Delay':
      return { type: 'Delay', parameters: { delay: 0, unit: 'ms', subsample: true } };
    case 'Gain':
      return { type: 'Gain', parameters: { gain: 0, scale: 'dB' } };
    case 'Compressor':
      return { type: 'Compressor', parameters: { channels: 1, threshold: -20, factor: 4, attack: 5, release: 100 } };
    case 'NoiseGate':
      return { type: 'NoiseGate', parameters: { channels: 1, threshold: -60, attack: 1, release: 50, hold: 100 } };
    case 'Conv':
      return { type: 'Conv', parameters: { type: 'Wav', filename: '' } };
    case 'Dither':
      return { type: 'Dither', parameters: { type: 'Simple', bits: 16 } };
    case 'Volume':
      return { type: 'Volume', parameters: {} };
    case 'Loudness':
      return { type: 'Loudness', parameters: { reference_level: -25, high_boost: 5, low_boost: 10 } };
    case 'DiffEq':
      return { type: 'DiffEq', parameters: { a: [1], b: [1] } };
    default:
      return { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } };
  }
}
