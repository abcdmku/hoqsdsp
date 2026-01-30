import type { ReactNode } from 'react';
import type { DeviceInfo } from '../../../types';
import type { ClassifiedDeviceInfo } from './autoSetupUtils';
import { DeviceOption } from './DeviceOption';

interface DeviceListSectionProps {
  devices: ClassifiedDeviceInfo[];
  emptyMessage: string;
  icon: ReactNode;
  selectedDevice: DeviceInfo | null;
  title: string;
  onSelect: (device: ClassifiedDeviceInfo) => void;
}

export function DeviceListSection({
  devices,
  emptyMessage,
  icon,
  selectedDevice,
  title,
  onSelect,
}: DeviceListSectionProps) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-dsp-text">
        {icon}
        {title}
      </h3>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-dsp-primary/30 bg-dsp-surface p-2">
        {devices.length === 0 ? (
          <p className="py-2 text-center text-sm text-dsp-text-muted">{emptyMessage}</p>
        ) : (
          devices.map((device, idx) => (
            <DeviceOption
              key={`${device.device}-${idx}`}
              device={device}
              selected={selectedDevice?.device === device.device}
              onSelect={() => onSelect(device)}
            />
          ))
        )}
      </div>
    </div>
  );
}
