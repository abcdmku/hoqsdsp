import { Plus, RefreshCw, VolumeX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/Tooltip';

interface DashboardHeaderActionsProps {
  onRefreshAll: () => void;
  onMuteAll: () => void;
  onAddUnit: () => void;
}

export function DashboardHeaderActions({ onRefreshAll, onMuteAll, onAddUnit }: DashboardHeaderActionsProps) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent transition-colors hover:border-dsp-primary/60 hover:bg-dsp-primary/35"
          onClick={onRefreshAll}
          aria-label="Reconnect all units"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Reconnect all</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent transition-colors hover:border-dsp-primary/60 hover:bg-dsp-primary/35"
          onClick={onMuteAll}
          aria-label="Mute all units"
        >
          <VolumeX className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Mute all</TooltipContent>
      </Tooltip>

      <Button onClick={onAddUnit}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add Unit
      </Button>
    </>
  );
}
