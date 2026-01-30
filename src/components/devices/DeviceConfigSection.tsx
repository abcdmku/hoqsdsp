import { useConfigStatus, useSetConfigJson } from '../../features/configuration';
import {
  useSupportedDeviceTypes,
  useAvailableCaptureDevices,
  useAvailablePlaybackDevices,
} from '../../features/devices';
import { useAutoSetup } from '../../hooks';
import { formatAutoConfigSummary } from '../../lib/devices';
import { AutoSetupDialog } from './AutoSetupDialog';
import { DeviceConfigHeader } from './device-config/DeviceConfigHeader';
import { ModeSelectionCard } from './device-config/ModeSelectionCard';
import { ManualSetupBanner } from './device-config/ManualSetupBanner';
import { DeviceConfigForm } from './device-config/DeviceConfigForm';
import { DeviceLoadErrorBanner } from './device-config/DeviceLoadErrorBanner';
import { DeviceTypesErrorBanner } from './device-config/DeviceTypesErrorBanner';
import { useDeviceConfigState } from './device-config/useDeviceConfigState';

interface DeviceConfigSectionProps {
  unitId: string;
}

export function DeviceConfigSection({ unitId }: DeviceConfigSectionProps) {
  const { hasConfig, isLoading: configLoading, config, dataUpdatedAt } = useConfigStatus(unitId);
  const { data: deviceTypes, isLoading: typesLoading, isError: typesError } = useSupportedDeviceTypes(unitId);
  const setConfigJson = useSetConfigJson(unitId);
  const autoSetup = useAutoSetup(unitId);

  const {
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
  } = useDeviceConfigState({
    config,
    dataUpdatedAt,
    hasConfig,
    deviceTypes,
    setConfigJson,
    autoSetup,
  });

  // Fetch available devices based on selected backends (works without config)
  const { data: captureDevices, isLoading: captureLoading, isError: captureError, error: captureErrorDetails } = useAvailableCaptureDevices(
    unitId,
    formState.inputBackend
  );
  const { data: playbackDevices, isLoading: playbackLoading, isError: playbackError, error: playbackErrorDetails } = useAvailablePlaybackDevices(
    unitId,
    formState.outputBackend
  );

  // Fetch devices for Quick Setup (when backend is selected for auto-config)
  const { data: autoConfigDevices, isLoading: autoConfigLoading } = useAvailablePlaybackDevices(
    unitId,
    selectedBackend
  );

  if (configLoading) {
    return (
      <section>
        <DeviceConfigHeader
          hasConfig={hasConfig}
          autoSetup={autoSetup}
          onAutoSetupClick={handleAutoSetupClick}
        />
        <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
          <p className="text-sm text-dsp-text-muted">
            Loading configuration from CamillaDSP...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <DeviceConfigHeader
        hasConfig={hasConfig}
        autoSetup={autoSetup}
        onAutoSetupClick={handleAutoSetupClick}
      />

      {/* Mode Selection UI */}
      {showModeSelection && (
        <ModeSelectionCard
          safeDeviceTypes={safeDeviceTypes}
          typesLoading={typesLoading}
          typesError={typesError}
          selectedBackend={selectedBackend}
          onSelectedBackendChange={setSelectedBackend}
          onQuickSetup={() => handleQuickSetup(autoConfigDevices)}
          onManualSetup={handleManualSetup}
          autoConfigLoading={autoConfigLoading}
          autoConfigResult={autoConfigResult}
          formatAutoConfigSummary={formatAutoConfigSummary}
          isPending={setConfigJson.isPending}
          onConfirmAutoConfig={handleConfirmAutoConfig}
          onCancelAutoConfig={handleCancelAutoConfig}
          noHardwareFound={noHardwareFound}
        />
      )}

      {/* Manual Setup Banner (when in manual mode) */}
      {configMode === 'manual' && isCreatingMode && (
        <ManualSetupBanner onBack={handleBackToSelection} />
      )}

      {/* Device Types Error - show in mode selection too */}
      {typesError && (
        <DeviceTypesErrorBanner />
      )}

      {/* Full Device Configuration Form */}
      {showFullForm && (
        <>
          {captureError && formState.inputBackend && (
            <DeviceLoadErrorBanner
              label="capture"
              backend={formState.inputBackend}
              error={captureErrorDetails}
            />
          )}
          {playbackError && formState.outputBackend && (
            <DeviceLoadErrorBanner
              label="playback"
              backend={formState.outputBackend}
              error={playbackErrorDetails}
            />
          )}
          <DeviceConfigForm
            formState={formState}
            updateField={updateField}
            safeDeviceTypes={safeDeviceTypes}
            typesLoading={typesLoading}
            typesError={typesError}
            captureDevices={captureDevices}
            captureLoading={captureLoading}
            captureError={captureError}
            playbackDevices={playbackDevices}
            playbackLoading={playbackLoading}
            playbackError={playbackError}
            onInputBackendChange={handleInputBackendChange}
            onOutputBackendChange={handleOutputBackendChange}
            isCreatingMode={isCreatingMode}
            canCreateConfig={Boolean(canCreateConfig)}
            isPending={setConfigJson.isPending}
            isError={setConfigJson.isError}
            onCreateConfig={handleCreateConfig}
            onApply={handleApply}
          />
        </>
      )}
      {/* Auto Setup Dialog */}
      <AutoSetupDialog
        open={autoSetupDialogOpen}
        onOpenChange={setAutoSetupDialogOpen}
        unitId={unitId}
        onConfirm={handleAutoSetupConfirm}
      />
    </section>
  );
}


