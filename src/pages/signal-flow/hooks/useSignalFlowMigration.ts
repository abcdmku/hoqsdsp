import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { CamillaConfig, SignalFlowUiMetadata } from '../../../types';
import type { FromConfigResult } from '../../../lib/signalflow';
import { toConfig } from '../../../lib/signalflow';
import { validateConfig } from '../../../lib/config';
import type { SignalFlowMirrorGroups, UnitSignalFlowPrefs } from '../../../stores/signalFlowUiStore';
import { showToast } from '../../../components/feedback';

interface ConfigMutation {
  mutateAsync: (config: CamillaConfig) => Promise<unknown>;
}

interface MigrationParams {
  activeUnitId: string | null;
  config: CamillaConfig | null;
  flow: FromConfigResult | null;
  localStoragePrefs: UnitSignalFlowPrefs | null;
  migratedRef: MutableRefObject<Set<string>>;
  setChannelColors: Dispatch<SetStateAction<Record<string, string>>>;
  setMirrorGroups: Dispatch<SetStateAction<SignalFlowMirrorGroups>>;
  setConfigJson: ConfigMutation;
}

function hasServerUiData(config: CamillaConfig): boolean {
  return !!(config.ui?.signalFlow?.channelColors || config.ui?.signalFlow?.mirrorGroups);
}

function hasLocalUiData(prefs: UnitSignalFlowPrefs | null): boolean {
  if (!prefs) return false;
  return (
    Object.keys(prefs.channelColors ?? {}).length > 0 ||
    (prefs.mirrorGroups?.input?.length ?? 0) > 0 ||
    (prefs.mirrorGroups?.output?.length ?? 0) > 0
  );
}

function buildMigratedMetadata(prefs: UnitSignalFlowPrefs): SignalFlowUiMetadata {
  return {
    channelColors: prefs.channelColors,
    mirrorGroups: prefs.mirrorGroups,
  };
}

export function useSignalFlowMigration({
  activeUnitId,
  config,
  flow,
  localStoragePrefs,
  migratedRef,
  setChannelColors,
  setMirrorGroups,
  setConfigJson,
}: MigrationParams) {
  useEffect(() => {
    if (!activeUnitId || !config || !flow) return;
    if (migratedRef.current.has(activeUnitId)) return;

    if (hasServerUiData(config)) {
      migratedRef.current.add(activeUnitId);
      return;
    }

    if (!hasLocalUiData(localStoragePrefs)) {
      migratedRef.current.add(activeUnitId);
      return;
    }

    if (!localStoragePrefs) return;
    migratedRef.current.add(activeUnitId);

    const migratedMetadata = buildMigratedMetadata(localStoragePrefs);
    setChannelColors((prev) => ({ ...prev, ...localStoragePrefs.channelColors }));
    setMirrorGroups(localStoragePrefs.mirrorGroups);

    const patchedConfig = toConfig(
      config,
      {
        inputGroups: flow.model.inputGroups,
        outputGroups: flow.model.outputGroups,
        inputs: flow.model.inputs,
        outputs: flow.model.outputs,
        routes: flow.model.routes,
      },
      migratedMetadata,
    );

    const validation = validateConfig(patchedConfig.config);
    if (validation.valid && validation.config) {
      void setConfigJson.mutateAsync(validation.config).then(() => {
        showToast.success('Settings migrated', 'Channel colors and groups synced to server');
      });
    }
  }, [
    activeUnitId,
    config,
    flow,
    localStoragePrefs,
    migratedRef,
    setChannelColors,
    setMirrorGroups,
    setConfigJson,
  ]);
}
