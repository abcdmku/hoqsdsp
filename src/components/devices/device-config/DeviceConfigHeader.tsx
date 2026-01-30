import { Settings2, Zap } from 'lucide-react';
import { Button } from '../../ui/Button';

interface DeviceConfigHeaderProps {
  hasConfig: boolean;
  autoSetup: { isRunning: boolean; message?: string | null };
  onAutoSetupClick: () => void;
}

export function DeviceConfigHeader({ hasConfig, autoSetup, onAutoSetupClick }: DeviceConfigHeaderProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-dsp-text">
          <Settings2 className="h-5 w-5" />
          Audio Devices
        </h2>

        <Button
          variant={hasConfig ? 'outline' : 'default'}
          size="sm"
          disabled={autoSetup.isRunning}
          onClick={onAutoSetupClick}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          {autoSetup.isRunning ? 'Setting up...' : 'Auto Setup'}
        </Button>
      </div>

      {autoSetup.isRunning && autoSetup.message && (
        <div className="mb-4 rounded-lg border border-dsp-accent/30 bg-dsp-accent/10 p-3 text-sm text-dsp-text">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 animate-pulse text-dsp-accent" />
            <span>{autoSetup.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
