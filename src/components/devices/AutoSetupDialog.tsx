import { useState, useEffect } from 'react';
import { Loader2, Usb, Speaker, Mic } from 'lucide-react';
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
import { classifyDevice, type DeviceCategory } from '../../lib/devices/deviceClassifier';
import type { DeviceInfo } from '../../types';

interface ClassifiedDeviceInfo extends DeviceInfo {
  category: DeviceCategory;
  isRecommended: boolean;
}

interface AutoSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  onConfirm: (captureDevice: DeviceInfo, playbackDevice: DeviceInfo, backend: string) => void;
}

// Extract card name from ALSA device ID for deduplication
// e.g., "hw:CARD=E2x2,DEV=0" -> "E2x2"
// e.g., "hw:E2x2,0,0" -> "E2x2"
// e.g., "hw:0,0" -> "0"
function extractAlsaCardName(deviceId: string): string | null {
  // Match hw:CARD=Name or hw:Name patterns
  const cardMatch = deviceId.match(/^(?:plug)?hw:(?:CARD=)?([^,]+)/i);
  return cardMatch?.[1] ?? null;
}

// Filter and sort devices to show only sensible options
// For ALSA: deduplicate by card, prefer hw:CARD=X,DEV=0 format
function filterSensibleDevices(devices: DeviceInfo[], backend: string): ClassifiedDeviceInfo[] {
  const backendLower = backend.toLowerCase();

  // First pass: classify all devices
  const classified = devices.map(device => {
    const classifiedResult = classifyDevice(device, backend);
    const deviceId = device.device?.toLowerCase() ?? '';
    const name = device.name?.toLowerCase() ?? '';

    // Determine if this is a recommended device (USB audio interface)
    const isUSB = name.includes('usb') || deviceId.includes('usb');
    const isRecommended = classifiedResult.isHardware && isUSB && !name.includes('loopback');

    return {
      ...device,
      category: classifiedResult.category,
      isRecommended,
    };
  });

  // Filter to hardware devices only
  let hardwareDevices = classified.filter(d => d.category === 'hardware');

  // For ALSA: deduplicate by card name, keeping only the best entry per card
  if (backendLower === 'alsa') {
    const cardMap = new Map<string, ClassifiedDeviceInfo>();

    for (const device of hardwareDevices) {
      const deviceId = device.device ?? '';
      const cardName = extractAlsaCardName(deviceId);

      if (!cardName) continue;

      // Skip plughw: variants - we'll convert hw: to plughw: when applying
      if (deviceId.startsWith('plughw:')) continue;

      // Skip numeric-only card references if we have a named version
      const isNumericCard = /^\d+$/.test(cardName);
      const existing = cardMap.get(cardName);

      if (!existing) {
        // First device for this card - but skip if numeric and we might find named version
        if (!isNumericCard) {
          cardMap.set(cardName, device);
        } else {
          // Store numeric temporarily, might be replaced
          cardMap.set(`__numeric_${cardName}`, device);
        }
      } else {
        // Compare and keep the better one
        const existingId = existing.device ?? '';
        const existingHasCardFormat = existingId.includes('CARD=');
        const newHasCardFormat = deviceId.includes('CARD=');
        const existingHasDev0 = existingId.includes('DEV=0');
        const newHasDev0 = deviceId.includes('DEV=0');

        // Prefer CARD= format with DEV=0
        if (newHasCardFormat && newHasDev0 && (!existingHasCardFormat || !existingHasDev0)) {
          cardMap.set(cardName, device);
        }
      }
    }

    // Convert map back to array, excluding numeric-only entries if named version exists
    hardwareDevices = [];
    for (const [key, device] of cardMap.entries()) {
      if (key.startsWith('__numeric_')) {
        const numericCard = key.replace('__numeric_', '');
        // Only include if no named version exists
        const hasNamedVersion = Array.from(cardMap.keys()).some(
          k => !k.startsWith('__numeric_') && extractAlsaCardName(cardMap.get(k)?.device ?? '') !== numericCard
        );
        if (!hasNamedVersion) {
          hardwareDevices.push(device);
        }
      } else {
        hardwareDevices.push(device);
      }
    }
  }

  // Sort: recommended (USB) first, then by name
  return hardwareDevices.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return (a.name ?? a.device ?? '').localeCompare(b.name ?? b.device ?? '');
  });
}

// Get a display name for a device
function getDeviceDisplayName(device: DeviceInfo): string {
  if (device.name) {
    // For ALSA, extract the card name from description
    // e.g., "E2x2, USB Audio\nDirect hardware device..." -> "E2x2"
    const firstLine = device.name.split('\n')[0] ?? device.name;
    const parts = firstLine.split(',');
    return parts[0]?.trim() ?? device.name;
  }
  return device.device ?? 'Unknown device';
}

// Get device subtitle (device ID)
function getDeviceSubtitle(device: DeviceInfo): string {
  return device.device ?? '';
}

export function AutoSetupDialog({ open, onOpenChange, unitId, onConfirm }: AutoSetupDialogProps) {
  console.log('[AutoSetupDialog] Render, open:', open, 'unitId:', unitId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');
  const [captureDevices, setCaptureDevices] = useState<ClassifiedDeviceInfo[]>([]);
  const [playbackDevices, setPlaybackDevices] = useState<ClassifiedDeviceInfo[]>([]);
  const [selectedCapture, setSelectedCapture] = useState<DeviceInfo | null>(null);
  const [selectedPlayback, setSelectedPlayback] = useState<DeviceInfo | null>(null);

  // Fetch devices when dialog opens
  useEffect(() => {
    console.log('[AutoSetupDialog] useEffect triggered, open:', open);
    if (!open) return;

    setLoading(true);
    setError(null);
    setSelectedCapture(null);
    setSelectedPlayback(null);

    const fetchDevices = async () => {
      try {
        console.log('[AutoSetupDialog] Fetching devices for unit:', unitId);

        // Get supported backends
        const backends = await websocketService.getSupportedDeviceTypes(unitId);
        console.log('[AutoSetupDialog] Available backends:', backends);

        const preferredBackends = ['Alsa', 'CoreAudio', 'Wasapi'];
        const selectedBackend = preferredBackends.find(b => backends.includes(b)) ?? backends[0];
        console.log('[AutoSetupDialog] Selected backend:', selectedBackend);

        if (!selectedBackend) {
          throw new Error('No supported audio backends found');
        }

        setBackend(selectedBackend);

        // Fetch devices
        const [rawCapture, rawPlayback] = await Promise.all([
          websocketService.getAvailableCaptureDevices(unitId, selectedBackend),
          websocketService.getAvailablePlaybackDevices(unitId, selectedBackend),
        ]);
        console.log('[AutoSetupDialog] Raw capture devices:', rawCapture);
        console.log('[AutoSetupDialog] Raw playback devices:', rawPlayback);

        const parsedCapture = parseDeviceList(rawCapture);
        const parsedPlayback = parseDeviceList(rawPlayback);
        console.log('[AutoSetupDialog] Parsed capture devices:', parsedCapture);
        console.log('[AutoSetupDialog] Parsed playback devices:', parsedPlayback);

        const filteredCapture = filterSensibleDevices(parsedCapture, selectedBackend);
        const filteredPlayback = filterSensibleDevices(parsedPlayback, selectedBackend);
        console.log('[AutoSetupDialog] Filtered capture devices:', filteredCapture);
        console.log('[AutoSetupDialog] Filtered playback devices:', filteredPlayback);

        setCaptureDevices(filteredCapture);
        setPlaybackDevices(filteredPlayback);

        // Don't auto-select - let user choose
        setLoading(false);
        console.log('[AutoSetupDialog] Device fetch complete');
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
            {/* Capture devices */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-dsp-text">
                <Mic className="h-4 w-4" />
                Capture Device (Input)
              </h3>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-dsp-primary/30 bg-dsp-surface p-2">
                {captureDevices.length === 0 ? (
                  <p className="py-2 text-center text-sm text-dsp-text-muted">
                    No hardware capture devices found
                  </p>
                ) : (
                  captureDevices.map((device, idx) => (
                    <DeviceOption
                      key={`${device.device}-${idx}`}
                      device={device}
                      selected={selectedCapture?.device === device.device}
                      onSelect={() => setSelectedCapture(device)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Playback devices */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-dsp-text">
                <Speaker className="h-4 w-4" />
                Playback Device (Output)
              </h3>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-dsp-primary/30 bg-dsp-surface p-2">
                {playbackDevices.length === 0 ? (
                  <p className="py-2 text-center text-sm text-dsp-text-muted">
                    No hardware playback devices found
                  </p>
                ) : (
                  playbackDevices.map((device, idx) => (
                    <DeviceOption
                      key={`${device.device}-${idx}`}
                      device={device}
                      selected={selectedPlayback?.device === device.device}
                      onSelect={() => setSelectedPlayback(device)}
                    />
                  ))
                )}
              </div>
            </div>

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

interface DeviceOptionProps {
  device: ClassifiedDeviceInfo;
  selected: boolean;
  onSelect: () => void;
}

function DeviceOption({ device, selected, onSelect }: DeviceOptionProps) {
  const displayName = getDeviceDisplayName(device);
  const subtitle = getDeviceSubtitle(device);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors ${
        selected
          ? 'bg-dsp-accent/20 text-dsp-text'
          : 'hover:bg-dsp-primary/30 text-dsp-text-muted'
      }`}
    >
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          selected ? 'border-dsp-accent bg-dsp-accent' : 'border-dsp-text-muted'
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{displayName}</span>
          {device.isRecommended && (
            <span className="flex items-center gap-1 rounded bg-dsp-accent/20 px-1.5 py-0.5 text-xs text-dsp-accent">
              <Usb className="h-3 w-3" />
              USB
            </span>
          )}
        </div>
        <div className="truncate text-xs text-dsp-text-muted">{subtitle}</div>
      </div>
    </button>
  );
}
