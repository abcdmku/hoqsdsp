import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FilterGraphControlsLayoutProps {
  graph: ReactNode;
  controls: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FilterGraphControlsLayout({ graph, controls, footer, className }: FilterGraphControlsLayoutProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 lg:flex-[5]">
          <div className="rounded-lg bg-dsp-bg/50 p-4">
            <div className="aspect-[4/1] w-full">
              {graph}
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:flex-[1] lg:min-w-[280px] lg:max-w-[340px]">
          <div className="rounded-lg bg-dsp-bg/50 p-4">
            {controls}
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}
