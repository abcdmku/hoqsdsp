import { useState } from 'react';
import { Menu, Settings, Wifi, WifiOff, Upload, Download } from 'lucide-react';
import { useUIStore } from '../../stores';
import { useConnectionStore, selectActiveConnection } from '../../stores';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { ConfigImportDialog } from '../config/ConfigImportDialog';
import { ConfigExportDialog } from '../config/ConfigExportDialog';
import type { CamillaConfig } from '../../types';

export interface TopNavProps {
  /** Current configuration for export */
  currentConfig?: CamillaConfig | null;
  /** Callback when a configuration is imported */
  onConfigImport?: (config: CamillaConfig) => void;
}

export function TopNav({ currentConfig, onConfigImport }: TopNavProps) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const activeConnection = useConnectionStore(selectActiveConnection);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const isConnected = activeConnection?.status === 'connected';
  const connectionStatus = activeConnection?.status ?? 'disconnected';

  const handleImport = (config: CamillaConfig) => {
    onConfigImport?.(config);
  };

  return (
    <header
      className="h-14 bg-dsp-surface border-b border-dsp-primary/30 flex items-center px-4 gap-4"
      role="banner"
    >
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-dsp-primary/50 rounded-md transition-colors"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <h1 className="text-lg font-semibold text-dsp-text">CamillaDSP</h1>

        <div className="flex-1" />

        {/* Import/Export buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              onClick={() => { setImportDialogOpen(true); }}
              className="p-2 hover:bg-dsp-primary/50 rounded-md transition-colors"
              aria-label="Import configuration"
            >
              <Upload className="w-5 h-5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Import configuration</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => { setExportDialogOpen(true); }}
              className={cn(
                "p-2 rounded-md transition-colors",
                currentConfig
                  ? "hover:bg-dsp-primary/50"
                  : "opacity-50 cursor-not-allowed"
              )}
              aria-label="Export configuration"
              disabled={!currentConfig}
            >
              <Download className="w-5 h-5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>
              {currentConfig ? 'Export configuration' : 'No configuration to export'}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-dsp-primary/30" aria-hidden="true" />

        <div
          className="flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-label={`Connection status: ${connectionStatus}`}
        >
          {isConnected ? (
            <Wifi className="w-5 h-5 text-status-online" aria-hidden="true" />
          ) : (
            <WifiOff className="w-5 h-5 text-status-offline" aria-hidden="true" />
          )}
          <span className={cn(
            "text-sm",
            isConnected ? "text-status-online" : "text-status-offline"
          )}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>

        <button
          className="p-2 hover:bg-dsp-primary/50 rounded-md transition-colors"
          aria-label="Open settings"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Import Dialog */}
        <ConfigImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImport}
          currentConfig={currentConfig}
        />

        {/* Export Dialog */}
        <ConfigExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          config={currentConfig ?? null}
          defaultFilename={currentConfig?.title ?? 'camilladsp-config'}
        />
      </header>
  );
}
