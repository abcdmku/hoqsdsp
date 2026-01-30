import type { ReactNode } from 'react';
import type { DeviceInfo, SampleFormat } from '../../../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { SAMPLE_FORMATS } from './constants';
import { getDeviceLabel } from './utils';

interface DeviceSectionFieldsProps {
  title: string;
  icon: ReactNode;
  backendValue: string | null;
  deviceValue: string;
  channelsValue: number;
  formatValue: SampleFormat;
  onBackendChange: (value: string) => void;
  onDeviceChange: (value: string) => void;
  onChannelsChange: (value: number) => void;
  onFormatChange: (value: SampleFormat) => void;
  backendOptions: string[];
  backendLoading: boolean;
  backendError: boolean;
  devices?: DeviceInfo[];
  devicesLoading: boolean;
  devicesError: boolean;
}

export function DeviceSectionFields({
  title,
  icon,
  backendValue,
  deviceValue,
  channelsValue,
  formatValue,
  onBackendChange,
  onDeviceChange,
  onChannelsChange,
  onFormatChange,
  backendOptions,
  backendLoading,
  backendError,
  devices,
  devicesLoading,
  devicesError,
}: DeviceSectionFieldsProps) {
  const deviceCountLabel = devices && devices.length > 0 ? `(${devices.length} found)` : '';

  const backendPlaceholder = backendLoading
    ? 'Loading...'
    : backendError
      ? 'Error loading backends'
      : backendOptions.length === 0
        ? 'No backends available'
        : 'Select backend';

  const devicePlaceholder = devicesLoading
    ? 'Loading...'
    : devicesError
      ? 'Error loading devices'
      : devices?.length === 0
        ? 'No devices found'
        : 'Select device';

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dsp-text">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Backend Type</label>
          <Select value={backendValue ?? undefined} onValueChange={onBackendChange}>
            <SelectTrigger>
              <SelectValue placeholder={backendPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {backendOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">
            Device {deviceCountLabel}
          </label>
          <Select
            value={deviceValue}
            onValueChange={onDeviceChange}
            disabled={!backendValue || devicesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={devicePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {devices?.map((device) => (
                <SelectItem key={device.device} value={device.device}>
                  {getDeviceLabel(device)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Channels</label>
          <input
            type="number"
            min={1}
            max={64}
            value={channelsValue}
            onChange={(e) => onChannelsChange(Number(e.target.value))}
            className="w-full rounded border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text focus:border-dsp-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Sample Format</label>
          <Select value={formatValue} onValueChange={(v) => onFormatChange(v as SampleFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLE_FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
