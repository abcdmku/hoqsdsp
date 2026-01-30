import { AlertCircle } from 'lucide-react';

export function DeviceTypesErrorBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
      <AlertCircle className="h-4 w-4" />
      <span>Failed to load supported device types. Check CamillaDSP connection.</span>
    </div>
  );
}
