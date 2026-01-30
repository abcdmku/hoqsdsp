import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { CamillaConfig, SignalFlowUiMetadata } from '../../../types';
import type { FromConfigResult, RouteEdge, ChannelNode } from '../../../lib/signalflow';
import { toConfig } from '../../../lib/signalflow';
import { validateConfig } from '../../../lib/config';
import { showToast } from '../../../components/feedback';
import type { SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';
import type { FirPhaseCorrectionUiSettingsV1 } from '../../../types';

interface ConfigMutation {
  mutateAsync: (config: CamillaConfig) => Promise<unknown>;
  invalidate: () => void;
}

interface UiMetadataState {
  channelColors: Record<string, string>;
  channelNames: Record<string, string>;
  mirrorGroups: SignalFlowMirrorGroups;
  firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>;
}

interface CommitParams {
  configRef: MutableRefObject<CamillaConfig | null>;
  flowRef: MutableRefObject<FromConfigResult | null>;
  pendingChangesRef: MutableRefObject<boolean>;
  routes: RouteEdge[];
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  uiMetadata: UiMetadataState;
  setConfigJson: ConfigMutation;
}

function buildNextUiMetadata(
  current: UiMetadataState,
  updates?: Partial<SignalFlowUiMetadata>,
): SignalFlowUiMetadata {
  return {
    channelColors: updates?.channelColors ?? current.channelColors,
    channelNames: updates?.channelNames ?? current.channelNames,
    mirrorGroups: updates?.mirrorGroups ?? current.mirrorGroups,
    firPhaseCorrection: updates?.firPhaseCorrection ?? current.firPhaseCorrection,
  };
}

export function useSignalFlowCommit({
  configRef,
  flowRef,
  pendingChangesRef,
  routes,
  inputs,
  outputs,
  uiMetadata,
  setConfigJson,
}: CommitParams) {
  const sendTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (sendTimeoutRef.current !== null) {
      window.clearTimeout(sendTimeoutRef.current);
    }
  }, []);

  // Intentionally long to keep mutation flow and error handling in one place.
  const commitModel = useCallback(
    (
      next: {
        routes?: RouteEdge[];
        inputs?: ChannelNode[];
        outputs?: ChannelNode[];
        uiMetadata?: Partial<SignalFlowUiMetadata>;
      },
      options?: { debounce?: boolean },
    ) => {
      const currentConfig = configRef.current;
      const currentFlow = flowRef.current;
      if (!currentConfig || !currentFlow) {
        showToast.error('Cannot save', 'Connection lost or config not loaded');
        return;
      }

      const nextRoutes = next.routes ?? routes;
      const nextInputs = next.inputs ?? inputs;
      const nextOutputs = next.outputs ?? outputs;
      const nextUiMetadata = buildNextUiMetadata(uiMetadata, next.uiMetadata);
      pendingChangesRef.current = true;

      const send = async () => {
        const patched = toConfig(
          currentConfig,
          {
            inputGroups: currentFlow.model.inputGroups,
            outputGroups: currentFlow.model.outputGroups,
            inputs: nextInputs,
            outputs: nextOutputs,
            routes: nextRoutes,
          },
          nextUiMetadata,
        );
        const validation = validateConfig(patched.config);
        if (!validation.valid || !validation.config) {
          pendingChangesRef.current = false;
          showToast.error('Invalid config', validation.errors[0]?.message);
          return;
        }

        try {
          await setConfigJson.mutateAsync(validation.config);
          pendingChangesRef.current = false;
          setConfigJson.invalidate();
        } catch (error) {
          pendingChangesRef.current = false;
          showToast.error(
            'Failed to send config',
            error instanceof Error ? error.message : String(error),
          );
        }
      };

      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }

      if (options?.debounce) {
        sendTimeoutRef.current = window.setTimeout(() => {
          sendTimeoutRef.current = null;
          void send();
        }, 150);
        return;
      }

      void send();
    },
    [configRef, flowRef, inputs, outputs, pendingChangesRef, routes, setConfigJson, uiMetadata],
  );

  return { commitModel };
}
