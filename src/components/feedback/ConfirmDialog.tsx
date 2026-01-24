import type { ReactNode } from 'react';
import { useState, useCallback } from 'react';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';

type ConfirmVariant = 'danger' | 'warning' | 'default';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const variantStyles: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconClass: string; buttonVariant: 'danger' | 'default' }> = {
  danger: {
    icon: Trash2,
    iconClass: 'text-status-error',
    buttonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-meter-yellow',
    buttonVariant: 'default',
  },
  default: {
    icon: XCircle,
    iconClass: 'text-dsp-text-muted',
    buttonVariant: 'default',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps): ReactNode {
  const { icon: Icon, iconClass, buttonVariant } = variantStyles[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-dsp-primary/20 ${iconClass}`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier confirm dialog usage

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface UseConfirmDialogReturn {
  confirm: () => Promise<boolean>;
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
  };
}

export function useConfirmDialog(
  options: UseConfirmDialogOptions
): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback(() => {
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolver?.(true);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    resolver?.(false);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  return {
    confirm,
    dialogProps: {
      ...options,
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (!open) {
          handleCancel();
        }
      },
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
