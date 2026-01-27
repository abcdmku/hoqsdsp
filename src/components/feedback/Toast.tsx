import type { ReactNode } from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster(): ReactNode {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: 'bg-dsp-surface border-dsp-primary text-dsp-text',
        style: {
          background: 'var(--color-dsp-surface)',
          border: '1px solid var(--color-dsp-primary)',
          color: 'var(--color-dsp-text)',
        },
      }}
      theme="dark"
      richColors
      closeButton
    />
  );
}

// Re-export toast for convenience
export { toast };

// Typed toast helpers for common operations
export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
  /** Show an actionable toast with a button */
  action: (
    message: string,
    options: {
      description?: string;
      actionLabel: string;
      onAction: () => void;
      duration?: number;
    }
  ) => {
    return toast(message, {
      description: options.description,
      duration: options.duration ?? 10000,
      action: {
        label: options.actionLabel,
        onClick: options.onAction,
      },
    });
  },
};
