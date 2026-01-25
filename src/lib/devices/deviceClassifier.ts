import type { DeviceInfo, SampleFormat } from '../../types';

export type DeviceCategory = 'hardware' | 'loopback' | 'null' | 'virtual' | 'unknown';

export interface ClassifiedDevice {
  device: DeviceInfo;
  category: DeviceCategory;
  isHardware: boolean;
}

export interface AutoConfigResult {
  device: DeviceInfo;
  deviceForConfig: string;  // plughw: version for full-duplex
  backend: string;
  channels: number;
  sampleRate: number;
  format: SampleFormat;
  chunkSize: number;
}

// Default values for auto-config
const AUTO_CONFIG_DEFAULTS = {
  channels: 2,
  sampleRate: 48000,
  format: 'S32LE' as SampleFormat,
  chunkSize: 1024,
};

/**
 * Classify a device into a category based on its identifier
 */
export function classifyDevice(device: DeviceInfo): ClassifiedDevice {
  const deviceId = device.device.toLowerCase();
  const name = (device.name ?? '').toLowerCase();

  let category: DeviceCategory = 'unknown';

  // Check for loopback devices
  if (deviceId.includes('loopback') || name.includes('loopback')) {
    category = 'loopback';
  }
  // Check for null device
  else if (deviceId === 'null') {
    category = 'null';
  }
  // Check for virtual/software devices
  else if (
    deviceId.includes('pulse') ||
    deviceId.includes('pipewire') ||
    deviceId.includes('dsnoop') ||
    deviceId.includes('dmix') ||
    deviceId === 'default' ||
    deviceId === 'sysdefault'
  ) {
    category = 'virtual';
  }
  // Check for hardware devices
  else if (
    deviceId.startsWith('hw:') ||
    deviceId.startsWith('plughw:')
  ) {
    category = 'hardware';
  }

  return {
    device,
    category,
    isHardware: category === 'hardware',
  };
}

/**
 * Classify a list of devices
 */
export function classifyDevices(devices: DeviceInfo[]): ClassifiedDevice[] {
  return devices.map(classifyDevice);
}

/**
 * Find the best hardware device from a list of devices
 *
 * Priority:
 * 1. Prefer hw:CARD=X,DEV=0 format (explicit card reference with DEV=0)
 * 2. Prefer hw:CARD=X format (explicit card reference)
 * 3. Any other hw: device
 */
export function findBestHardwareDevice(devices: DeviceInfo[]): DeviceInfo | null {
  const classified = classifyDevices(devices);
  const hardwareDevices = classified.filter((d) => d.isHardware);

  if (hardwareDevices.length === 0) {
    return null;
  }

  // Sort by priority
  hardwareDevices.sort((a, b) => {
    const aDevice = a.device.device;
    const bDevice = b.device.device;

    // Prefer hw:CARD= format over generic hw:X format
    const aHasCard = aDevice.includes('CARD=');
    const bHasCard = bDevice.includes('CARD=');

    if (aHasCard && !bHasCard) return -1;
    if (!aHasCard && bHasCard) return 1;

    // Prefer DEV=0 (primary device)
    const aHasDev0 = aDevice.includes('DEV=0');
    const bHasDev0 = bDevice.includes('DEV=0');

    if (aHasDev0 && !bHasDev0) return -1;
    if (!aHasDev0 && bHasDev0) return 1;

    return 0;
  });

  const best = hardwareDevices[0];
  return best ? best.device : null;
}

/**
 * Convert hw: device to plughw: for full-duplex support
 *
 * plughw: allows automatic format/rate conversion and enables
 * full-duplex operation on the same device (same device for both
 * capture and playback).
 */
export function convertToPlugHw(deviceId: string): string {
  if (deviceId.startsWith('hw:')) {
    return 'plughw:' + deviceId.slice(3);
  }
  // Already plughw: or other format
  return deviceId;
}

/**
 * Generate auto-configuration for a given device
 */
export function generateAutoConfig(
  device: DeviceInfo,
  backend: string,
): AutoConfigResult {
  return {
    device,
    deviceForConfig: convertToPlugHw(device.device),
    backend,
    channels: AUTO_CONFIG_DEFAULTS.channels,
    sampleRate: AUTO_CONFIG_DEFAULTS.sampleRate,
    format: AUTO_CONFIG_DEFAULTS.format,
    chunkSize: AUTO_CONFIG_DEFAULTS.chunkSize,
  };
}

/**
 * Get a user-friendly label for a device
 */
export function getDeviceDisplayName(device: DeviceInfo): string {
  if (device.name) {
    // Extract card name from formats like "E2x2, USB Audio, ..."
    const parts = device.name.split(',');
    const firstPart = parts[0];
    if (firstPart) {
      return firstPart.trim();
    }
    return device.name;
  }
  return device.device;
}

/**
 * Format auto-config details for display
 */
export function formatAutoConfigSummary(config: AutoConfigResult): string {
  const deviceName = getDeviceDisplayName(config.device);
  const rate = config.sampleRate / 1000;
  return `${deviceName} (${config.channels}ch, ${rate}kHz, ${config.format})`;
}
