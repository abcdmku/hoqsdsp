import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fromConfig, processingSummaryFromFilters } from '../../../lib/signalflow';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';
import type { CamillaConfig, DeqBandUiSettingsV1 } from '../../../types';
import { useSignalFlowCommit } from './useSignalFlowCommit';

vi.mock('../../../components/feedback', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
    action: vi.fn(),
  },
}));

function createTestConfig(): CamillaConfig {
  return {
    devices: {
      samplerate: 48000,
      chunksize: 1024,
      capture: { type: 'Alsa', channels: 1, device: 'hw:0' },
      playback: { type: 'Alsa', channels: 1, device: 'hw:0' },
    },
    mixers: {
      routing: {
        channels: { in: 1, out: 1 },
        mapping: [],
      },
    },
    pipeline: [{ type: 'Mixer', name: 'routing' }],
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useSignalFlowCommit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('merges debounced commits (filters + DEQ metadata) into a single config send', async () => {
    const config = createTestConfig();
    const flow = fromConfig(config);

    const filterName = 'sf-input-ch1-deq-test';

    const oldFilter: ChannelProcessingFilter = {
      name: filterName,
      config: { type: 'DiffEq', parameters: { a: [1], b: [1] } },
    };

    const newFilter: ChannelProcessingFilter = {
      name: filterName,
      config: { type: 'DiffEq', parameters: { a: [1, -0.1, 0.2], b: [0.3, 0.4, 0.5] } },
    };

    const inputs = flow.model.inputs.map((node, idx) => {
      if (idx !== 0) return node;
      return {
        ...node,
        processing: { filters: [oldFilter] },
        processingSummary: processingSummaryFromFilters([oldFilter]),
      };
    });

    const updatedInputs = flow.model.inputs.map((node, idx) => {
      if (idx !== 0) return node;
      return {
        ...node,
        processing: { filters: [newFilter] },
        processingSummary: processingSummaryFromFilters([newFilter]),
      };
    });

    const mutateAsync = vi.fn(async (_next: CamillaConfig) => {});
    const invalidate = vi.fn();

    const configRef = { current: config };
    const flowRef = { current: flow };
    const pendingChangesRef = { current: false };

    const uiMetadata = {
      channelColors: {},
      channelNames: {},
      mirrorGroups: { input: [], output: [] },
      firPhaseCorrection: {},
      deq: {},
    };

    const { result } = renderHook(() =>
      useSignalFlowCommit({
        configRef,
        flowRef,
        pendingChangesRef,
        routes: [],
        inputs,
        outputs: flow.model.outputs,
        uiMetadata,
        setConfigJson: { mutateAsync, invalidate },
      }),
    );

    const deqSettings: DeqBandUiSettingsV1 = {
      version: 1,
      enabled: true,
      biquad: { type: 'Peaking', freq: 1000, gain: 2, q: 1.0 },
    };

    act(() => {
      result.current.commitModel({ inputs: updatedInputs }, { debounce: true });
      result.current.commitModel({ uiMetadata: { deq: { [filterName]: deqSettings } } }, { debounce: true });
      vi.advanceTimersByTime(200);
    });

    await flushAsyncWork();

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const sent = mutateAsync.mock.calls[0]?.[0] as CamillaConfig;
    expect(sent.filters?.[filterName]).toEqual(newFilter.config);
    expect(sent.ui?.signalFlow?.deq?.[filterName]).toEqual(deqSettings);
  });
});
