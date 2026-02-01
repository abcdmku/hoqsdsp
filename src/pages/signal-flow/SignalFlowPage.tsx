import { useCallback, useRef } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../lib/signalflow';
import type { FilterType } from '../../types';
import { portKey } from '../../lib/signalflow/endpointUtils';
import { SignalFlowEmptyState, SignalFlowStatusMessage } from './SignalFlowEmptyState';
import { SignalFlowDockedFilterEditor } from './SignalFlowDockedFilterEditor';
import { SignalFlowWorkspace } from './SignalFlowWorkspace';
import { useSignalFlowPageState } from './hooks/useSignalFlowPageState';

export function SignalFlowPage() {
  const {
    canvasRef,
    captureLevels,
    clipboard,
    configState,
    drag,
    handleUpdateFilters,
    inputBankRef,
    model,
    outputBankRef,
    playbackLevels,
    routeHighlightedChannelKeys,
    selection,
    units,
    windows,
    workspaceRef,
    copyClipboard,
    readClipboard,
    scrollChannelIntoView,
  } = useSignalFlowPageState();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const onSelectChannel = useCallback(
    (side: ChannelSide, channel: ChannelNode) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      selection.setSelectedChannelKey(portKey(side, endpoint));
      scrollChannelIntoView(side, endpoint);
    },
    [scrollChannelIntoView, selection],
  );

  const onColorChange = useCallback(
    (side: ChannelSide, channel: ChannelNode, color: string) => {
      const endpoint: RouteEndpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      model.handleSetChannelColor(portKey(side, endpoint), color);
    },
    [model],
  );

  const onLabelChange = useCallback(
    (side: ChannelSide, channel: ChannelNode, label: string) => {
      const endpoint: RouteEndpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      model.handleSetChannelName(side, endpoint, label);
    },
    [model],
  );

  const openFilterWindow = useCallback(
    (channel: ChannelNode, filterType: FilterType, point?: { x: number; y: number }) => {
      const endpoint = { deviceId: channel.deviceId, channelIndex: channel.channelIndex };
      selection.setSelectedChannelKey(portKey(channel.side, endpoint));
      scrollChannelIntoView(channel.side, endpoint);
      windows.openFilterWindow(channel, filterType, point);
    },
    [scrollChannelIntoView, selection, windows],
  );

  if (units.connectedUnits.length === 0) {
    return (
      <SignalFlowEmptyState
        title="No Units Connected"
        description="Connect to a CamillaDSP unit from the dashboard to view and edit its signal flow."
      />
    );
  }

  if (!units.activeUnitId) {
    return (
      <SignalFlowEmptyState
        title="No Unit Selected"
        description="Select a unit from the list above to view its signal flow."
      />
    );
  }

  if (configState.isLoading) {
    return <SignalFlowStatusMessage message="Loading signal flow..." />;
  }

  if (configState.error) {
    const message = configState.error instanceof Error ? configState.error.message : String(configState.error);
    return <SignalFlowStatusMessage tone="error" message={`Failed to load config: ${message}`} />;
  }

  if (!configState.flow) {
    return <SignalFlowStatusMessage message="No config available." />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      <div ref={scrollContainerRef} className="flex flex-1 flex-col overflow-auto">
        <SignalFlowDockedFilterEditor
          dockedFilterEditor={windows.dockedFilterEditor}
          config={configState.config}
          firPhaseCorrection={model.firPhaseCorrection}
          deq={model.deq}
          inputs={model.inputs}
          outputs={model.outputs}
          sampleRate={configState.sampleRate}
          onClose={() => windows.setDockedFilterEditor(null)}
          onPersistFirPhaseCorrectionSettings={model.handlePersistFirPhaseCorrectionSettings}
          onPersistDeqSettings={model.handlePersistDeqSettings}
          onUpdateFilterDefinition={model.updateFilterDefinition}
          onUpdateFilters={model.updateChannelFilters}
        />

        <SignalFlowWorkspace
          addRoute={model.addRoute}
          canvasRef={canvasRef}
          channelColors={model.channelColors}
          clipboard={clipboard}
          copyClipboard={copyClipboard}
          connectionCounts={model.connectionCounts}
          dragState={drag.dragState}
          firPhaseCorrection={model.firPhaseCorrection}
          deq={model.deq}
          handleSetChannelColor={model.handleSetChannelColor}
          handleSetMirrorGroup={model.handleSetMirrorGroup}
          handlePersistFirPhaseCorrectionSettings={model.handlePersistFirPhaseCorrectionSettings}
          handlePersistDeqSettings={model.handlePersistDeqSettings}
          highlightedPortKey={drag.highlightedPortKey}
          inputBankRef={inputBankRef}
          inputGroups={configState.flow.model.inputGroups}
          inputs={model.inputs}
          labelFor={model.labelFor}
          mirrorGroups={model.mirrorGroups}
          onClearSelection={() => {
            selection.setSelectedRouteIndex(null);
            selection.setSelectedChannelKey(null);
          }}
          onPortPointerDown={drag.handlePortPointerDown}
          onSelectChannel={onSelectChannel}
          onUpdateFilters={handleUpdateFilters}
          openChannelWindow={windows.openChannelWindow}
          openConnectionWindow={windows.openConnectionWindow}
          openConnectionsWindow={windows.openConnectionsWindow}
          openFilterWindow={openFilterWindow}
          outputBankRef={outputBankRef}
          outputGroups={configState.flow.model.outputGroups}
          outputs={model.outputs}
          readClipboard={readClipboard}
          routeHighlightedKeys={routeHighlightedChannelKeys}
          routes={model.routes}
          sampleRate={configState.sampleRate}
          selectedChannelKey={selection.selectedChannelKey}
          selectedRouteIndex={selection.selectedRouteIndex}
          setHoveredRouteIndex={selection.setHoveredRouteIndex}
          setSelectedChannelKey={selection.setSelectedChannelKey}
          setSelectedRouteIndex={selection.setSelectedRouteIndex}
          setWindows={windows.setWindows}
          updateChannelFilters={model.updateChannelFilters}
          updateRoute={model.updateRoute}
          deleteRoute={model.deleteRoute}
          windows={windows.windows}
          workspaceRef={workspaceRef}
          nextZIndexRef={windows.nextZIndexRef}
          channelLevels={{ capture: captureLevels, playback: playbackLevels }}
          onColorChange={onColorChange}
          onLabelChange={onLabelChange}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
