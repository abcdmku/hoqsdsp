import { Plus, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface EmptyDashboardStateProps {
  onAddUnit: () => void;
}

export function EmptyDashboardState({ onAddUnit }: EmptyDashboardStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-dsp-primary/60 bg-dsp-surface/30 py-16">
      <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
        <Volume2 className="h-8 w-8 text-dsp-text-muted" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-dsp-text">No units configured</h3>
      <p className="mb-6 max-w-md text-center text-sm text-dsp-text-muted">
        Add your first DSP unit to start monitoring levels, performance, and routing.
      </p>
      <Button onClick={onAddUnit}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add Unit
      </Button>
    </div>
  );
}
