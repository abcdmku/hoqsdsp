import { X } from 'lucide-react';
import type { ChannelNode } from '../../../lib/signalflow';
import { Button } from '../../ui/Button';

interface ChannelEditorHeaderProps {
  node: ChannelNode;
  onClose: () => void;
}

export function ChannelEditorHeader({ node, onClose }: ChannelEditorHeaderProps) {
  return (
    <div className="border-b border-dsp-primary/20 px-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-dsp-text">{node.label} Processing</h2>
          <div className="mt-1 text-xs text-dsp-text-muted">
            {node.side === 'input' ? 'Input channel' : 'Output channel'} - Device {node.deviceId}
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <span className="sr-only">Close</span>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
