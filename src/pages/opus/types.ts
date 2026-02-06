import type { useSignalFlowPageState } from '../signal-flow/hooks/useSignalFlowPageState';

export type SignalFlowState = ReturnType<typeof useSignalFlowPageState>;

export interface OpusDesignProps {
  state: SignalFlowState;
}
