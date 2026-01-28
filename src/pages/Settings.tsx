import { useState } from 'react';
import { Sliders, AlertCircle } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';
import { Page, PageBody, PageHeader } from '../components/layout';
import { Switch } from '../components/ui/Switch';
import { NumericInput } from '../components/ui/NumericInput';
import { DeviceConfigSection } from '../components/devices/DeviceConfigSection';
import { UnitConfigSection } from '../components/devices/UnitConfigSection';

export function SettingsPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const connectionStatus = useConnectionStore((state) =>
    activeUnitId ? state.connections.get(activeUnitId)?.status : undefined
  );

  const [autoConnect, setAutoConnect] = useState(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(1);
  const [compactView, setCompactView] = useState(false);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(true);

  return (
    <Page>
      <PageHeader title="Settings" description="Preferences and unit configuration" />

      <PageBody>
        <div className="max-w-3xl space-y-6">
          {!activeUnitId && (
            <div className="flex items-center gap-3 rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
              <AlertCircle className="h-5 w-5 text-dsp-text-muted" aria-hidden="true" />
              <p className="text-sm text-dsp-text-muted">
                Select a unit in System Overview to configure unit and device settings.
              </p>
            </div>
          )}

          {activeUnitId && <UnitConfigSection unitId={activeUnitId} />}

          {activeUnitId && connectionStatus === 'connected' && <DeviceConfigSection unitId={activeUnitId} />}

          {activeUnitId && connectionStatus !== 'connected' && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-dsp-text">Audio Devices</h2>
              <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
                <p className="text-sm text-dsp-text-muted">Connect to the unit to configure audio devices.</p>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dsp-text">
              <Sliders className="h-4 w-4" aria-hidden="true" />
              General
            </h2>
            <div className="space-y-4 rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-dsp-text">Auto-connect to units</label>
                  <p className="mt-0.5 text-xs text-dsp-text-muted">Attempt to connect when a unit is selected.</p>
                </div>
                <Switch checked={autoConnect} onCheckedChange={setAutoConnect} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-dsp-text">Refresh interval</label>
                  <p className="mt-0.5 text-xs text-dsp-text-muted">Polling interval for live metrics.</p>
                </div>
                <NumericInput
                  value={refreshIntervalSeconds}
                  onChange={setRefreshIntervalSeconds}
                  min={0.1}
                  max={10}
                  step={0.1}
                  precision={1}
                  unit="s"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-dsp-text">Display</h2>
            <div className="space-y-4 rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-dsp-text">Compact view</label>
                  <p className="mt-0.5 text-xs text-dsp-text-muted">Reduce padding and card density.</p>
                </div>
                <Switch checked={compactView} onCheckedChange={setCompactView} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-dsp-text">Detailed metrics</label>
                  <p className="mt-0.5 text-xs text-dsp-text-muted">Show CPU/buffer details throughout the UI.</p>
                </div>
                <Switch checked={showDetailedMetrics} onCheckedChange={setShowDetailedMetrics} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-dsp-text">About</h2>
            <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-4">
              <p className="text-sm text-dsp-text-muted">HOQ DSP Console v0.1.0</p>
              <p className="mt-2 text-xs text-dsp-text-muted">
                A modern web console for CamillaDSP-based processing and monitoring.
              </p>
            </div>
          </section>
        </div>
      </PageBody>
    </Page>
  );
}

