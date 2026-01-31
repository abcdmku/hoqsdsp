import { X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../lib/signalflow';
import type { DockedFilterEditorState } from './windows/types';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1 } from '../../types';
import { FILTER_UI } from '../../components/signal-flow/filterUi';
import { SignalFlowFilterWindowContent } from '../../components/signal-flow/SignalFlowFilterWindowContent';
import { Button } from '../../components/ui/Button';

interface SignalFlowDockedFilterEditorProps {
  dockedFilterEditor: DockedFilterEditorState | null;
  firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>;
  deq: Record<string, DeqBandUiSettingsV1>;
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  sampleRate: number;
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  onClose: () => void;
  onPersistFirPhaseCorrectionSettings: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  onPersistDeqSettings: (filterName: string, settings: DeqBandUiSettingsV1 | null) => void;
  onUpdateFilters: (
    side: ChannelSide,
    endpoint: RouteEndpoint,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
}

export function SignalFlowDockedFilterEditor({
  dockedFilterEditor,
  firPhaseCorrection,
  deq,
  inputs,
  outputs,
  sampleRate,
  labelFor,
  onClose,
  onPersistFirPhaseCorrectionSettings,
  onPersistDeqSettings,
  onUpdateFilters,
}: SignalFlowDockedFilterEditorProps) {
  const isOpen = !!dockedFilterEditor;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    if (!isOpen) {
      setContentHeight(0);
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    const update = () => {
      setContentHeight(el.scrollHeight);
    };

    update();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, dockedFilterEditor]);

  return (
    <div
      className="overflow-hidden border-b border-dsp-primary/20 bg-dsp-surface transition-[height] duration-300 ease-in-out"
      style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
      data-floating-window
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div ref={contentRef}>
        {dockedFilterEditor && (() => {
        const endpoint = { deviceId: dockedFilterEditor.deviceId, channelIndex: dockedFilterEditor.channelIndex };
        const nodes = dockedFilterEditor.side === 'input' ? inputs : outputs;
        const node = nodes.find(
          (candidate) =>
            candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex,
        );
        if (!node) return null;

        const meta = FILTER_UI[dockedFilterEditor.filterType];

        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-dsp-primary/20 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-dsp-text">
                  {labelFor(dockedFilterEditor.side, endpoint)} - {meta.label}
                </div>
                <div className="mt-0.5 text-xs text-dsp-text-muted">
                  {dockedFilterEditor.side === 'input' ? 'Input processing' : 'Output processing'}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Close editor"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <SignalFlowFilterWindowContent
                node={node}
                sampleRate={sampleRate}
                filterType={dockedFilterEditor.filterType}
                onClose={onClose}
                firPhaseCorrection={firPhaseCorrection}
                onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
                deq={deq}
                onPersistDeqSettings={onPersistDeqSettings}
                onChange={(nextFilters, options) => {
                  onUpdateFilters(dockedFilterEditor.side, endpoint, nextFilters, options);
                }}
              />
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
