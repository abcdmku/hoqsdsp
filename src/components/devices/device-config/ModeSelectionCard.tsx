import { AlertCircle, Cog, Plus, Zap } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import type { AutoConfigResult } from '../../../lib/devices';

interface ModeSelectionCardProps {
  safeDeviceTypes: string[];
  typesLoading: boolean;
  typesError: boolean;
  selectedBackend: string | null;
  onSelectedBackendChange: (value: string) => void;
  onQuickSetup: () => void;
  onManualSetup: () => void;
  autoConfigLoading: boolean;
  autoConfigResult: AutoConfigResult | null;
  formatAutoConfigSummary: (result: AutoConfigResult) => string;
  isPending: boolean;
  onConfirmAutoConfig: () => void;
  onCancelAutoConfig: () => void;
  noHardwareFound: boolean;
}

export function ModeSelectionCard({
  safeDeviceTypes,
  typesLoading,
  typesError,
  selectedBackend,
  onSelectedBackendChange,
  onQuickSetup,
  onManualSetup,
  autoConfigLoading,
  autoConfigResult,
  formatAutoConfigSummary,
  isPending,
  onConfirmAutoConfig,
  onCancelAutoConfig,
  noHardwareFound,
}: ModeSelectionCardProps) {
  const backendPlaceholder = typesLoading
    ? 'Loading...'
    : typesError
      ? 'Error loading backends'
      : safeDeviceTypes.length === 0
        ? 'No backends available'
        : 'Select backend';

  return (
    <div className="mb-4 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-4">
      <div className="mb-4 flex items-center gap-2 text-sm text-dsp-text">
        <Plus className="h-4 w-4 text-dsp-accent" />
        <span>No configuration loaded.</span>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs text-dsp-text-muted">Backend Type</label>
        <Select value={selectedBackend ?? undefined} onValueChange={onSelectedBackendChange}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder={backendPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {safeDeviceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onQuickSetup}
          disabled={!selectedBackend || autoConfigLoading}
          variant="default"
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          {autoConfigLoading ? 'Detecting...' : 'Quick Setup'}
        </Button>
        <Button onClick={onManualSetup} variant="outline" className="flex items-center gap-2">
          <Cog className="h-4 w-4" />
          Manual Setup
        </Button>
      </div>

      <p className="mt-3 text-xs text-dsp-text-muted">
        Quick Setup auto-detects your audio device and configures with recommended settings.
      </p>

      {autoConfigResult && (
        <div className="mt-4 rounded border border-dsp-accent/50 bg-dsp-accent/10 p-3">
          <p className="mb-2 text-sm text-dsp-text">
            <strong>Found:</strong> {formatAutoConfigSummary(autoConfigResult)}
          </p>
          <p className="mb-3 text-xs text-dsp-text-muted">
            Uses the same device for input and output (full-duplex).
          </p>
          <div className="flex gap-2">
            <Button onClick={onConfirmAutoConfig} disabled={isPending} size="sm">
              {isPending ? 'Creating...' : 'Confirm'}
            </Button>
            <Button onClick={onCancelAutoConfig} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {noHardwareFound && (
        <div className="mt-4 rounded border border-status-warning/50 bg-status-warning/10 p-3 text-sm text-dsp-text">
          <AlertCircle className="mb-1 inline h-4 w-4 text-status-warning" />{' '}
          No hardware audio device detected. Please connect a device or use Manual Setup.
        </div>
      )}
    </div>
  );
}
