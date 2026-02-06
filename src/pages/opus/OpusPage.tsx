import { useState } from 'react';
import { MixerConsole } from './MixerConsole';
import { NodeGraph } from './NodeGraph';
import { MatrixView } from './MatrixView';
import { ChannelFocus } from './ChannelFocus';
import { PipelineView } from './PipelineView';
import { useSignalFlowPageState } from '../signal-flow/hooks/useSignalFlowPageState';
import { SignalFlowEmptyState, SignalFlowStatusMessage } from '../signal-flow/SignalFlowEmptyState';
import { cn } from '../../lib/utils';

const DESIGNS = [
  { id: 'mixer', label: 'Mixer Console', component: MixerConsole },
  { id: 'nodes', label: 'Node Graph', component: NodeGraph },
  { id: 'matrix', label: 'Matrix', component: MatrixView },
  { id: 'focus', label: 'Channel Focus', component: ChannelFocus },
  { id: 'pipeline', label: 'Pipeline', component: PipelineView },
] as const;

type DesignId = (typeof DESIGNS)[number]['id'];

export function OpusPage() {
  const [activeDesign, setActiveDesign] = useState<DesignId>('mixer');
  const state = useSignalFlowPageState();

  if (state.units.connectedUnits.length === 0) {
    return (
      <SignalFlowEmptyState
        title="No Units Connected"
        description="Connect to a CamillaDSP unit from the dashboard to view and edit its signal flow."
      />
    );
  }

  if (!state.units.activeUnitId) {
    return (
      <SignalFlowEmptyState
        title="No Unit Selected"
        description="Select a unit from the list above to view its signal flow."
      />
    );
  }

  if (state.configState.isLoading) {
    return <SignalFlowStatusMessage message="Loading signal flow..." />;
  }

  if (state.configState.error) {
    const message =
      state.configState.error instanceof Error
        ? state.configState.error.message
        : String(state.configState.error);
    return <SignalFlowStatusMessage tone="error" message={`Failed to load config: ${message}`} />;
  }

  if (!state.configState.flow) {
    return <SignalFlowStatusMessage message="No config available." />;
  }

  const ActiveComponent = DESIGNS.find((d) => d.id === activeDesign)!.component;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      {/* Design switcher tabs */}
      <div className="flex items-center gap-1 border-b border-dsp-primary/30 bg-dsp-surface px-4 py-2">
        <span className="mr-3 text-xs font-semibold uppercase tracking-widest text-dsp-text-muted">
          Opus Labs
        </span>
        {DESIGNS.map((design) => (
          <button
            key={design.id}
            type="button"
            onClick={() => setActiveDesign(design.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeDesign === design.id
                ? 'bg-dsp-accent/15 text-dsp-accent border border-dsp-accent/40'
                : 'text-dsp-text-muted hover:text-dsp-text hover:bg-dsp-primary/40 border border-transparent',
            )}
          >
            {design.label}
          </button>
        ))}
      </div>

      {/* Active design */}
      <div className="flex-1 overflow-hidden">
        <ActiveComponent state={state} />
      </div>
    </div>
  );
}
