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
 * Classify a device into a category based on its identifier and backend
 */
export function classifyDevice(device: DeviceInfo, backend?: string): ClassifiedDevice {
  const deviceId = (device.device ?? '').toLowerCase();
  const name = (device.name ?? '').toLowerCase();
  const backendLower = (backend ?? '').toLowerCase();

  let category: DeviceCategory = 'unknown';

  // Check for loopback devices (all backends)
  if (deviceId.includes('loopback') || name.includes('loopback')) {
    category = 'loopback';
  }
  // Check for null device
  else if (deviceId === 'null') {
    category = 'null';
  }
  // ALSA hardware devices (Linux)
  else if (deviceId.startsWith('hw:') || deviceId.startsWith('plughw:')) {
    category = 'hardware';
  }
  // ALSA virtual devices (Linux)
  else if (
    deviceId === 'pulse'
    || deviceId === 'pipewire'
    || deviceId === 'default'
    || deviceId === 'sysdefault'
    || deviceId.includes('dsnoop')
    || deviceId.includes('dmix')
  ) {
    category = 'virtual';
  }
  // WASAPI (Windows) - most devices are hardware
  else if (backendLower === 'wasapi') {
    // Filter out virtual audio cable / software devices
    if (
      name.includes('virtual') ||
      name.includes('cable') ||
      name.includes('voicemeeter') ||
      deviceId.includes('virtual')
    ) {
      category = 'virtual';
    } else {
      category = 'hardware';
    }
  }
  // CoreAudio (macOS) - most devices are hardware
  else if (backendLower === 'coreaudio') {
    // Filter out aggregate/virtual devices
    if (
      name.includes('aggregate') ||
      name.includes('virtual') ||
      name.includes('soundflower') ||
      name.includes('blackhole')
    ) {
      category = 'virtual';
    } else {
      category = 'hardware';
    }
  }

  const result = {
    device,
    category,
    isHardware: category === 'hardware',
  };
  return result;
}

/**
 * Classify a list of devices
 */
export function classifyDevices(devices: DeviceInfo[], backend?: string): ClassifiedDevice[] {
  return devices.map(d => classifyDevice(d, backend));
}

/**
 * Find the best hardware device from a list of devices
 *
 * For ALSA (Linux):
 * 1. Prefer hw:CARD=X,DEV=0 format (explicit card reference with DEV=0)
 * 2. Prefer hw:CARD=X format (explicit card reference)
 * 3. Any other hw: device
 *
 * For WASAPI/CoreAudio:
 * - Returns the first non-virtual device (typically USB audio interfaces)
 */
export function findBestHardwareDevice(devices: DeviceInfo[], backend?: string): DeviceInfo | null {
  const classified = classifyDevices(devices, backend);
  const hardwareDevices = classified.filter((d) => d.isHardware);

  if (hardwareDevices.length === 0) {
    return null;
  }

  const backendLower = (backend ?? '').toLowerCase();
  const useAlsaHeuristics = backendLower === 'alsa' || hardwareDevices.some((entry) => {
    const id = (entry.device.device ?? '').toLowerCase();
    return id.startsWith('hw:') || id.startsWith('plughw:');
  });

  // Sort by priority
  hardwareDevices.sort((a, b) => {
    const aDevice = a.device.device ?? '';
    const bDevice = b.device.device ?? '';
    const aName = (a.device.name ?? '').toLowerCase();
    const bName = (b.device.name ?? '').toLowerCase();

    // ALSA-specific sorting
    if (useAlsaHeuristics) {
      const aUpper = aDevice.toUpperCase();
      const bUpper = bDevice.toUpperCase();

      // Prefer hw:CARD= format over generic hw:X format
      const aHasCard = aUpper.includes('CARD=');
      const bHasCard = bUpper.includes('CARD=');

      if (aHasCard && !bHasCard) return -1;
      if (!aHasCard && bHasCard) return 1;

      // Prefer DEV=0 (primary device)
      const aHasDev0 = aUpper.includes('DEV=0');
      const bHasDev0 = bUpper.includes('DEV=0');

      if (aHasDev0 && !bHasDev0) return -1;
      if (!aHasDev0 && bHasDev0) return 1;
    }

    // For all backends: prefer USB audio interfaces
    const aIsUSB = aName.includes('usb') || aDevice.toLowerCase().includes('usb');
    const bIsUSB = bName.includes('usb') || bDevice.toLowerCase().includes('usb');

    if (aIsUSB && !bIsUSB) return -1;
    if (!aIsUSB && bIsUSB) return 1;

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
  const deviceId = device.device ?? '';
  const backendLower = backend.toLowerCase();

  // Only convert to plughw: for ALSA backend (Linux)
  const deviceForConfig = backendLower === 'alsa'
    ? convertToPlugHw(deviceId)
    : deviceId;

  return {
    device,
    deviceForConfig,
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
  return device.device ?? 'Unknown device';
}

/**
 * Format auto-config details for display
 */
export function formatAutoConfigSummary(config: AutoConfigResult): string {
  const deviceName = getDeviceDisplayName(config.device);
  const rate = config.sampleRate / 1000;
  return `${deviceName} (${config.channels}ch, ${rate}kHz, ${config.format})`;
}
