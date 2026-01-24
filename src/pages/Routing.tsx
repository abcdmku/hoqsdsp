import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { RoutingMatrix } from '../components/routing/RoutingMatrix';
import type { MixerConfig } from '../types';

/**
 * Routing Page - Interface for managing audio routing and mixing
 */
export function RoutingPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const [mixer, setMixer] = useState<MixerConfig>({
    channels: { in: 2, out: 2 },
    mapping: [
      { dest: 0, sources: [{ channel: 0, gain: 0 }, { channel: 1, gain: 0 }] },
      { dest: 1, sources: [{ channel: 0, gain: 0 }, { channel: 1, gain: 0 }] },
    ],
  });

  // Empty state when no unit is selected
  if (!activeUnitId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <GitBranch className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Unit Selected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Select a CamillaDSP unit from the dashboard to view and edit its routing.
        </p>
      </div>
    );
  }

  const handleMixerChange = (newMixer: MixerConfig) => {
    setMixer(newMixer);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      {/* Header */}
      <div className="border-b border-dsp-primary/30 px-6 py-4">
        <h1 className="text-xl font-bold text-dsp-text">Routing Matrix</h1>
        <p className="text-sm text-dsp-text-muted">
          {mixer.channels.in} input{mixer.channels.in !== 1 ? 's' : ''} → {mixer.channels.out} output{mixer.channels.out !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Routing Matrix */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-6">
          <RoutingMatrix
            mixer={mixer}
            onMixerChange={handleMixerChange}
            inputLabels={Array.from({ length: mixer.channels.in }, (_, i) => `In ${i + 1}`)}
            outputLabels={Array.from({ length: mixer.channels.out }, (_, i) => `Out ${i + 1}`)}
          />
        </div>
      </div>
    </div>
  );
}
