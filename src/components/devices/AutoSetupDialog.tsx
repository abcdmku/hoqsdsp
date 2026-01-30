import { useState, useEffect } from 'react';
import { Loader2, Speaker, Mic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { websocketService } from '../../services/websocketService';
import { parseDeviceList } from '../../features/devices';
import type { DeviceInfo } from '../../types';
import { DeviceListSection } from './auto-setup/DeviceListSection';
import { filterSensibleDevices, type ClassifiedDeviceInfo } from './auto-setup/autoSetupUtils';

interface AutoSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  onConfirm: (captureDevice: DeviceInfo, playbackDevice: DeviceInfo, backend: string) => void;
}


export function AutoSetupDialog({ open, onOpenChange, unitId, onConfirm }: AutoSetupDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');
  const [captureDevices, setCaptureDevices] = useState<ClassifiedDeviceInfo[]>([]);
  const [playbackDevices, setPlaybackDevices] = useState<ClassifiedDeviceInfo[]>([]);
  const [selectedCapture, setSelectedCapture] = useState<DeviceInfo | null>(null);
  const [selectedPlayback, setSelectedPlayback] = useState<DeviceInfo | null>(null);

  // Fetch devices when dialog opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    setSelectedCapture(null);
    setSelectedPlayback(null);

    const fetchDevices = async () => {
      try {
        // Get supported backends
        const backends = await websocketService.getSupportedDeviceTypes(unitId);

        const preferredBackends = ['Alsa', 'CoreAudio', 'Wasapi'];
        const selectedBackend = preferredBackends.find(b => backends.includes(b)) ?? backends[0];

        if (!selectedBackend) {
          throw new Error('No supported audio backends found');
        }

        setBackend(selectedBackend);

        // Fetch devices
        const [rawCapture, rawPlayback] = await Promise.all([
          websocketService.getAvailableCaptureDevices(unitId, selectedBackend),
          websocketService.getAvailablePlaybackDevices(unitId, selectedBackend),
        ]);

        const parsedCapture = parseDeviceList(rawCapture);
        const parsedPlayback = parseDeviceList(rawPlayback);

        const filteredCapture = filterSensibleDevices(parsedCapture, selectedBackend);
        const filteredPlayback = filterSensibleDevices(parsedPlayback, selectedBackend);

        setCaptureDevices(filteredCapture);
        setPlaybackDevices(filteredPlayback);

        // Don't auto-select - let user choose
        setLoading(false);
      } catch (err) {
        console.error('[AutoSetupDialog] Error fetching devices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch devices');
        setLoading(false);
      }
    };

    void fetchDevices();
  }, [open, unitId]);

  const canConfirm = selectedCapture && selectedPlayback;

  const handleConfirm = () => {
    if (selectedCapture && selectedPlayback) {
      onConfirm(selectedCapture, selectedPlayback, backend);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Auto Setup</DialogTitle>
          <DialogDescription>
            Select the audio devices to use for capture (input) and playback (output).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-dsp-accent" />
            <span className="ml-2 text-dsp-text-muted">Scanning devices...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-400">{error}</div>
        ) : (
          <div className="space-y-4">
            <DeviceListSection
              devices={captureDevices}
              emptyMessage="No hardware capture devices found"
              icon={<Mic className="h-4 w-4" />}
              selectedDevice={selectedCapture}
              title="Capture Device (Input)"
              onSelect={(device) => setSelectedCapture(device)}
            />

            <DeviceListSection
              devices={playbackDevices}
              emptyMessage="No hardware playback devices found"
              icon={<Speaker className="h-4 w-4" />}
              selectedDevice={selectedPlayback}
              title="Playback Device (Output)"
              onSelect={(device) => setSelectedPlayback(device)}
            />

            {backend && (
              <p className="text-xs text-dsp-text-muted">
                Backend: {backend}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || loading}>
            Apply Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

