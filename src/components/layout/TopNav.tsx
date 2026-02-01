import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings, Wifi, WifiOff, Upload, Download, AudioWaveform, HelpCircle } from 'lucide-react';
import { useUIStore, useConnectionStore, selectActiveConnection, useUnitStore, selectUnits } from '../../stores';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ConfigImportDialog } from '../config/ConfigImportDialog';
import { ConfigExportDialog } from '../config/ConfigExportDialog';
import type { CamillaConfig } from '../../types';

export interface TopNavProps {
  currentConfig?: CamillaConfig | null;
  onConfigImport?: (config: CamillaConfig) => void;
}

const NO_UNIT_VALUE = '__none__';

export function TopNav({ currentConfig, onConfigImport }: TopNavProps) {
  const navigate = useNavigate();

  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  const units = useUnitStore(selectUnits);
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const setActiveUnit = useConnectionStore((state) => state.setActiveUnit);
  const activeConnection = useConnectionStore(selectActiveConnection);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const isConnected = activeConnection?.status === 'connected';
  const connectionStatus = activeConnection?.status ?? 'disconnected';

  const activeUnitName = useMemo(() => {
    if (!activeUnitId) return null;
    return units.find((u) => u.id === activeUnitId)?.name ?? null;
  }, [activeUnitId, units]);

  const handleImport = (config: CamillaConfig) => {
    onConfigImport?.(config);
  };

  return (
    <header
      className={cn(
        'h-14 flex items-center gap-3 px-4',
        'bg-dsp-surface/90 supports-[backdrop-filter]:bg-dsp-surface/70 backdrop-blur',
        'border-b border-dsp-primary/50'
      )}
      role="banner"
    >
      <Tooltip>
        <TooltipTrigger
          onClick={toggleSidebar}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
            'hover:bg-dsp-primary/60'
          )}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md',
            'bg-dsp-bg/40 border border-dsp-primary/40'
          )}
          aria-hidden="true"
        >
          <AudioWaveform className="h-5 w-5 text-dsp-accent" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold text-dsp-text">HOQ DSP Console</h1>
          <p className="text-xs text-dsp-text-muted">
            {activeUnitName ? `Active: ${activeUnitName}` : 'No unit selected'}
          </p>
        </div>
      </div>

      <Tooltip>
          <TooltipTrigger
          onClick={() => { void navigate('/help'); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-dsp-primary/60 transition-colors"
          aria-label="Help & Troubleshooting"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Help & Troubleshooting</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2">
        <span className="text-xs font-medium text-dsp-text-muted">Unit</span>
        <Select
          value={activeUnitId ?? NO_UNIT_VALUE}
          onValueChange={(value) => {
            setActiveUnit(value === NO_UNIT_VALUE ? null : value);
          }}
        >
          <SelectTrigger className="h-9 w-[240px] border-dsp-primary/50 bg-dsp-bg/40 hover:border-dsp-primary/70">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_UNIT_VALUE}>No unit selected</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-px h-6 bg-dsp-primary/50" aria-hidden="true" />

      <div
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
        role="status"
        aria-live="polite"
        aria-label={`Connection status: ${connectionStatus}`}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-status-online' : 'bg-status-offline'
          )}
          aria-hidden="true"
        />
        {isConnected ? (
          <Wifi className="h-4 w-4 text-status-online" aria-hidden="true" />
        ) : (
          <WifiOff className="h-4 w-4 text-status-offline" aria-hidden="true" />
        )}
        <span className={cn('font-medium', isConnected ? 'text-status-online' : 'text-dsp-text-muted')}>
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
      </div>

      <div className="w-px h-6 bg-dsp-primary/50" aria-hidden="true" />

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            onClick={() => { setImportDialogOpen(true); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-dsp-primary/60 transition-colors"
            aria-label="Import configuration"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Import configuration</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => { setExportDialogOpen(true); }}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
              currentConfig ? 'hover:bg-dsp-primary/60' : 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Export configuration"
            disabled={!currentConfig}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>
            {currentConfig ? 'Export configuration' : 'No configuration to export'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => { void navigate('/settings'); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-dsp-primary/60 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>

      <ConfigImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        currentConfig={currentConfig}
      />

      <ConfigExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        config={currentConfig ?? null}
        defaultFilename={currentConfig?.title ?? 'camilladsp-config'}
      />
    </header>
  );
}
