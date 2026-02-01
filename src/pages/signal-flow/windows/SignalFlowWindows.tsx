import { useCallback } from 'react';
import { SignalFlowChannelConnectionsWindow } from './ChannelConnectionsWindow';
import { SignalFlowChannelWindow } from './ChannelWindow';
import { SignalFlowConnectionWindow } from './ConnectionWindow';
import { SignalFlowFilterWindow } from './FilterWindow';
import type { SignalFlowWindow, SignalFlowWindowsProps } from './types';

export function SignalFlowWindows({
  windows,
  routes,
  inputs,
  outputs,
  clipboard,
  sampleRate,
  workspaceRef,
  channelColors,
  mirrorGroups,
  firPhaseCorrection,
  deq,
  labelFor,
  copyClipboard,
  readClipboard,
  updateRoute,
  deleteRoute,
  addRoute,
  updateChannelFilters,
  handleSetChannelColor,
  handleSetMirrorGroup,
  handlePersistFirPhaseCorrectionSettings,
  handlePersistDeqSettings,
  setWindows,
  setSelectedRouteIndex,
  setSelectedChannelKey,
  nextZIndexRef,
}: SignalFlowWindowsProps) {
  const moveWindow = useCallback(
    (id: string, position: SignalFlowWindow['position']) => {
      setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, position } : win)));
    },
    [setWindows],
  );

  const focusWindow = useCallback(
    (id: string) => {
      setWindows((prev) => {
        const nextZ = nextZIndexRef.current + 1;
        nextZIndexRef.current = nextZ;
        return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ } : win));
      });
    },
    [setWindows, nextZIndexRef],
  );

  const closeWindow = useCallback(
    (id: string, options?: { clearSelection?: boolean }) => {
      setWindows((prev) => prev.filter((win) => win.id !== id));
      if (options?.clearSelection) {
        setSelectedRouteIndex(null);
        setSelectedChannelKey(null);
      }
    },
    [setWindows, setSelectedRouteIndex, setSelectedChannelKey],
  );

  return (
    <>
      {windows.map((win) => {
        if (win.kind === 'connection') {
          return (
            <SignalFlowConnectionWindow
              key={win.id}
              window={win}
              routes={routes}
              workspaceRef={workspaceRef}
              clipboard={clipboard}
              labelFor={labelFor}
              copyClipboard={copyClipboard}
              readClipboard={readClipboard}
              updateRoute={updateRoute}
              deleteRoute={deleteRoute}
              onMove={(pos) => {
                moveWindow(win.id, pos);
              }}
              onRequestClose={() => {
                closeWindow(win.id, { clearSelection: true });
              }}
              onRequestDismiss={() => {
                closeWindow(win.id);
              }}
              onRequestFocus={() => {
                focusWindow(win.id);
              }}
            />
          );
        }

        if (win.kind === 'filter') {
          return (
            <SignalFlowFilterWindow
              key={win.id}
              window={win}
              inputs={inputs}
              outputs={outputs}
              sampleRate={sampleRate}
              workspaceRef={workspaceRef}
              clipboard={clipboard}
              labelFor={labelFor}
              copyClipboard={copyClipboard}
              readClipboard={readClipboard}
              updateChannelFilters={updateChannelFilters}
              firPhaseCorrection={firPhaseCorrection}
              onPersistFirPhaseCorrectionSettings={handlePersistFirPhaseCorrectionSettings}
              deq={deq}
              onPersistDeqSettings={handlePersistDeqSettings}
              onMove={(pos) => {
                moveWindow(win.id, pos);
              }}
              onRequestClose={() => {
                closeWindow(win.id);
              }}
              onRequestFocus={() => {
                focusWindow(win.id);
              }}
            />
          );
        }

        if (win.kind === 'channel') {
          return (
            <SignalFlowChannelWindow
              key={win.id}
              window={win}
              inputs={inputs}
              outputs={outputs}
              channelColors={channelColors}
              mirrorGroups={mirrorGroups}
              workspaceRef={workspaceRef}
              clipboard={clipboard}
              labelFor={labelFor}
              copyClipboard={copyClipboard}
              readClipboard={readClipboard}
              updateChannelFilters={updateChannelFilters}
              handleSetChannelColor={handleSetChannelColor}
              handleSetMirrorGroup={handleSetMirrorGroup}
              onMove={(pos) => {
                moveWindow(win.id, pos);
              }}
              onRequestClose={() => {
                closeWindow(win.id);
              }}
              onRequestFocus={() => {
                focusWindow(win.id);
              }}
            />
          );
        }

        if (win.kind === 'channel-connections') {
          return (
            <SignalFlowChannelConnectionsWindow
              key={win.id}
              window={win}
              routes={routes}
              inputs={inputs}
              outputs={outputs}
              workspaceRef={workspaceRef}
              labelFor={labelFor}
              addRoute={addRoute}
              updateRoute={updateRoute}
              deleteRoute={deleteRoute}
              onMove={(pos) => {
                moveWindow(win.id, pos);
              }}
              onRequestClose={() => {
                closeWindow(win.id);
              }}
              onRequestFocus={() => {
                focusWindow(win.id);
              }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
