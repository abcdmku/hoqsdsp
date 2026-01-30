import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SignalFlowWindow } from '../windows/types';

function shouldIgnoreClick(target: HTMLElement): boolean {
  return !!(
    target.closest('[role="button"]') ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('select') ||
    target.closest('a') ||
    target.closest('[data-floating-window]') ||
    target.closest('[data-radix-popper-content-pane]') ||
    target.closest('[data-radix-dialog-content]') ||
    target.closest('[role="dialog"]') ||
    target.closest('[role="listbox"]') ||
    target.closest('aside') ||
    target.closest('path') ||
    target.closest('[data-port-key]')
  );
}

function filterConnectionWindows(windows: SignalFlowWindow[]): SignalFlowWindow[] {
  return windows.filter((win) => win.kind !== 'connection');
}

export function useSignalFlowSelection(setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>) {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const [selectedChannelKey, setSelectedChannelKey] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target || shouldIgnoreClick(target)) return;

      setSelectedRouteIndex(null);
      setSelectedChannelKey(null);
      setWindows(filterConnectionWindows);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [setWindows]);

  return {
    hoveredRouteIndex,
    selectedChannelKey,
    selectedRouteIndex,
    setHoveredRouteIndex,
    setSelectedChannelKey,
    setSelectedRouteIndex,
  };
}
