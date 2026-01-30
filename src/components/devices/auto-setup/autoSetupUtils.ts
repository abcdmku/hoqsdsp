import type { DeviceInfo } from '../../../types';
import { classifyDevice, type DeviceCategory } from '../../../lib/devices/deviceClassifier';

export interface ClassifiedDeviceInfo extends DeviceInfo {
  category: DeviceCategory;
  isRecommended: boolean;
}

// Extract card name from ALSA device ID for deduplication.
export function extractAlsaCardName(deviceId: string): string | null {
  const cardMatch = deviceId.match(/^(?:plug)?hw:(?:CARD=)?([^,]+)/i);
  return cardMatch?.[1] ?? null;
}

export function filterSensibleDevices(devices: DeviceInfo[], backend: string): ClassifiedDeviceInfo[] {
  const backendLower = backend.toLowerCase();
  const classified = devices.map((device) => {
    const classifiedResult = classifyDevice(device, backend);
    const deviceId = device.device?.toLowerCase() ?? '';
    const name = device.name?.toLowerCase() ?? '';
    const isUSB = name.includes('usb') || deviceId.includes('usb');
    const isRecommended = classifiedResult.isHardware && isUSB && !name.includes('loopback');

    return {
      ...device,
      category: classifiedResult.category,
      isRecommended,
    };
  });

  let hardwareDevices = classified.filter((device) => device.category === 'hardware');

  if (backendLower === 'alsa') {
    const cardMap = new Map<string, ClassifiedDeviceInfo>();

    for (const device of hardwareDevices) {
      const deviceId = device.device ?? '';
      const cardName = extractAlsaCardName(deviceId);

      if (!cardName) continue;
      if (deviceId.startsWith('plughw:')) continue;

      const isNumericCard = /^\d+$/.test(cardName);
      const existing = cardMap.get(cardName);

      if (!existing) {
        cardMap.set(isNumericCard ? `__numeric_${cardName}` : cardName, device);
      } else {
        const existingId = existing.device ?? '';
        const existingHasCardFormat = existingId.includes('CARD=');
        const newHasCardFormat = deviceId.includes('CARD=');
        const existingHasDev0 = existingId.includes('DEV=0');
        const newHasDev0 = deviceId.includes('DEV=0');

        if (newHasCardFormat && newHasDev0 && (!existingHasCardFormat || !existingHasDev0)) {
          cardMap.set(cardName, device);
        }
      }
    }

    hardwareDevices = [];
    for (const [key, device] of cardMap.entries()) {
      if (key.startsWith('__numeric_')) {
        const numericCard = key.replace('__numeric_', '');
        const hasNamedVersion = Array.from(cardMap.keys()).some(
          (candidate) => !candidate.startsWith('__numeric_') && extractAlsaCardName(cardMap.get(candidate)?.device ?? '') !== numericCard,
        );
        if (!hasNamedVersion) {
          hardwareDevices.push(device);
        }
      } else {
        hardwareDevices.push(device);
      }
    }
  }

  return hardwareDevices.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return (a.name ?? a.device ?? '').localeCompare(b.name ?? b.device ?? '');
  });
}

export function getDeviceDisplayName(device: DeviceInfo): string {
  if (device.name) {
    const firstLine = device.name.split('\n')[0] ?? device.name;
    const parts = firstLine.split(',');
    return parts[0]?.trim() ?? device.name;
  }
  return device.device ?? 'Unknown device';
}

export function getDeviceSubtitle(device: DeviceInfo): string {
  return device.device ?? '';
}
