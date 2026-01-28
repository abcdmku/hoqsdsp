import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PageProps {
  children: ReactNode;
  className?: string;
}

export function Page({ children, className }: PageProps) {
  return <div className={cn('flex h-full flex-col bg-dsp-bg', className)}>{children}</div>;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-dsp-primary/50 bg-dsp-surface/40 px-6 py-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-dsp-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-dsp-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export interface PageBodyProps {
  children: ReactNode;
  className?: string;
}

export function PageBody({ children, className }: PageBodyProps) {
  return <div className={cn('flex-1 overflow-auto p-6', className)}>{children}</div>;
}
