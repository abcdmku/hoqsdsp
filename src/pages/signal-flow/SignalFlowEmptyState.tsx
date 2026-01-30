import { Share2 } from 'lucide-react';

interface SignalFlowEmptyStateProps {
  title: string;
  description: string;
}

export function SignalFlowEmptyState({ title, description }: SignalFlowEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mb-4 rounded-full bg-dsp-primary/30 p-4">
        <Share2 className="h-8 w-8 text-dsp-text-muted" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-dsp-text">{title}</h3>
      <p className="text-center text-sm text-dsp-text-muted">{description}</p>
    </div>
  );
}

interface SignalFlowStatusMessageProps {
  message: string;
  tone?: 'muted' | 'error';
}

export function SignalFlowStatusMessage({ message, tone = 'muted' }: SignalFlowStatusMessageProps) {
  const textClass = tone === 'error' ? 'text-red-400' : 'text-dsp-text-muted';
  return (
    <div className={`flex h-full items-center justify-center p-6 text-sm ${textClass}`}>
      {message}
    </div>
  );
}
