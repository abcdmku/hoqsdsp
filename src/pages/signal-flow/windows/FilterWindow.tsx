import type { RefObject } from 'react';
import { ClipboardPaste, Copy } from 'lucide-react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import type { SignalFlowClipboardPayload } from '../../../stores/signalFlowUiStore';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { FloatingWindow } from '../../../components/signal-flow/FloatingWindow';
import { SignalFlowFilterWindowContent } from '../../../components/signal-flow/SignalFlowFilterWindowContent';
import { FILTER_UI } from '../../../components/signal-flow/filterUi';
import { showToast } from '../../../components/feedback';
import { ensureUniqueName, replaceBiquadBlock } from '../utils';
import { replaceDiffEqBlock } from '../../../lib/signalflow/filterUtils';
import type { FilterWindow as FilterWindowType } from './types';

interface SignalFlowFilterWindowProps {
  window: FilterWindowType;
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  sampleRate: number;
  workspaceRef: RefObject<HTMLDivElement | null>;
  clipboard: SignalFlowClipboardPayload | null;
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  copyClipboard: (payload: SignalFlowClipboardPayload) => Promise<void>;
  readClipboard: () => Promise<SignalFlowClipboardPayload | null>;
  updateChannelFilters: (
    side: ChannelSide,
    endpoint: RouteEndpoint,
    filters: ChannelNode['processing']['filters'],
    options?: { debounce?: boolean },
  ) => void;
  firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>;
  onPersistFirPhaseCorrectionSettings: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  deq: Record<string, DeqBandUiSettingsV1>;
  onPersistDeqSettings: (filterName: string, settings: DeqBandUiSettingsV1 | null) => void;
  onMove: (position: FilterWindowType['position']) => void;
  onRequestClose: () => void;
  onRequestFocus: () => void;
}

export function SignalFlowFilterWindow({
  window,
  inputs,
  outputs,
  sampleRate,
  workspaceRef,
  clipboard,
  labelFor,
  copyClipboard,
  readClipboard,
  updateChannelFilters,
  firPhaseCorrection,
  onPersistFirPhaseCorrectionSettings,
  deq,
  onPersistDeqSettings,
  onMove,
  onRequestClose,
  onRequestFocus,
}: SignalFlowFilterWindowProps) {
  const endpoint = { deviceId: window.deviceId, channelIndex: window.channelIndex };
  const nodes = window.side === 'input' ? inputs : outputs;
  const node = nodes.find(
    (candidate) => candidate.deviceId === window.deviceId && candidate.channelIndex === window.channelIndex,
  );
  if (!node) return null;

  const meta = FILTER_UI[window.filterType];
  const isWideWindow =
    window.filterType === 'Biquad' ||
    window.filterType === 'DiffEq' ||
    window.filterType === 'Compressor' ||
    window.filterType === 'NoiseGate' ||
    window.filterType === 'Loudness';

  return (
    <FloatingWindow
      id={window.id}
      title={`${labelFor(window.side, endpoint)} · ${meta.shortLabel}`}
      position={window.position}
      zIndex={window.zIndex}
      boundsRef={workspaceRef}
      onMove={onMove}
      onRequestClose={onRequestClose}
      onRequestFocus={onRequestFocus}
      headerRight={
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Copy filter settings"
            onClick={() => {
              if (window.filterType === 'Biquad') {
                const bands = node.processing.filters.filter((f) => f.config.type === 'Biquad');
                if (bands.length === 0) {
                  showToast.info('Nothing to copy');
                  return;
                }
                void copyClipboard({ kind: 'filter', data: { filterType: 'Biquad', bands } });
                return;
              }

              if (window.filterType === 'DiffEq') {
                const bands = node.processing.filters.filter((f) => f.config.type === 'DiffEq');
                if (bands.length === 0) {
                  showToast.info('Nothing to copy');
                  return;
                }
                const deqUi: Record<string, DeqBandUiSettingsV1> = {};
                for (const band of bands) {
                  const settings = deq[band.name];
                  if (settings) {
                    deqUi[band.name] = settings;
                  }
                }
                void copyClipboard({
                  kind: 'filter',
                  data: {
                    filterType: 'DiffEq',
                    bands,
                    ...(Object.keys(deqUi).length > 0 ? { deq: deqUi } : {}),
                  },
                });
                return;
              }

              const current = node.processing.filters.find((f) => f.config.type === window.filterType);
              if (!current) {
                showToast.info('Nothing to copy');
                return;
              }
              void copyClipboard({ kind: 'filter', data: { filterType: window.filterType, config: current.config } });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Paste filter settings"
            disabled={
              !(
                clipboard?.kind === 'filter' ||
                (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText)
              )
            }
            onClick={() => {
              void (async () => {
                const payload = await readClipboard();
                if (payload?.kind !== 'filter') {
                  showToast.info('Nothing to paste');
                  return;
                }

                if (window.filterType === 'Biquad') {
                  if (!('bands' in payload.data) || payload.data.filterType !== 'Biquad') {
                    showToast.warning('Clipboard does not contain EQ bands.');
                    return;
                  }

                  const biquads = payload.data.bands.filter((f) => f.config.type === 'Biquad');
                  const nextFilters = replaceBiquadBlock(node.processing.filters, biquads);
                  updateChannelFilters(window.side, endpoint, nextFilters);
                  showToast.success('Pasted');
                  return;
                }

                if (window.filterType === 'DiffEq') {
                  if (!('bands' in payload.data) || payload.data.filterType !== 'DiffEq') {
                    showToast.warning('Clipboard does not contain DEQ bands.');
                    return;
                  }

                  const diffeqs = payload.data.bands.filter((f) => f.config.type === 'DiffEq');
                  const nextFilters = replaceDiffEqBlock(node.processing.filters, diffeqs);
                  updateChannelFilters(window.side, endpoint, nextFilters);

                  const prevNames = new Set(
                    node.processing.filters.filter((f) => f.config.type === 'DiffEq').map((f) => f.name),
                  );
                  const nextNames = new Set(diffeqs.map((f) => f.name));

                  for (const prevName of prevNames) {
                    if (!nextNames.has(prevName)) {
                      onPersistDeqSettings(prevName, null);
                    }
                  }

                  if ('deq' in payload.data && payload.data.deq) {
                    for (const [name, settings] of Object.entries(payload.data.deq)) {
                      onPersistDeqSettings(name, settings);
                    }
                  }

                  showToast.success('Pasted');
                  return;
                }

                if (!('config' in payload.data) || payload.data.filterType !== window.filterType) {
                  showToast.warning('Clipboard filter type does not match.');
                  return;
                }

                const pastedConfig = payload.data.config;
                const existingIndex = node.processing.filters.findIndex((f) => f.config.type === window.filterType);
                const nextFilters =
                  existingIndex >= 0
                    ? node.processing.filters.map((f, idx) => (idx === existingIndex ? { ...f, config: pastedConfig } : f))
                    : (() => {
                        const taken = new Set(node.processing.filters.map((f) => f.name));
                        const baseName = `sf-${window.side}-ch${String(window.channelIndex + 1)}-${window.filterType.toLowerCase()}-${String(Date.now())}`;
                        const name = ensureUniqueName(baseName, taken);
                        return [...node.processing.filters, { name, config: pastedConfig }];
                      })();

                updateChannelFilters(window.side, endpoint, nextFilters);
                showToast.success('Pasted');
              })();
            }}
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </>
      }
      className={isWideWindow ? 'w-[960px] max-w-[95vw]' : 'w-[560px]'}
    >
      <SignalFlowFilterWindowContent
        node={node}
        sampleRate={sampleRate}
        filterType={window.filterType}
        onClose={onRequestClose}
        firPhaseCorrection={firPhaseCorrection}
        onPersistFirPhaseCorrectionSettings={onPersistFirPhaseCorrectionSettings}
        deq={deq}
        onPersistDeqSettings={onPersistDeqSettings}
        onChange={(nextFilters, options) => {
          updateChannelFilters(window.side, endpoint, nextFilters, options);
        }}
      />
    </FloatingWindow>
  );
}
