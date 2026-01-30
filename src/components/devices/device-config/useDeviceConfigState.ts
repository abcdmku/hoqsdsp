import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '../../feedback';
import { findBestHardwareDevice, generateAutoConfig, type AutoConfigResult } from '../../../lib/devices';
import type { CamillaConfig, DeviceInfo } from '../../../types';
import { DEFAULT_FORM_STATE } from './constants';
import type { ConfigMode, DeviceFormState } from './types';
import { buildUpdatedConfig, createConfigFromAutoResult, createConfigFromFormState, getFormStateFromConfig } from './utils';

interface ConfigMutation {
  mutate: (config: CamillaConfig, options?: { onSuccess?: () => void }) => void;
}
interface AutoSetupController {
  applyWithDevices: (
    captureDevice: DeviceInfo,
    playbackDevice: DeviceInfo,
    backend: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

interface UseDeviceConfigStateParams {
  config: CamillaConfig | null;
  dataUpdatedAt: number;
  hasConfig: boolean;
  deviceTypes?: string[];
  setConfigJson: ConfigMutation;
  autoSetup: AutoSetupController;
}

export interface DeviceConfigState {
  configMode: ConfigMode;
  autoConfigResult: AutoConfigResult | null;
  selectedBackend: string | null;
  noHardwareFound: boolean;
  autoSetupDialogOpen: boolean;
  formState: DeviceFormState;
  safeDeviceTypes: string[];
  canCreateConfig: boolean;
  isCreatingMode: boolean;
  showModeSelection: boolean;
  showFullForm: boolean;
  updateField: <K extends keyof DeviceFormState>(field: K, value: DeviceFormState[K]) => void;
  handleInputBackendChange: (value: string) => void;
  handleOutputBackendChange: (value: string) => void;
  handleApply: () => void;
  handleCreateConfig: () => void;
  handleQuickSetup: (autoConfigDevices?: DeviceInfo[]) => void;
  handleConfirmAutoConfig: () => void;
  handleCancelAutoConfig: () => void;
  handleManualSetup: () => void;
  handleBackToSelection: () => void;
  handleAutoSetupClick: () => void;
  handleAutoSetupConfirm: (capture: DeviceInfo, playback: DeviceInfo, backend: string) => Promise<void>;
  setSelectedBackend: (value: string | null) => void;
  setAutoSetupDialogOpen: (open: boolean) => void;
}

export function useDeviceConfigState({
  config,
  dataUpdatedAt,
  hasConfig,
  deviceTypes,
  setConfigJson,
  autoSetup,
}: UseDeviceConfigStateParams): DeviceConfigState {
  const [configMode, setConfigMode] = useState<ConfigMode>(null);
  const [autoConfigResult, setAutoConfigResult] = useState<AutoConfigResult | null>(null);
  const [selectedBackend, setSelectedBackend] = useState<string | null>(null);
  const [noHardwareFound, setNoHardwareFound] = useState(false);
  const [autoSetupDialogOpen, setAutoSetupDialogOpen] = useState(false);
  const [localEdits, setLocalEdits] = useState<Partial<DeviceFormState>>({});
  const [lastDataUpdatedAt, setLastDataUpdatedAt] = useState(dataUpdatedAt);

  useEffect(() => {
    if (dataUpdatedAt === lastDataUpdatedAt) return;
    setLastDataUpdatedAt(dataUpdatedAt);
    setLocalEdits({});
  }, [dataUpdatedAt, lastDataUpdatedAt]);

  const safeDeviceTypes = useMemo(
    () => (Array.isArray(deviceTypes) ? deviceTypes : []),
    [deviceTypes],
  );

  const formState = useMemo((): DeviceFormState => {
    const baseState = config ? getFormStateFromConfig(config) : DEFAULT_FORM_STATE;
    return { ...baseState, ...localEdits };
  }, [config, localEdits]);

  const updateField = useCallback(
    <K extends keyof DeviceFormState>(field: K, value: DeviceFormState[K]) => {
      setLocalEdits((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleBackendChange = useCallback(
    (backendKey: 'inputBackend' | 'outputBackend', deviceKey: 'inputDevice' | 'outputDevice', value: string) => {
      if (typeof value !== 'string' || !safeDeviceTypes.includes(value)) return;
      setLocalEdits((prev) => ({ ...prev, [backendKey]: value, [deviceKey]: '' }));
    },
    [safeDeviceTypes],
  );

  const handleInputBackendChange = useCallback(
    (value: string) => {
      handleBackendChange('inputBackend', 'inputDevice', value);
    },
    [handleBackendChange],
  );

  const handleOutputBackendChange = useCallback(
    (value: string) => {
      handleBackendChange('outputBackend', 'outputDevice', value);
    },
    [handleBackendChange],
  );

  const handleApply = useCallback(() => {
    if (!config) return;
    setConfigJson.mutate(buildUpdatedConfig(config, formState));
  }, [config, formState, setConfigJson]);

  const handleCreateConfig = useCallback(() => {
    if (!formState.inputBackend || !formState.outputBackend) return;
    setConfigJson.mutate(createConfigFromFormState(formState));
  }, [formState, setConfigJson]);

  const handleQuickSetup = useCallback(
    (autoConfigDevices?: DeviceInfo[]) => {
      if (!selectedBackend || !autoConfigDevices) return;
      setNoHardwareFound(false);
      const bestDevice = findBestHardwareDevice(autoConfigDevices, selectedBackend);
      if (bestDevice) {
        setAutoConfigResult(generateAutoConfig(bestDevice, selectedBackend));
        return;
      }
      setAutoConfigResult(null);
      setNoHardwareFound(true);
    },
    [selectedBackend],
  );

  const handleConfirmAutoConfig = useCallback(() => {
    if (!autoConfigResult) return;
    const newConfig = createConfigFromAutoResult(autoConfigResult);
    setConfigJson.mutate(newConfig, {
      onSuccess: () => {
        setAutoConfigResult(null);
        setSelectedBackend(null);
        setConfigMode(null);
      },
    });
  }, [autoConfigResult, setConfigJson]);

  const handleCancelAutoConfig = useCallback(() => {
    setAutoConfigResult(null);
    setNoHardwareFound(false);
  }, []);

  const handleManualSetup = useCallback(() => {
    setConfigMode('manual');
  }, []);

  const handleBackToSelection = useCallback(() => {
    setConfigMode(null);
    setAutoConfigResult(null);
    setSelectedBackend(null);
    setNoHardwareFound(false);
  }, []);

  const handleAutoSetupClick = useCallback(() => {
    setAutoSetupDialogOpen(true);
  }, []);

  const handleAutoSetupConfirm = useCallback(
    async (captureDevice: DeviceInfo, playbackDevice: DeviceInfo, backend: string) => {
      const result = await autoSetup.applyWithDevices(captureDevice, playbackDevice, backend);
      if (result.success) {
        const deviceName = captureDevice.name ?? captureDevice.device ?? 'unknown device';
        showToast.success('Auto Setup Complete', `Configured: ${deviceName}`);
        return;
      }
      showToast.error('Auto Setup Failed', result.error ?? 'Unknown error');
    },
    [autoSetup],
  );

  const canCreateConfig = Boolean(formState.inputBackend && formState.outputBackend);
  const isCreatingMode = !hasConfig;
  const showModeSelection = isCreatingMode && (configMode === null || configMode === 'selection');
  const showFullForm = hasConfig || configMode === 'manual';

  return {
    configMode,
    autoConfigResult,
    selectedBackend,
    noHardwareFound,
    autoSetupDialogOpen,
    formState,
    safeDeviceTypes,
    canCreateConfig,
    isCreatingMode,
    showModeSelection,
    showFullForm,
    updateField,
    handleInputBackendChange,
    handleOutputBackendChange,
    handleApply,
    handleCreateConfig,
    handleQuickSetup,
    handleConfirmAutoConfig,
    handleCancelAutoConfig,
    handleManualSetup,
    handleBackToSelection,
    handleAutoSetupClick,
    handleAutoSetupConfirm,
    setSelectedBackend,
    setAutoSetupDialogOpen,
  };
}
