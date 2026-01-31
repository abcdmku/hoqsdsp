import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { FromConfigResult, RouteEdge, ChannelNode } from '../../../lib/signalflow';
import { defaultColorForKey } from '../../../lib/signalflow/colorUtils';
import { portKey } from '../../../lib/signalflow/endpointUtils';
import type { SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1, SignalFlowUiMetadata } from '../../../types';
import type { DockedFilterEditorState, SignalFlowWindow } from '../windows/types';

interface SignalFlowSyncParams {
  activeUnitId: string | null;
  flow: FromConfigResult | null;
  pendingChangesRef: MutableRefObject<boolean>;
  prevUnitIdRef: MutableRefObject<string | null>;
  setDockedFilterEditor: Dispatch<SetStateAction<DockedFilterEditorState | null>>;
  setInputs: Dispatch<SetStateAction<ChannelNode[]>>;
  setOutputs: Dispatch<SetStateAction<ChannelNode[]>>;
  setRoutes: Dispatch<SetStateAction<RouteEdge[]>>;
  setSelectedChannelKey: Dispatch<SetStateAction<string | null>>;
  setSelectedRouteIndex: Dispatch<SetStateAction<number | null>>;
  setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>;
  setChannelColors: Dispatch<SetStateAction<Record<string, string>>>;
  setChannelNames: Dispatch<SetStateAction<Record<string, string>>>;
  setMirrorGroups: Dispatch<SetStateAction<SignalFlowMirrorGroups>>;
  setFirPhaseCorrection: Dispatch<SetStateAction<Record<string, FirPhaseCorrectionUiSettingsV1>>>;
  setDeq: Dispatch<SetStateAction<Record<string, DeqBandUiSettingsV1>>>;
}

function collectPortKeys(flow: FromConfigResult): string[] {
  return [
    ...flow.model.inputs.map((node) => portKey('input', node)),
    ...flow.model.outputs.map((node) => portKey('output', node)),
  ];
}

function buildDefaultColors(
  flow: FromConfigResult,
  activeUnitId: string | null,
  serverColors: Record<string, string>,
): Record<string, string> {
  const keys = collectPortKeys(flow);
  const colorsWithDefaults = { ...serverColors };
  for (const key of keys) {
    if (!colorsWithDefaults[key]) {
      colorsWithDefaults[key] = defaultColorForKey(`${activeUnitId ?? 'default'}:${key}`);
    }
  }
  return colorsWithDefaults;
}

function applyModelState(
  flow: FromConfigResult,
  setRoutes: Dispatch<SetStateAction<RouteEdge[]>>,
  setInputs: Dispatch<SetStateAction<ChannelNode[]>>,
  setOutputs: Dispatch<SetStateAction<ChannelNode[]>>,
) {
  setRoutes(flow.model.routes);
  setInputs(flow.model.inputs);
  setOutputs(flow.model.outputs);
}

function resetUiState(
  setSelectedRouteIndex: Dispatch<SetStateAction<number | null>>,
  setSelectedChannelKey: Dispatch<SetStateAction<string | null>>,
  setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>,
  setDockedFilterEditor: Dispatch<SetStateAction<DockedFilterEditorState | null>>,
) {
  setSelectedRouteIndex(null);
  setSelectedChannelKey(null);
  setWindows([]);
  setDockedFilterEditor(null);
}

function applyUiMetadata(
  flow: FromConfigResult,
  activeUnitId: string | null,
  setChannelColors: Dispatch<SetStateAction<Record<string, string>>>,
  setChannelNames: Dispatch<SetStateAction<Record<string, string>>>,
  setMirrorGroups: Dispatch<SetStateAction<SignalFlowMirrorGroups>>,
  setFirPhaseCorrection: Dispatch<SetStateAction<Record<string, FirPhaseCorrectionUiSettingsV1>>>,
  setDeq: Dispatch<SetStateAction<Record<string, DeqBandUiSettingsV1>>>,
) {
  const uiMeta: SignalFlowUiMetadata | undefined = flow.uiMetadata;
  const serverColors = uiMeta?.channelColors ?? {};
  const serverNames = uiMeta?.channelNames ?? {};
  const serverMirrorGroups = uiMeta?.mirrorGroups ?? { input: [], output: [] };
  const serverFirPhaseCorrection = uiMeta?.firPhaseCorrection;
  const serverDeq = uiMeta?.deq;

  setChannelColors(buildDefaultColors(flow, activeUnitId, serverColors));
  setChannelNames(serverNames);
  setMirrorGroups(serverMirrorGroups);
  setFirPhaseCorrection((prev) => serverFirPhaseCorrection ?? prev);
  setDeq((prev) => serverDeq ?? prev);
}

export function useSignalFlowSync({
  activeUnitId,
  flow,
  pendingChangesRef,
  prevUnitIdRef,
  setDockedFilterEditor,
  setInputs,
  setOutputs,
  setRoutes,
  setSelectedChannelKey,
  setSelectedRouteIndex,
  setWindows,
  setChannelColors,
  setChannelNames,
  setMirrorGroups,
  setFirPhaseCorrection,
  setDeq,
}: SignalFlowSyncParams) {
  useEffect(() => {
    if (!flow) return;

    const isUnitSwitch = prevUnitIdRef.current !== activeUnitId;
    prevUnitIdRef.current = activeUnitId;

    queueMicrotask(() => {
      if (!isUnitSwitch && pendingChangesRef.current) return;
      applyModelState(flow, setRoutes, setInputs, setOutputs);
      if (isUnitSwitch) {
        resetUiState(setSelectedRouteIndex, setSelectedChannelKey, setWindows, setDockedFilterEditor);
      }
      applyUiMetadata(flow, activeUnitId, setChannelColors, setChannelNames, setMirrorGroups, setFirPhaseCorrection, setDeq);
    });
  }, [
    activeUnitId,
    flow,
    pendingChangesRef,
    prevUnitIdRef,
    setDockedFilterEditor,
    setInputs,
    setOutputs,
    setRoutes,
    setSelectedChannelKey,
    setSelectedRouteIndex,
    setWindows,
    setChannelColors,
    setChannelNames,
    setMirrorGroups,
    setFirPhaseCorrection,
    setDeq,
  ]);
}
