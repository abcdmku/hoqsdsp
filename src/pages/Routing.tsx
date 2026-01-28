import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { Page, PageBody, PageHeader } from '../components/layout';
import { RoutingMatrix } from '../components/routing/RoutingMatrix';
import type { MixerConfig } from '../types';

export function RoutingPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const [mixer, setMixer] = useState<MixerConfig>({
    channels: { in: 2, out: 2 },
    mapping: [
      { dest: 0, sources: [{ channel: 0, gain: 0 }, { channel: 1, gain: 0 }] },
      { dest: 1, sources: [{ channel: 0, gain: 0 }, { channel: 1, gain: 0 }] },
    ],
  });

  if (!activeUnitId) {
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <div className="rounded-lg border border-dsp-primary/60 bg-dsp-surface/30 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dsp-primary/30">
              <GitBranch className="h-6 w-6 text-dsp-text-muted" aria-hidden="true" />
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
        title="Routing"
        description={`${mixer.channels.in} input${mixer.channels.in === 1 ? '' : 's'} → ${mixer.channels.out} output${
          mixer.channels.out === 1 ? '' : 's'
        }`}
      />
      <PageBody>
        <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
          <RoutingMatrix
            mixer={mixer}
            onMixerChange={(newMixer) => { setMixer(newMixer); }}
            inputLabels={Array.from({ length: mixer.channels.in }, (_, i) => `In ${i + 1}`)}
            outputLabels={Array.from({ length: mixer.channels.out }, (_, i) => `Out ${i + 1}`)}
          />
        </div>
      </PageBody>
    </Page>
  );
}

