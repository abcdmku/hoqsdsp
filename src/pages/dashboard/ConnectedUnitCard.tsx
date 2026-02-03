import { useCallback, useEffect, useMemo, useState } from 'react';
import { UnitCard, type UnitCardProps } from '../../components/dashboard/UnitCard';
import { AutoSetupDialog } from '../../components/devices/AutoSetupDialog';
import { showToast } from '../../components/feedback';
import { useConfigJson } from '../../features/configuration';
import { useUnitLevels, type ChannelLevelState } from '../../features/realtime';
import { useAutoSetup } from '../../hooks';
import { useAutoSetupStore } from '../../stores/autoSetupStore';
import type { DSPUnit, DeviceInfo } from '../../types';

interface ConnectedUnitCardProps
  extends Omit<
    UnitCardProps,
    | 'inputChannels'
    | 'outputChannels'
    | 'sampleRate'
    | 'inputLevels'
    | 'outputLevels'
    | 'inputPeaks'
    | 'outputPeaks'
    | 'clipping'
    | 'hasConfig'
    | 'onAutoSetup'
    | 'isAutoSetupRunning'
  > {
  unit: DSPUnit;
}

export function ConnectedUnitCard({ unit, ...props }: ConnectedUnitCardProps) {
  const { data: config, isLoading: configLoading, error: configError } = useConfigJson(unit.id);
  const isConnected = props.status === 'connected';

  const autoSetup = useAutoSetup(unit.id);
  const [autoSetupDialogOpen, setAutoSetupDialogOpen] = useState(false);

  const pendingUnitId = useAutoSetupStore((state) => state.pendingUnitId);
  const clearPendingRequest = useAutoSetupStore((state) => state.clearPendingRequest);

  const { capture, playback, clippedSamples } = useUnitLevels(isConnected ? unit.id : null, { enabled: isConnected });

  const inputLevels = useMemo<ChannelLevelState[] | undefined>(() => {
    if (!isConnected || capture.length === 0) return undefined;
    return capture;
  }, [isConnected, capture]);

  const outputLevels = useMemo<ChannelLevelState[] | undefined>(() => {
    if (!isConnected || playback.length === 0) return undefined;
    return playback;
  }, [isConnected, playback]);

  const hasConfig = configLoading || configError ? undefined : !!config;

  const handleAutoSetupClick = useCallback(() => {
    setAutoSetupDialogOpen(true);
  }, []);

  const handleDeviceConfirm = useCallback(
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

  useEffect(() => {
    if (pendingUnitId === unit.id && isConnected && !autoSetup.isRunning) {
      clearPendingRequest();
      setAutoSetupDialogOpen(true);
    }
  }, [pendingUnitId, unit.id, isConnected, autoSetup.isRunning, clearPendingRequest]);

  return (
    <>
      <UnitCard
        {...props}
        unit={unit}
        sampleRate={config?.devices.samplerate}
        inputChannels={config?.devices.capture.channels}
        outputChannels={config?.devices.playback.channels}
        inputLevels={inputLevels}
        outputLevels={outputLevels}
        clipping={clippedSamples > 0}
        hasConfig={hasConfig}
        onAutoSetup={handleAutoSetupClick}
        isAutoSetupRunning={autoSetup.isRunning}
      />
      <AutoSetupDialog
        open={autoSetupDialogOpen}
        onOpenChange={setAutoSetupDialogOpen}
        unitId={unit.id}
        onConfirm={handleDeviceConfirm}
      />
    </>
  );
}
