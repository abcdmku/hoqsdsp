import { useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { CamillaConfig } from '../../../types';
import type { ChannelNode, FromConfigResult, RouteEdge } from '../../../lib/signalflow';
import type { SignalFlowMirrorGroups, UnitSignalFlowPrefs } from '../../../stores/signalFlowUiStore';
import type { FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import type { DockedFilterEditorState, SignalFlowWindow } from '../windows/types';
import { useSignalFlowCommit } from './useSignalFlowCommit';
import { useSignalFlowFilters } from './useSignalFlowFilters';
import { useSignalFlowMetadata } from './useSignalFlowMetadata';
import { useSignalFlowMigration } from './useSignalFlowMigration';
import { useSignalFlowRoutes } from './useSignalFlowRoutes';
import { useSignalFlowSync } from './useSignalFlowSync';

interface ConfigMutation {
  mutateAsync: (config: CamillaConfig) => Promise<unknown>;
  invalidate: () => void;
}

interface ModelStateParams {
  activeUnitId: string | null;
  config: CamillaConfig | null;
  flow: FromConfigResult | null;
  configRef: MutableRefObject<CamillaConfig | null>;
  flowRef: MutableRefObject<FromConfigResult | null>;
  localStoragePrefs: UnitSignalFlowPrefs | null;
  setConfigJson: ConfigMutation;
  setDockedFilterEditor: Dispatch<SetStateAction<DockedFilterEditorState | null>>;
  setSelectedChannelKey: Dispatch<SetStateAction<string | null>>;
  setSelectedRouteIndex: Dispatch<SetStateAction<number | null>>;
  setWindows: Dispatch<SetStateAction<SignalFlowWindow[]>>;
}

export function useSignalFlowModelState({
  activeUnitId,
  config,
  flow,
  configRef,
  flowRef,
  localStoragePrefs,
  setConfigJson,
  setDockedFilterEditor,
  setSelectedChannelKey,
  setSelectedRouteIndex,
  setWindows,
}: ModelStateParams) {
  const [routes, setRoutes] = useState<RouteEdge[]>([]);
  const [inputs, setInputs] = useState<ChannelNode[]>([]);
  const [outputs, setOutputs] = useState<ChannelNode[]>([]);
  const [channelColors, setChannelColors] = useState<Record<string, string>>({});
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
  const [mirrorGroups, setMirrorGroups] = useState<SignalFlowMirrorGroups>({ input: [], output: [] });
  const [firPhaseCorrection, setFirPhaseCorrection] = useState<Record<string, FirPhaseCorrectionUiSettingsV1>>({});

  const pendingChangesRef = useRef(false);
  const prevUnitIdRef = useRef<string | null>(null);
  const migratedRef = useRef<Set<string>>(new Set());

  useSignalFlowSync({
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
  });

  useSignalFlowMigration({
    activeUnitId,
    config,
    flow,
    localStoragePrefs,
    migratedRef,
    setChannelColors,
    setMirrorGroups,
    setConfigJson,
  });

  const { commitModel } = useSignalFlowCommit({
    configRef,
    flowRef,
    pendingChangesRef,
    routes,
    inputs,
    outputs,
    uiMetadata: {
      channelColors,
      channelNames,
      mirrorGroups,
      firPhaseCorrection,
    },
    setConfigJson,
  });

  const { addRoute, updateRoute, deleteRoute } = useSignalFlowRoutes({
    commitModel,
    setRoutes,
    setSelectedRouteIndex,
  });

  const {
    handlePersistFirPhaseCorrectionSettings,
    handleSetChannelColor,
    handleSetChannelName,
    handleSetMirrorGroup,
  } = useSignalFlowMetadata({
    commitModel,
    setChannelColors,
    setChannelNames,
    setMirrorGroups,
    setFirPhaseCorrection,
    setInputs,
    setOutputs,
  });

  const { labelFor, updateChannelFilters } = useSignalFlowFilters({
    inputs,
    outputs,
    mirrorGroups,
    commitModel,
    setInputs,
    setOutputs,
  });

  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const route of routes) {
      const inputKey = `input:${route.from.deviceId}:${route.from.channelIndex}`;
      const outputKey = `output:${route.to.deviceId}:${route.to.channelIndex}`;
      counts[inputKey] = (counts[inputKey] ?? 0) + 1;
      counts[outputKey] = (counts[outputKey] ?? 0) + 1;
    }
    return counts;
  }, [routes]);

  return {
    addRoute,
    channelColors,
    channelNames,
    connectionCounts,
    deleteRoute,
    firPhaseCorrection,
    handlePersistFirPhaseCorrectionSettings,
    handleSetChannelColor,
    handleSetChannelName,
    handleSetMirrorGroup,
    inputs,
    labelFor,
    mirrorGroups,
    outputs,
    routes,
    updateChannelFilters,
    updateRoute,
  };
}
