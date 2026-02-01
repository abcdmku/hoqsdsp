import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): ReactNode {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-dsp-primary/50',
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className }: SkeletonProps): ReactNode {
  return <Skeleton className={cn('h-4 w-full', className)} />;
}

export function SkeletonButton({ className }: SkeletonProps): ReactNode {
  return <Skeleton className={cn('h-9 w-24', className)} />;
}

export function SkeletonCard({ className }: SkeletonProps): ReactNode {
  return (
    <div className={cn('p-4 bg-dsp-surface rounded-lg space-y-3', className)}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonMeter({ className }: SkeletonProps): ReactNode {
  return <Skeleton className={cn('h-32 w-4', className)} />;
}

export function SkeletonUnitCard({ className }: SkeletonProps): ReactNode {
  return (
    <div
      className={cn(
        'p-4 bg-dsp-surface rounded-lg border border-dsp-primary/20',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SkeletonProcessingBlock({ className }: SkeletonProps): ReactNode {
  return (
    <div
      className={cn(
        'p-3 bg-dsp-surface rounded border border-dsp-primary/20',
        className
      )}
    >
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonEQEditor({ className }: SkeletonProps): ReactNode {
  return (
    <div className={cn('p-4', className)}>
      <Skeleton className="h-64 w-full mb-4 rounded-lg" />
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRoutingMatrix({ className }: SkeletonProps): ReactNode {
  return (
    <div className={cn('p-4', className)}>
      <div className="grid grid-cols-5 gap-1">
        <Skeleton className="h-8 w-8" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
        {[...Array(4)].map((_, row) => (
          <div key={row} className="contents">
            <Skeleton className="h-8 w-8" />
            {[...Array(4)].map((_, col) => (
              <Skeleton key={col} className="h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
