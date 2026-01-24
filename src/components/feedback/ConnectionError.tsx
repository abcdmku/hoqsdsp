import type { ReactNode } from 'react';
import { WifiOff, RefreshCw, Settings } from 'lucide-react';
import { Button } from '../ui/Button';

interface ConnectionErrorProps {
  unitName?: string;
  address?: string;
  error?: string;
  onRetry?: () => void;
  onConfigure?: () => void;
  compact?: boolean;
}

export function ConnectionError({
  unitName,
  address,
  error,
  onRetry,
  onConfigure,
  compact = false,
}: ConnectionErrorProps): ReactNode {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 bg-status-error/10 border border-status-error/20 rounded text-sm"
        role="alert"
        aria-live="polite"
      >
        <WifiOff className="w-4 h-4 text-status-error flex-shrink-0" aria-hidden="true" />
        <span className="text-dsp-text-muted truncate">
          {unitName ? `${unitName}: ` : ''}Connection failed
        </span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="ml-auto p-1 h-auto"
            aria-label="Retry connection"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-8 bg-dsp-surface rounded-lg border border-status-error/20"
      role="alert"
      aria-live="polite"
    >
      <div className="p-3 rounded-full bg-status-error/10 mb-4">
        <WifiOff className="w-8 h-8 text-status-error" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-dsp-text mb-1">
        Connection Failed
      </h3>
      {unitName && (
        <p className="text-dsp-text-muted text-sm mb-1">{unitName}</p>
      )}
      {address && (
        <p className="text-dsp-text-muted text-xs font-mono mb-2">{address}</p>
      )}
      {error && (
        <p className="text-status-error text-sm text-center max-w-md mb-4">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Retry
          </Button>
        )}
        {onConfigure && (
          <Button variant="ghost" size="sm" onClick={onConfigure}>
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
            Configure
          </Button>
        )}
      </div>
    </div>
  );
}

interface OperationErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function OperationError({
  title = 'Operation Failed',
  message,
  onRetry,
  onDismiss,
}: OperationErrorProps): ReactNode {
  return (
    <div
      className="flex items-start gap-3 p-4 bg-status-error/10 border border-status-error/20 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="p-1.5 rounded-full bg-status-error/20 flex-shrink-0">
        <WifiOff className="w-4 h-4 text-status-error" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-dsp-text">{title}</h4>
        <p className="text-sm text-dsp-text-muted mt-1">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
