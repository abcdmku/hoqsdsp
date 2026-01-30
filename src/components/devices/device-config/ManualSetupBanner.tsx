import { Cog } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ManualSetupBannerProps {
  onBack: () => void;
}

export function ManualSetupBanner({ onBack }: ManualSetupBannerProps) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-dsp-accent/30 bg-dsp-accent/10 p-3 text-sm text-dsp-text">
      <div className="flex items-center gap-2">
        <Cog className="h-4 w-4 text-dsp-accent" />
        <span>Manual Setup - Configure all device settings below.</span>
      </div>
      <Button onClick={onBack} variant="ghost" size="sm">
        Back
      </Button>
    </div>
  );
}
