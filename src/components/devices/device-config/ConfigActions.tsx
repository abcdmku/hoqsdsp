import { AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ConfigActionsProps {
  isCreatingMode: boolean;
  canCreateConfig: boolean;
  isPending: boolean;
  isError: boolean;
  onCreate: () => void;
  onApply: () => void;
}

export function ConfigActions({
  isCreatingMode,
  canCreateConfig,
  isPending,
  isError,
  onCreate,
  onApply,
}: ConfigActionsProps) {
  return (
    <>
      {isError && (
        <div className="flex items-center gap-2 rounded border border-status-error/50 bg-status-error/10 p-3 text-sm text-status-error">
          <AlertCircle className="h-4 w-4" />
          Failed to {isCreatingMode ? 'create' : 'apply'} configuration. Please check your settings.
        </div>
      )}

      <div className="flex justify-end">
        {isCreatingMode ? (
          <Button onClick={onCreate} disabled={isPending || !canCreateConfig}>
            {isPending ? 'Creating...' : 'Create Configuration'}
          </Button>
        ) : (
          <Button onClick={onApply} disabled={isPending}>
            {isPending ? 'Applying...' : 'Apply'}
          </Button>
        )}
      </div>
    </>
  );
}
