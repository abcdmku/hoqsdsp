import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      {icon && (
        <div className="p-3 rounded-full bg-dsp-primary/20 text-dsp-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-dsp-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-dsp-text-muted max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
