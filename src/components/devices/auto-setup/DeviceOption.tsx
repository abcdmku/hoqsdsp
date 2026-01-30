import { Usb } from 'lucide-react';
import type { ClassifiedDeviceInfo } from './autoSetupUtils';
import { getDeviceDisplayName, getDeviceSubtitle } from './autoSetupUtils';

interface DeviceOptionProps {
  device: ClassifiedDeviceInfo;
  selected: boolean;
  onSelect: () => void;
}

export function DeviceOption({ device, selected, onSelect }: DeviceOptionProps) {
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
