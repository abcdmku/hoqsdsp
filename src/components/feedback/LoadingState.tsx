import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps): ReactNode {
  return (
    <Loader2
      className={cn('animate-spin text-dsp-accent', sizeClasses[size], className)}
      aria-hidden="true"
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  message = 'Loading...',
  className,
}: LoadingOverlayProps): ReactNode {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center bg-dsp-bg/80 backdrop-blur-sm z-10',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-sm text-dsp-text-muted">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  onRetry?: () => void;
}

export function LoadingState({
  loading,
  error,
  children,
  loadingFallback,
  errorFallback,
  onRetry,
}: LoadingStateProps): ReactNode {
  if (loading) {
    return (
      <>
        {loadingFallback || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <>
        {errorFallback || (
          <div
            className="flex flex-col items-center justify-center p-8 text-center"
            role="alert"
          >
            <p className="text-status-error mb-4">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-dsp-accent hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({
  message = 'Loading',
  className,
}: InlineLoadingProps): ReactNode {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-dsp-text-muted', className)}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="sm" />
      <span>{message}</span>
    </span>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  children: ReactNode;
  loadingText?: string;
}

export function ButtonLoading({
  loading,
  children,
  loadingText = 'Loading...',
}: ButtonLoadingProps): ReactNode {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span>{loadingText}</span>
      </span>
    );
  }

  return <>{children}</>;
}
