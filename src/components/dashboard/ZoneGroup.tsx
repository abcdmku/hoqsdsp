import * as React from 'react';
import { ChevronDown, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';

export interface ZoneGroupProps {
  /** Zone name */
  name: string;
  /** Number of units in this zone */
  unitCount: number;
  /** Number of online units */
  onlineCount: number;
  /** Whether the group is collapsed */
  collapsed?: boolean;
  /** Callback when collapse toggle is clicked */
  onToggleCollapse?: () => void;
  /** Callback when mute all is clicked */
  onMuteAll?: () => void;
  /** Whether all units in zone are muted */
  allMuted?: boolean;
  /** Child unit cards */
  children: React.ReactNode;
  className?: string;
}

/**
 * Collapsible group container for organizing units by zone.
 */
export function ZoneGroup({
  name,
  unitCount,
  onlineCount,
  collapsed = false,
  onToggleCollapse,
  onMuteAll,
  allMuted = false,
  children,
  className,
}: ZoneGroupProps) {
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <div className={cn('mb-4', className)}>
      {/* Zone header */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-dsp-text hover:bg-dsp-primary/30"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
        >
          <CollapseIcon className="h-4 w-4" />
          <span>{name}</span>
        </button>

        <span className="text-xs text-dsp-text-muted">
          {onlineCount}/{unitCount} online
        </span>

        {onMuteAll && (
          <Tooltip>
            <TooltipTrigger
              className="ml-auto inline-flex items-center justify-center h-7 px-2 rounded-md hover:bg-dsp-primary/50"
              onClick={onMuteAll}
              aria-label={allMuted ? 'Unmute all in zone' : 'Mute all in zone'}
            >
              {allMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-meter-red" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {allMuted ? 'Unmute all in zone' : 'Mute all in zone'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Zone content */}
      {!collapsed && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {children}
        </div>
      )}
    </div>
  );
}

export interface UngroupedSectionProps {
  /** Child unit cards */
  children: React.ReactNode;
  className?: string;
}

/**
 * Section for units without a zone assignment.
 */
export function UngroupedSection({
  children,
  className,
}: UngroupedSectionProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div className="mb-2">
        <span className="text-sm font-medium text-dsp-text-muted">
          Ungrouped Units
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
