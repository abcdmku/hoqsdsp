import { useState, useCallback } from 'react';
import { websocketService } from '../services/websocketService';
import { useSetConfigJson } from '../features/configuration/configMutations';
import { createMinimalConfig } from '../lib/config/createConfig';
import {
  findBestHardwareDevice,
  generateAutoConfig,
  formatAutoConfigSummary,
  type AutoConfigResult,
} from '../lib/devices/deviceClassifier';
import { parseDeviceList } from '../features/devices';
import type { DeviceInfo } from '../types';

export interface AutoSetupResult {
  success: boolean;
  captureConfig?: AutoConfigResult;
  playbackConfig?: AutoConfigResult;
  error?: string;
}

export interface AutoSetupState {
  isRunning: boolean;
  step: 'idle' | 'detecting' | 'configuring' | 'applying' | 'done' | 'error';
  message: string;
  result?: AutoSetupResult;
}

interface DetectedDevices {
  backend: string;
  captureDevices: DeviceInfo[];
  playbackDevices: DeviceInfo[];
  bestCapture: DeviceInfo | null;
  bestPlayback: DeviceInfo | null;
}

/**
 * Hook for auto-detecting and configuring a connected DSP device
 *
 * Finds available hardware devices and sets up a minimal working configuration
 * with sensible defaults (48kHz, 2ch, S32LE, 1024 chunk size).
 */
export function useAutoSetup(unitId: string) {
  const [state, setState] = useState<AutoSetupState>({
    isRunning: false,
    step: 'idle',
    message: '',
  });

  const setConfigMutation = useSetConfigJson(unitId);

  const detectDevices = useCallback(async (): Promise<DetectedDevices | null> => {
    setState(s => ({ ...s, step: 'detecting', message: 'Querying supported backends...' }));

    // Get supported device types (backends)
    const backends = await websocketService.getSupportedDeviceTypes(unitId);

    // Prefer Alsa on Linux, otherwise use the first available backend
    const preferredBackends = ['Alsa', 'CoreAudio', 'Wasapi'];
    const backend = preferredBackends.find(b => backends.includes(b)) ?? backends[0];

    if (!backend) {
      throw new Error('No supported audio backends found');
    }

    setState(s => ({ ...s, message: `Found backend: ${backend}. Scanning devices...` }));

    // Query available devices for this backend
    const [rawCaptureDevices, rawPlaybackDevices] = await Promise.all([
      websocketService.getAvailableCaptureDevices(unitId, backend),
      websocketService.getAvailablePlaybackDevices(unitId, backend),
    ]);

    // Parse the raw device arrays into DeviceInfo objects
    // CamillaDSP returns devices as arrays: [device_id, description]
    const captureDevices = parseDeviceList(rawCaptureDevices);
    const playbackDevices = parseDeviceList(rawPlaybackDevices);

    // Debug: log device data
    console.log('[AutoSetup] Backend:', backend);
    console.log('[AutoSetup] Parsed capture devices:', captureDevices.slice(0, 5));
    console.log('[AutoSetup] Parsed playback devices:', playbackDevices.slice(0, 5));

    setState(s => ({
      ...s,
      message: `Found ${captureDevices.length} capture and ${playbackDevices.length} playback devices`
    }));

    // Find best hardware devices (pass backend for platform-specific classification)
    const bestCapture = findBestHardwareDevice(captureDevices, backend);
    const bestPlayback = findBestHardwareDevice(playbackDevices, backend);

    console.log('[AutoSetup] Best capture:', bestCapture);
    console.log('[AutoSetup] Best playback:', bestPlayback);

    return {
      backend,
      captureDevices,
      playbackDevices,
      bestCapture,
      bestPlayback,
    };
  }, [unitId]);

  const runAutoSetup = useCallback(async (): Promise<AutoSetupResult> => {
    setState({ isRunning: true, step: 'detecting', message: 'Starting auto setup...' });

    try {
      // Step 1: Detect devices
      const detected = await detectDevices();

      if (!detected) {
        throw new Error('Device detection failed');
      }

      const { backend, bestCapture, bestPlayback } = detected;

      if (!bestCapture && !bestPlayback) {
        throw new Error('No hardware devices found. Please check your audio interface connection.');
      }

      // Use the same device for both if only one is found (common for USB audio interfaces)
      const captureDevice = bestCapture ?? bestPlayback;
      const playbackDevice = bestPlayback ?? bestCapture;

      if (!captureDevice || !playbackDevice) {
        throw new Error('Could not determine capture and playback devices');
      }

      // Step 2: Generate auto config
      setState(s => ({ ...s, step: 'configuring', message: 'Generating configuration...' }));

      const captureConfig = generateAutoConfig(captureDevice, backend);
      const playbackConfig = generateAutoConfig(playbackDevice, backend);

      const captureSummary = formatAutoConfigSummary(captureConfig);
      const playbackSummary = formatAutoConfigSummary(playbackConfig);

      setState(s => ({
        ...s,
        message: `Capture: ${captureSummary}\nPlayback: ${playbackSummary}`
      }));

      // Step 3: Create minimal config
      const config = createMinimalConfig({
        captureDevice: captureConfig.deviceForConfig,
        captureBackend: captureConfig.backend,
        captureChannels: captureConfig.channels,
        captureFormat: captureConfig.format,
        playbackDevice: playbackConfig.deviceForConfig,
        playbackBackend: playbackConfig.backend,
        playbackChannels: playbackConfig.channels,
        playbackFormat: playbackConfig.format,
        sampleRate: captureConfig.sampleRate,
        chunkSize: captureConfig.chunkSize,
      });

      // Step 4: Apply config to device
      setState(s => ({ ...s, step: 'applying', message: 'Applying configuration...' }));

      await setConfigMutation.mutateAsync(config);
      setConfigMutation.invalidate();

      const result: AutoSetupResult = {
        success: true,
        captureConfig,
        playbackConfig,
      };

      setState({
        isRunning: false,
        step: 'done',
        message: 'Auto setup complete!',
        result,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: AutoSetupResult = {
        success: false,
        error: errorMessage,
      };

      setState({
        isRunning: false,
        step: 'error',
        message: errorMessage,
        result,
      });

      return result;
    }
  }, [detectDevices, setConfigMutation]);

  // Apply config with user-selected devices
  const applyWithDevices = useCallback(async (
    captureDevice: DeviceInfo,
    playbackDevice: DeviceInfo,
    backend: string
  ): Promise<AutoSetupResult> => {
    setState({ isRunning: true, step: 'configuring', message: 'Generating configuration...' });

    try {
      const captureConfig = generateAutoConfig(captureDevice, backend);
      const playbackConfig = generateAutoConfig(playbackDevice, backend);

      const config = createMinimalConfig({
        captureDevice: captureConfig.deviceForConfig,
        captureBackend: captureConfig.backend,
        captureChannels: captureConfig.channels,
        captureFormat: captureConfig.format,
        playbackDevice: playbackConfig.deviceForConfig,
        playbackBackend: playbackConfig.backend,
        playbackChannels: playbackConfig.channels,
        playbackFormat: playbackConfig.format,
        sampleRate: captureConfig.sampleRate,
        chunkSize: captureConfig.chunkSize,
      });

      setState(s => ({ ...s, step: 'applying', message: 'Applying configuration...' }));

      await setConfigMutation.mutateAsync(config);
      setConfigMutation.invalidate();

      const result: AutoSetupResult = {
        success: true,
        captureConfig,
        playbackConfig,
      };

      setState({
        isRunning: false,
        step: 'done',
        message: 'Auto setup complete!',
        result,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: AutoSetupResult = {
        success: false,
        error: errorMessage,
      };

      setState({
        isRunning: false,
        step: 'error',
        message: errorMessage,
        result,
      });

      return result;
    }
  }, [setConfigMutation]);

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      step: 'idle',
      message: '',
      result: undefined,
    });
  }, []);

  return {
    ...state,
    runAutoSetup,
    applyWithDevices,
    reset,
  };
}
