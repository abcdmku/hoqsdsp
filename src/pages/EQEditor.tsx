import { useState } from 'react';
import { AudioWaveform } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { EQEditor } from '../components/eq-editor/EQEditor';
import type { EQBand } from '../components/eq-editor/types';

/**
 * EQ Editor Page - Interface for editing EQ bands and frequency responses
 */
export function EQEditorPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const [bands, setBands] = useState<EQBand[]>([
    {
      id: 'band-1',
      enabled: true,
      parameters: { type: 'Peaking', freq: 100, gain: 0, q: 1.0 },
    },
    {
      id: 'band-2',
      enabled: true,
      parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 },
    },
    {
      id: 'band-3',
      enabled: true,
      parameters: { type: 'Peaking', freq: 10000, gain: 0, q: 1.0 },
    },
  ]);
  const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);

  // Empty state when no unit is selected
  if (!activeUnitId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
          <AudioWaveform className="h-8 w-8 text-dsp-text-muted" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-dsp-text">No Unit Selected</h3>
        <p className="text-center text-sm text-dsp-text-muted">
          Select a CamillaDSP unit from the dashboard to view and edit its EQ.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      {/* Header */}
      <div className="border-b border-dsp-primary/30 px-6 py-4">
        <h1 className="text-xl font-bold text-dsp-text">EQ Editor</h1>
        <p className="text-sm text-dsp-text-muted">
          {bands.length} band{bands.length !== 1 ? 's' : ''} configured
        </p>
      </div>

      {/* EQ Editor */}
      <div className="flex-1 overflow-auto p-6">
        <EQEditor
          bands={bands}
          onChange={setBands}
          sampleRate={48000}
          selectedBandIndex={selectedBandIndex}
          onSelectBand={setSelectedBandIndex}
        />
      </div>
    </div>
  );
}
