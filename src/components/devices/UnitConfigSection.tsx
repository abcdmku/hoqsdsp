import { useState, useMemo } from 'react';
import { Server, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useUnitStore } from '../../stores/unitStore';
import { useConnectionStore } from '../../stores/connectionStore';

interface UnitFormState {
  name: string;
  address: string;
  port: number;
  zone: string;
}

interface UnitConfigSectionProps {
  unitId: string;
}

export function UnitConfigSection({ unitId }: UnitConfigSectionProps) {
  const unit = useUnitStore((state) => state.units.find((u) => u.id === unitId));
  const updateUnit = useUnitStore((state) => state.updateUnit);
  const removeUnit = useUnitStore((state) => state.removeUnit);
  const disconnectUnit = useConnectionStore((state) => state.disconnectUnit);
  const connectUnit = useConnectionStore((state) => state.connectUnit);
  const connectionStatus = useConnectionStore(
    (state) => state.connections.get(unitId)?.status ?? 'disconnected'
  );

  // Track local edits
  const [localEdits, setLocalEdits] = useState<Partial<UnitFormState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute form state
  const formState = useMemo((): UnitFormState | null => {
    if (!unit) return null;
    return {
      name: localEdits.name ?? unit.name,
      address: localEdits.address ?? unit.address,
      port: localEdits.port ?? unit.port,
      zone: localEdits.zone ?? unit.zone ?? '',
    };
  }, [unit, localEdits]);

  const updateField = <K extends keyof UnitFormState>(field: K, value: UnitFormState[K]) => {
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!unit || !formState) return;

    // Validate
    if (!formState.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formState.address.trim()) {
      setError('Address is required');
      return;
    }
    if (formState.port < 1 || formState.port > 65535) {
      setError('Port must be between 1 and 65535');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const addressChanged = formState.address !== unit.address || formState.port !== unit.port;

      // Update the unit in the store
      updateUnit(unitId, {
        name: formState.name,
        address: formState.address,
        port: formState.port,
        zone: formState.zone || undefined,
      });

      // If address/port changed, reconnect
      if (addressChanged && connectionStatus === 'connected') {
        await disconnectUnit(unitId);
        await connectUnit(unitId, formState.address, formState.port);
      }

      // Clear local edits on success
      setLocalEdits({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!unit) return;

    if (connectionStatus === 'connected') {
      await disconnectUnit(unitId);
    }
    removeUnit(unitId);
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!unit) return;
    setIsConnecting(true);
    try {
      if (connectionStatus === 'connected') {
        await disconnectUnit(unitId);
      } else {
        await connectUnit(unitId, unit.address, unit.port);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const hasChanges = Object.keys(localEdits).length > 0;

  if (!unit || !formState) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dsp-text">
        <Server className="h-5 w-5" />
        Unit Configuration
      </h2>
      <div className="space-y-4 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-status-online'
                  : connectionStatus === 'connecting'
                  ? 'bg-meter-yellow animate-pulse'
                  : connectionStatus === 'error'
                  ? 'bg-status-error'
                  : 'bg-status-offline'
              }`}
            />
            <span className="text-dsp-text-muted">
              {connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'error'
                ? 'Connection Error'
                : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting || connectionStatus === 'connecting'}
          >
            {isConnecting || connectionStatus === 'connecting'
              ? 'Connecting...'
              : connectionStatus === 'connected'
              ? 'Disconnect'
              : 'Connect'}
          </Button>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Name</label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
          />
        </div>

        {/* Address and Port */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs text-dsp-text-muted">Address</label>
            <input
              type="text"
              value={formState.address}
              onChange={(e) => { updateField('address', e.target.value); }}
              placeholder="192.168.1.100"
              className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-dsp-text-muted">Port</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={formState.port}
              onChange={(e) => { updateField('port', Number(e.target.value)); }}
              className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Zone */}
        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">
            Zone <span className="text-dsp-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={formState.zone}
            onChange={(e) => { updateField('zone', e.target.value); }}
            placeholder="FOH, Monitors, etc."
            className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 rounded border border-status-error/50 bg-status-error/10 p-3 text-sm text-status-error">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={handleDelete} className="text-status-error hover:text-status-error">
            Delete Unit
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </section>
  );
}
