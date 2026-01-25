import { describe, it, expect } from 'vitest';
import {
  classifyDevice,
  findBestHardwareDevice,
  convertToPlugHw,
  generateAutoConfig,
  getDeviceDisplayName,
  formatAutoConfigSummary,
} from './deviceClassifier';
import type { DeviceInfo } from '../../types';

describe('deviceClassifier', () => {
  describe('classifyDevice', () => {
    it('should classify hw: devices as hardware', () => {
      const device: DeviceInfo = { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2, USB Audio' };
      const result = classifyDevice(device);
      expect(result.category).toBe('hardware');
      expect(result.isHardware).toBe(true);
    });

    it('should classify plughw: devices as hardware', () => {
      const device: DeviceInfo = { device: 'plughw:CARD=E2x2,DEV=0', name: 'E2x2' };
      const result = classifyDevice(device);
      expect(result.category).toBe('hardware');
      expect(result.isHardware).toBe(true);
    });

    it('should classify loopback devices', () => {
      const device: DeviceInfo = { device: 'hw:Loopback,0', name: 'Loopback Device' };
      const result = classifyDevice(device);
      expect(result.category).toBe('loopback');
      expect(result.isHardware).toBe(false);
    });

    it('should classify null device', () => {
      const device: DeviceInfo = { device: 'null', name: null };
      const result = classifyDevice(device);
      expect(result.category).toBe('null');
      expect(result.isHardware).toBe(false);
    });

    it('should classify pulse as virtual', () => {
      const device: DeviceInfo = { device: 'pulse', name: 'PulseAudio' };
      const result = classifyDevice(device);
      expect(result.category).toBe('virtual');
      expect(result.isHardware).toBe(false);
    });

    it('should classify pipewire as virtual', () => {
      const device: DeviceInfo = { device: 'pipewire', name: 'PipeWire' };
      const result = classifyDevice(device);
      expect(result.category).toBe('virtual');
      expect(result.isHardware).toBe(false);
    });

    it('should classify default as virtual', () => {
      const device: DeviceInfo = { device: 'default', name: 'Default Device' };
      const result = classifyDevice(device);
      expect(result.category).toBe('virtual');
      expect(result.isHardware).toBe(false);
    });

    it('should classify unknown devices', () => {
      const device: DeviceInfo = { device: 'some_custom_device', name: 'Custom' };
      const result = classifyDevice(device);
      expect(result.category).toBe('unknown');
      expect(result.isHardware).toBe(false);
    });
  });

  describe('findBestHardwareDevice', () => {
    it('should return null for empty list', () => {
      const result = findBestHardwareDevice([]);
      expect(result).toBe(null);
    });

    it('should return null when no hardware devices', () => {
      const devices: DeviceInfo[] = [
        { device: 'null', name: null },
        { device: 'pulse', name: 'PulseAudio' },
      ];
      const result = findBestHardwareDevice(devices);
      expect(result).toBe(null);
    });

    it('should find the only hardware device', () => {
      const devices: DeviceInfo[] = [
        { device: 'null', name: null },
        { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2' },
        { device: 'pulse', name: 'PulseAudio' },
      ];
      const result = findBestHardwareDevice(devices);
      expect(result?.device).toBe('hw:CARD=E2x2,DEV=0');
    });

    it('should prefer hw:CARD= format over generic hw:', () => {
      const devices: DeviceInfo[] = [
        { device: 'hw:0', name: 'Card 0' },
        { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2' },
      ];
      const result = findBestHardwareDevice(devices);
      expect(result?.device).toBe('hw:CARD=E2x2,DEV=0');
    });

    it('should prefer DEV=0 over other device numbers', () => {
      const devices: DeviceInfo[] = [
        { device: 'hw:CARD=E2x2,DEV=1', name: 'E2x2 Device 1' },
        { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2 Device 0' },
      ];
      const result = findBestHardwareDevice(devices);
      expect(result?.device).toBe('hw:CARD=E2x2,DEV=0');
    });

    it('should exclude loopback devices', () => {
      const devices: DeviceInfo[] = [
        { device: 'hw:Loopback,0', name: 'Loopback' },
        { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2' },
      ];
      const result = findBestHardwareDevice(devices);
      expect(result?.device).toBe('hw:CARD=E2x2,DEV=0');
    });
  });

  describe('convertToPlugHw', () => {
    it('should convert hw: to plughw:', () => {
      expect(convertToPlugHw('hw:CARD=E2x2,DEV=0')).toBe('plughw:CARD=E2x2,DEV=0');
    });

    it('should leave plughw: unchanged', () => {
      expect(convertToPlugHw('plughw:CARD=E2x2,DEV=0')).toBe('plughw:CARD=E2x2,DEV=0');
    });

    it('should leave other formats unchanged', () => {
      expect(convertToPlugHw('pulse')).toBe('pulse');
      expect(convertToPlugHw('default')).toBe('default');
    });
  });

  describe('generateAutoConfig', () => {
    it('should generate config with defaults', () => {
      const device: DeviceInfo = { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2' };
      const result = generateAutoConfig(device, 'Alsa');

      expect(result.device).toBe(device);
      expect(result.deviceForConfig).toBe('plughw:CARD=E2x2,DEV=0');
      expect(result.backend).toBe('Alsa');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(48000);
      expect(result.format).toBe('S32LE');
      expect(result.chunkSize).toBe(1024);
    });
  });

  describe('getDeviceDisplayName', () => {
    it('should extract first part from comma-separated name', () => {
      const device: DeviceInfo = { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2, USB Audio, Full Speed' };
      expect(getDeviceDisplayName(device)).toBe('E2x2');
    });

    it('should return full name if no comma', () => {
      const device: DeviceInfo = { device: 'hw:0', name: 'My Audio Card' };
      expect(getDeviceDisplayName(device)).toBe('My Audio Card');
    });

    it('should return device id if name is null', () => {
      const device: DeviceInfo = { device: 'hw:0', name: null };
      expect(getDeviceDisplayName(device)).toBe('hw:0');
    });
  });

  describe('formatAutoConfigSummary', () => {
    it('should format config details', () => {
      const config = generateAutoConfig(
        { device: 'hw:CARD=E2x2,DEV=0', name: 'E2x2, USB Audio' },
        'Alsa'
      );
      const summary = formatAutoConfigSummary(config);
      expect(summary).toBe('E2x2 (2ch, 48kHz, S32LE)');
    });
  });
});
