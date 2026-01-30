import { AlertCircle } from 'lucide-react';

interface DeviceLoadErrorBannerProps {
  label: string;
  backend: string;
  error: unknown;
}

export function DeviceLoadErrorBanner({ label, backend, error }: DeviceLoadErrorBannerProps) {
  const details = error instanceof Error ? error.message : String(error);

  return (
    <div className="mb-4 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load {label} devices for {backend}</span>
      </div>
      <p className="mt-1 text-xs opacity-75">{details}</p>
    </div>
  );
}
