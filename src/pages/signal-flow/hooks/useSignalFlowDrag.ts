import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { DragState } from '../../../components/signal-flow/ConnectionsCanvas';
import type { RouteEndpoint, RouteEdge } from '../../../lib/signalflow';
import { portKey } from '../../../lib/signalflow/endpointUtils';
import { endpointFromPortElement } from '../utils';

interface SignalFlowDragParams {
  canvasRef: RefObject<HTMLElement | null>;
  addRoute: (from: RouteEndpoint, to: RouteEndpoint) => void;
  openConnectionWindow: (route: RouteEdge, point?: { x: number; y: number }) => void;
}

export function useSignalFlowDrag({
  canvasRef,
  addRoute,
  openConnectionWindow,
}: SignalFlowDragParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [highlightedPortKey, setHighlightedPortKey] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    cleanupRef.current?.();
  }, []);

  const handlePortPointerDown = useCallback(
    (side: 'input' | 'output', endpoint: RouteEndpoint, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      cleanupRef.current?.();

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();

      const getPoint = (clientX: number, clientY: number) => ({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });

      // Drag direction: input->output or output->input (routes are always input->output)
      const dragFromSide = side;
      const targetSide = side === 'input' ? 'output' : 'input';

      setDragState({ from: endpoint, point: getPoint(event.clientX, event.clientY), hoverTo: null });

      function handleMove(moveEvent: PointerEvent) {
        const hovered = endpointFromPortElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY));
        const hoverTo = hovered?.side === targetSide ? hovered.endpoint : null;
        setHighlightedPortKey(hoverTo ? portKey(targetSide, hoverTo) : null);
        setDragState((current) => {
          if (!current) return current;
          return { ...current, point: getPoint(moveEvent.clientX, moveEvent.clientY), hoverTo };
        });
      }

      function handleVisibilityChange() {
        if (document.hidden) {
          handleCancel();
        }
      }

      function cleanupListeners() {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        window.removeEventListener('blur', handleCancel);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        cleanupRef.current = null;
      }

      function handleCancel() {
        cleanupListeners();
        setDragState(null);
        setHighlightedPortKey(null);
      }

      function handleUp() {
        cleanupListeners();
        setDragState((current) => {
          if (current?.hoverTo) {
            const from = dragFromSide === 'input' ? current.from : current.hoverTo;
            const to = dragFromSide === 'input' ? current.hoverTo : current.from;
            addRoute(from, to);
            openConnectionWindow({ from, to, gain: 0, inverted: false, mute: false });
          }
          return null;
        });
        setHighlightedPortKey(null);
      }

      cleanupRef.current = cleanupListeners;

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp, { once: true });
      window.addEventListener('pointercancel', handleCancel, { once: true });
      window.addEventListener('blur', handleCancel, { once: true });
      document.addEventListener('visibilitychange', handleVisibilityChange, { once: true });
    },
    [addRoute, canvasRef, openConnectionWindow],
  );

  return { dragState, handlePortPointerDown, highlightedPortKey, setHighlightedPortKey };
}
