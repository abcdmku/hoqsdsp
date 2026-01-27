import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface FloatingWindowPosition {
  x: number;
  y: number;
}

export interface FloatingWindowProps {
  id: string;
  title: string;
  position: FloatingWindowPosition;
  zIndex: number;
  boundsRef: RefObject<HTMLElement | null>;
  onMove: (next: FloatingWindowPosition) => void;
  onRequestClose: () => void;
  onRequestFocus: () => void;
  headerRight?: ReactNode;
  className?: string;
  children: ReactNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function FloatingWindow({
  id,
  title,
  position,
  zIndex,
  boundsRef,
  onMove,
  onRequestClose,
  onRequestFocus,
  headerRight,
  className,
  children,
}: FloatingWindowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const style = useMemo(() => {
    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex,
    } as const;
  }, [position.x, position.y, zIndex]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const session = dragSessionRef.current;
      if (session?.pointerId !== event.pointerId) return;

      const boundsEl = boundsRef.current;
      const rootEl = rootRef.current;
      if (!boundsEl || !rootEl) return;

      const boundsRect = boundsEl.getBoundingClientRect();
      const windowRect = rootEl.getBoundingClientRect();

      const nextX = session.originX + (event.clientX - session.startX);
      const nextY = session.originY + (event.clientY - session.startY);

      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, boundsRect.width - windowRect.width - 8);
      const maxY = Math.max(minY, boundsRect.height - windowRect.height - 8);

      onMove({ x: clamp(nextX, minX, maxX), y: clamp(nextY, minY, maxY) });
    },
    [boundsRef, onMove],
  );

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const session = dragSessionRef.current;
    if (session?.pointerId !== event.pointerId) return;
    dragSessionRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
  }, [handlePointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute w-[380px] rounded-lg border border-dsp-primary/30 bg-dsp-surface/95 shadow-lg backdrop-blur',
        className,
      )}
      style={style}
      role="dialog"
      aria-label={title}
      data-window-id={id}
      data-floating-window
      onPointerDown={() => {
        onRequestFocus();
      }}
    >
      <div
        className="flex cursor-grab items-center justify-between gap-2 border-b border-dsp-primary/20 px-3 py-2 active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const rootEl = rootRef.current;
          const boundsEl = boundsRef.current;
          if (!rootEl || !boundsEl) return;
          onRequestFocus();

          dragSessionRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };

          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp, { once: true });
        }}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-dsp-text">{title}</div>
        </div>

        <div className="flex items-center gap-1">
          {headerRight}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Close window"
            onClick={(event) => {
              event.stopPropagation();
              onRequestClose();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto p-3">{children}</div>
    </div>
  );
}

