import { useState } from 'react';
import { AudioWaveform } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { Page, PageBody, PageHeader } from '../components/layout';
import { EQEditor } from '../components/eq-editor/EQEditor';
import type { EQBand } from '../components/eq-editor/types';

export function EQEditorPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const [bands, setBands] = useState<EQBand[]>([
    { id: 'band-1', enabled: true, parameters: { type: 'Peaking', freq: 100, gain: 0, q: 1.0 } },
    { id: 'band-2', enabled: true, parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1.0 } },
    { id: 'band-3', enabled: true, parameters: { type: 'Peaking', freq: 10000, gain: 0, q: 1.0 } },
  ]);
  const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);

  if (!activeUnitId) {
    return (
      <Page>
        <PageHeader title="EQ" description="Select a unit to view and edit its equalization." />
        <PageBody className="flex items-center justify-center">
          <div className="rounded-lg border border-dsp-primary/60 bg-dsp-surface/30 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dsp-primary/30">
              <AudioWaveform className="h-6 w-6 text-dsp-text-muted" aria-hidden="true" />
            </div>
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
        title="EQ"
        description={`${bands.length} band${bands.length === 1 ? '' : 's'} configured`}
      />
      <PageBody>
        <EQEditor
          bands={bands}
          onChange={setBands}
          sampleRate={48000}
          selectedBandIndex={selectedBandIndex}
          onSelectBand={setSelectedBandIndex}
        />
      </PageBody>
    </Page>
  );
}

