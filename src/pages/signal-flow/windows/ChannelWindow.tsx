import type { RefObject } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { portKey } from '../../../lib/signalflow/endpointUtils';
import type { SignalFlowClipboardPayload, SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';
import { SignalFlowChannelWindowContent } from '../../../components/signal-flow/SignalFlowChannelWindowContent';
import { FloatingWindow } from '../../../components/signal-flow/FloatingWindow';
import { showToast } from '../../../components/feedback';
import type { ChannelWindow as ChannelWindowType } from './types';

interface SignalFlowChannelWindowProps {
  window: ChannelWindowType;
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  channelColors: Record<string, string>;
  mirrorGroups: SignalFlowMirrorGroups;
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
  handleSetChannelColor: (key: string, color: string) => void;
  handleSetMirrorGroup: (side: ChannelSide, members: RouteEndpoint[]) => void;
  onMove: (position: ChannelWindowType['position']) => void;
  onRequestClose: () => void;
  onRequestFocus: () => void;
}

export function SignalFlowChannelWindow({
  window,
  inputs,
  outputs,
  channelColors,
  mirrorGroups,
  workspaceRef,
  clipboard,
  labelFor,
  copyClipboard,
  readClipboard,
  updateChannelFilters,
  handleSetChannelColor,
  handleSetMirrorGroup,
  onMove,
  onRequestClose,
  onRequestFocus,
}: SignalFlowChannelWindowProps) {
  const endpoint = { deviceId: window.deviceId, channelIndex: window.channelIndex };
  const nodes = window.side === 'input' ? inputs : outputs;
  const node = nodes.find(
    (candidate) => candidate.deviceId === window.deviceId && candidate.channelIndex === window.channelIndex,
  );
  if (!node) return null;

  const key = portKey(window.side, endpoint);
  const color = channelColors[key] ?? '#22d3ee';
  const canPaste =
    clipboard?.kind === 'channel' ||
    (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText);

  return (
    <FloatingWindow
      id={window.id}
      title={`${labelFor(window.side, endpoint)} Settings`}
      position={window.position}
      zIndex={window.zIndex}
      boundsRef={workspaceRef}
      onMove={onMove}
      onRequestClose={onRequestClose}
      onRequestFocus={onRequestFocus}
      className="w-[460px]"
    >
      <SignalFlowChannelWindowContent
        node={node}
        side={window.side}
        endpoint={endpoint}
        allSideChannels={nodes}
        color={color}
        mirrorGroups={mirrorGroups[window.side] ?? []}
        onSetColor={(next) => {
          if (!/^#[0-9a-fA-F]{6}$/.test(next)) return;
          handleSetChannelColor(key, next);
        }}
        onSetMirrorMembers={(members) => {
          handleSetMirrorGroup(window.side, members);
        }}
        onCopyChannel={() => {
          void copyClipboard({ kind: 'channel', data: { filters: node.processing.filters } });
        }}
        canPasteChannel={canPaste}
        onPasteChannel={() => {
          void (async () => {
            const payload = await readClipboard();
            if (payload?.kind !== 'channel') {
              showToast.info('Nothing to paste');
              return;
            }
            updateChannelFilters(window.side, endpoint, payload.data.filters);
            showToast.success('Pasted');
          })();
        }}
      />
    </FloatingWindow>
  );
}
