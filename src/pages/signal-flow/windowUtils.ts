import type { FloatingWindowPosition } from '../../components/signal-flow/FloatingWindow';

export function getCenteredPosition(
  bounds: DOMRect | null,
  width: number,
  height: number,
  fallback: FloatingWindowPosition,
): FloatingWindowPosition {
  if (!bounds) return fallback;
  return {
    x: Math.max(8, (bounds.width - width) / 2),
    y: Math.max(8, (bounds.height - height) / 2),
  };
}
