import { Sliders, AlertCircle } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { DeviceConfigSection } from '../components/devices/DeviceConfigSection';
import { UnitConfigSection } from '../components/devices/UnitConfigSection';

/**
 * Settings Page - Application settings and preferences
 */
export function SettingsPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const connectionStatus = useConnectionStore(
    (state) => activeUnitId ? state.connections.get(activeUnitId)?.status : undefined
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dsp-bg">
      {/* Header */}
      <div className="border-b border-dsp-primary/30 px-6 py-4">
        <h1 className="text-xl font-bold text-dsp-text">Settings</h1>
        <p className="text-sm text-dsp-text-muted">
          Configure application preferences and behavior
        </p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* No Unit Selected State */}
          {!activeUnitId && (
            <div className="flex items-center gap-3 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
              <AlertCircle className="h-5 w-5 text-dsp-text-muted" />
              <p className="text-sm text-dsp-text-muted">
                Select a unit from the Dashboard to configure its settings.
              </p>
            </div>
          )}

          {/* Unit Configuration Section */}
          {activeUnitId && <UnitConfigSection unitId={activeUnitId} />}

          {/* Audio Devices Section - shown when unit is connected */}
          {activeUnitId && connectionStatus === 'connected' && (
            <DeviceConfigSection unitId={activeUnitId} />
          )}

          {/* Not Connected State for Audio Devices */}
          {activeUnitId && connectionStatus !== 'connected' && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dsp-text">
                Audio Devices
              </h2>
              <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
                <p className="text-sm text-dsp-text-muted">
                  Connect to the unit to configure audio devices.
                </p>
              </div>
            </section>
          )}

          {/* General Section */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dsp-text">
              <Sliders className="h-5 w-5" />
              General
            </h2>
            <div className="space-y-4 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-dsp-text">
                  Auto-connect to units
                </label>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-dsp-primary bg-dsp-bg"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-dsp-text">
                  Refresh interval (seconds)
                </label>
                <input
                  type="number"
                  defaultValue="1"
                  min="0.1"
                  step="0.1"
                  className="w-24 rounded border border-dsp-primary/30 bg-dsp-bg px-2 py-1 text-sm text-dsp-text"
                />
              </div>
            </div>
          </section>

          {/* Display Section */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-dsp-text">Display</h2>
            <div className="space-y-4 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-dsp-text">
                  Compact view
                </label>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-dsp-primary bg-dsp-bg"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-dsp-text">
                  Show detailed metrics
                </label>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-dsp-primary bg-dsp-bg"
                />
              </div>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-dsp-text">About</h2>
            <div className="rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
              <p className="text-sm text-dsp-text-muted">
                CamillaDSP Frontend v0.1.0
              </p>
              <p className="mt-2 text-xs text-dsp-text-muted">
                A modern web interface for CamillaDSP audio processing.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
