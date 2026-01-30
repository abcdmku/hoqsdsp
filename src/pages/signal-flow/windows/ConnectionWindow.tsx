import type { RefObject } from 'react';
import { ClipboardPaste, Copy } from 'lucide-react';
import type { ChannelSide, RouteEdge, RouteEndpoint } from '../../../lib/signalflow';
import type { SignalFlowClipboardPayload } from '../../../stores/signalFlowUiStore';
import { Button } from '../../../components/ui/Button';
import { ConnectionEditor } from '../../../components/signal-flow/ConnectionEditor';
import { FloatingWindow } from '../../../components/signal-flow/FloatingWindow';
import { showToast } from '../../../components/feedback';
import type { ConnectionWindow as ConnectionWindowType } from './types';

interface SignalFlowConnectionWindowProps {
  window: ConnectionWindowType;
  routes: RouteEdge[];
  workspaceRef: RefObject<HTMLDivElement | null>;
  clipboard: SignalFlowClipboardPayload | null;
  labelFor: (side: ChannelSide, endpoint: RouteEndpoint) => string;
  copyClipboard: (payload: SignalFlowClipboardPayload) => Promise<void>;
  readClipboard: () => Promise<SignalFlowClipboardPayload | null>;
  updateRoute: (index: number, updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  deleteRoute: (index: number) => void;
  onMove: (position: ConnectionWindowType['position']) => void;
  onRequestClose: () => void;
  onRequestDismiss: () => void;
  onRequestFocus: () => void;
}

export function SignalFlowConnectionWindow({
  window,
  routes,
  workspaceRef,
  clipboard,
  labelFor,
  copyClipboard,
  readClipboard,
  updateRoute,
  deleteRoute,
  onMove,
  onRequestClose,
  onRequestDismiss,
  onRequestFocus,
}: SignalFlowConnectionWindowProps) {
  const routeIndex = routes.findIndex(
    (edge) =>
      edge.from.deviceId === window.from.deviceId &&
      edge.from.channelIndex === window.from.channelIndex &&
      edge.to.deviceId === window.to.deviceId &&
      edge.to.channelIndex === window.to.channelIndex,
  );
  const route = routeIndex >= 0 ? routes[routeIndex] ?? null : null;
  if (!route) return null;

  return (
    <FloatingWindow
      id={window.id}
      title={`Connection: ${labelFor('input', window.from)} → ${labelFor('output', window.to)}`}
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
            aria-label="Copy connection settings"
            onClick={() => {
              void copyClipboard({
                kind: 'route',
                data: { gain: route.gain, inverted: route.inverted, mute: route.mute },
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Paste connection settings"
            disabled={
              !(
                clipboard?.kind === 'route' ||
                (typeof navigator !== 'undefined' && !!navigator.clipboard?.readText)
              )
            }
            onClick={() => {
              void (async () => {
                const payload = await readClipboard();
                if (payload?.kind !== 'route') {
                  showToast.info('Nothing to paste');
                  return;
                }
                updateRoute(routeIndex, payload.data);
                showToast.success('Pasted');
              })();
            }}
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </>
      }
      className="w-[420px]"
    >
      <ConnectionEditor
        route={route}
        fromLabel={labelFor('input', route.from)}
        toLabel={labelFor('output', route.to)}
        onChange={(updates, options) => {
          updateRoute(routeIndex, updates, options);
        }}
        onDelete={() => {
          deleteRoute(routeIndex);
          onRequestDismiss();
        }}
      />
    </FloatingWindow>
  );
}
