import { useState, useCallback, useMemo } from 'react';
import { Plus, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useConnectionStore } from '../stores/connectionStore';
import { Page, PageBody, PageHeader } from '../components/layout';
import { Button } from '../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/Tooltip';
import { ChannelStrip } from '../components/channel-strip/ChannelStrip';
import { QuickAddMenu } from '../components/channel-strip/QuickAddMenu';
import type { FilterConfig, FilterType } from '../types';

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

export function ChannelStripPage() {
  const selectedChannel = useUIStore((state) => state.selectedChannel);
  const selectedFilter = useUIStore((state) => state.selectedFilter);
  const setSelectedChannel = useUIStore((state) => state.setSelectedChannel);
  const setSelectedFilter = useUIStore((state) => state.setSelectedFilter);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);

  const [channels, setChannels] = useState<ChannelData[]>(mockChannels);
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [quickAddTarget, setQuickAddTarget] = useState<{ channelId: number; position: number } | null>(null);

  const hasSoloedChannel = useMemo(() => channels.some((ch) => ch.solo), [channels]);

  const handleChannelSelect = useCallback(
    (channelId: number) => {
      setSelectedChannel(channelId === selectedChannel ? null : channelId);
      setSelectedFilter(null);
    },
    [selectedChannel, setSelectedChannel, setSelectedFilter]
  );

  const handleFilterSelect = useCallback(
    (channelId: number, filterId: string) => {
      setSelectedChannel(channelId);
      setSelectedFilter(filterId === selectedFilter ? null : filterId);
    },
    [selectedFilter, setSelectedChannel, setSelectedFilter]
  );

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

  const handleFilterDelete = useCallback((channelId: number, filterId: string) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        return { ...ch, filters: ch.filters.filter((f) => f.id !== filterId) };
      })
    );
    if (selectedFilter === filterId) setSelectedFilter(null);
  }, [selectedFilter, setSelectedFilter]);

  const handleFilterReorder = useCallback((channelId: number, fromIndex: number, toIndex: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        const next = [...ch.filters];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return ch;
        next.splice(toIndex, 0, moved);
        return { ...ch, filters: next };
      })
    );
  }, []);

  const handleMuteToggle = useCallback((channelId: number) => {
    setChannels((prev) => prev.map((ch) => (ch.id === channelId ? { ...ch, muted: !ch.muted } : ch)));
  }, []);

  const handleSoloToggle = useCallback((channelId: number) => {
    setChannels((prev) => prev.map((ch) => (ch.id === channelId ? { ...ch, solo: !ch.solo } : ch)));
  }, []);

  const handleClearSolo = useCallback(() => {
    setChannels((prev) => prev.map((ch) => (ch.solo ? { ...ch, solo: false } : ch)));
  }, []);

  const handleGainChange = useCallback((channelId: number, gain: number) => {
    setChannels((prev) => prev.map((ch) => (ch.id === channelId ? { ...ch, gain } : ch)));
  }, []);

  const handleMuteAll = useCallback(() => {
    setChannels((prev) => {
      const allMuted = prev.every((ch) => ch.muted);
      return prev.map((ch) => ({ ...ch, muted: !allMuted }));
    });
  }, []);

  const handleQuickAdd = useCallback((channelId: number, position: number) => {
    setQuickAddTarget({ channelId, position });
    setQuickAddMenuOpen(true);
  }, []);

  const handleAddFilter = useCallback(
    (filterType: FilterType) => {
      if (!quickAddTarget) return;

      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id !== quickAddTarget.channelId) return ch;

          const newFilter: ChannelFilter = {
            id: `${filterType}-${Date.now()}`,
            name: filterType,
            config: getDefaultFilter(filterType),
            bypassed: false,
          };

          const next = [...ch.filters];
          next.splice(quickAddTarget.position, 0, newFilter);
          return { ...ch, filters: next };
        })
      );

      setQuickAddTarget(null);
      setQuickAddMenuOpen(false);
    },
    [quickAddTarget]
  );

  if (!activeUnitId) {
    return (
      <Page>
        <PageHeader title="Channels" description="Select a unit to view channel strips and processing." />
        <PageBody className="flex items-center justify-center">
          <div className="rounded-lg border border-dsp-primary/60 bg-dsp-surface/30 p-10 text-center">
            <h3 className="text-lg font-medium text-dsp-text">No Unit Selected</h3>
            <p className="mt-2 text-sm text-dsp-text-muted">
              Choose an active unit from the top bar or in System Overview.
            </p>
          </div>
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Channels"
        description={`${channels.length} channel${channels.length === 1 ? '' : 's'} configured`}
        actions={
          <>
            {hasSoloedChannel && (
              <Button variant="secondary" size="sm" onClick={handleClearSolo}>
                Clear Solo
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:bg-dsp-primary/35 hover:border-dsp-primary/60 transition-colors"
                onClick={handleMuteAll}
                aria-label="Mute/Unmute all"
              >
                {channels.every((ch) => ch.muted) ? (
                  <VolumeX className="h-5 w-5 text-meter-red" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {channels.every((ch) => ch.muted) ? 'Unmute all' : 'Mute all'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:bg-dsp-primary/35 hover:border-dsp-primary/60 transition-colors"
                aria-label="Refresh channels"
              >
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Refresh channels</TooltipContent>
            </Tooltip>

            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Channel
            </Button>
          </>
        }
      />

      <PageBody className="p-6">
        <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
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

        <QuickAddMenu open={quickAddMenuOpen} onOpenChange={setQuickAddMenuOpen} onSelect={handleAddFilter} />
      </PageBody>
    </Page>
  );
}

function getDefaultFilter(filterType: FilterType): FilterConfig {
  switch (filterType) {
    case 'Biquad':
      return { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } };
    case 'Delay':
      return { type: 'Delay', parameters: { delay: 0, unit: 'ms', subsample: true } };
    case 'Gain':
      return { type: 'Gain', parameters: { gain: 0, scale: 'dB' } };
    case 'Compressor':
      return {
        type: 'Compressor',
        parameters: { channels: 1, threshold: -20, factor: 4, attack: 5, release: 100 },
      };
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

