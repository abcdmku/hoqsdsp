import { useCallback } from 'react';
import type { SignalFlowClipboardPayload } from '../../../stores/signalFlowUiStore';
import { parseSignalFlowClipboard, serializeSignalFlowClipboard } from '../../../lib/signalflow/uiClipboard';
import { showToast } from '../../../components/feedback';

export function useSignalFlowClipboard(
  clipboard: SignalFlowClipboardPayload | null,
  setClipboard: (payload: SignalFlowClipboardPayload | null) => void,
) {
  const copyClipboard = useCallback(
    async (payload: SignalFlowClipboardPayload) => {
      setClipboard(payload);
      const text = serializeSignalFlowClipboard(payload);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
        showToast.success('Copied');
      } catch (error) {
        showToast.warning('Copied (internal)', error instanceof Error ? error.message : String(error));
      }
    },
    [setClipboard],
  );

  const readClipboard = useCallback(async (): Promise<SignalFlowClipboardPayload | null> => {
    try {
      if (!navigator.clipboard?.readText) return clipboard;
      const text = await navigator.clipboard.readText();
      const parsed = parseSignalFlowClipboard(text);
      if (parsed) {
        setClipboard(parsed);
        return parsed;
      }
    } catch {
      return clipboard;
    }

    return clipboard;
  }, [clipboard, setClipboard]);

  return { clipboard, copyClipboard, readClipboard };
}
