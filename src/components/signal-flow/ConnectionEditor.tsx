import { Trash2 } from 'lucide-react';
import type { RouteEdge } from '../../lib/signalflow';
import { cn } from '../../lib/utils';
import { GainInput } from '../ui/GainInput';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';

export interface ConnectionEditorProps {
  route: RouteEdge;
  fromLabel: string;
  toLabel: string;
  onChange: (updates: Partial<RouteEdge>, options?: { debounce?: boolean }) => void;
  onDelete: () => void;
  className?: string;
}

export function ConnectionEditor({
  route,
  fromLabel,
  toLabel,
  onChange,
  onDelete,
  className,
}: ConnectionEditorProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dsp-primary/30 bg-dsp-surface/95 p-4 shadow-lg backdrop-blur',
        className,
      )}
      aria-label="Connection editor"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-dsp-text">Connection</div>
          <div className="mt-1 text-xs text-dsp-text-muted">
            {fromLabel} → {toLabel}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete connection"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-dsp-text-muted">
            Gain
          </div>
          <GainInput
            value={route.gain}
            onChange={(value) => {
              onChange({ gain: value }, { debounce: true });
            }}
            min={-60}
            max={24}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-dsp-text">Invert</div>
            <div className="text-xs text-dsp-text-muted">Flip polarity</div>
          </div>
          <Switch
            checked={route.inverted}
            onCheckedChange={(checked) => {
              onChange({ inverted: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-dsp-text">Mute</div>
            <div className="text-xs text-dsp-text-muted">Silence this route</div>
          </div>
          <Switch
            checked={route.mute}
            onCheckedChange={(checked) => {
              onChange({ mute: checked });
            }}
          />
        </div>
      </div>
    </div>
  );
}

