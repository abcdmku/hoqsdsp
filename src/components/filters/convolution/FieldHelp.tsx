import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui';
import { cn } from '../../../lib/utils';

interface FieldHelpProps {
  label: string;
  children: ReactNode;
}

export function FieldHelp({ label, children }: FieldHelpProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-sm',
            'text-dsp-text-muted hover:text-dsp-text transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40',
          )}
          aria-label={`${label} help`}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
