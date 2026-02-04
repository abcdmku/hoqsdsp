import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFirSelection } from './useFirSelection';
import type { ChannelProcessingFilter } from '../../../lib/signalflow';

describe('useFirSelection', () => {
  it('finds PEQ/DEQ filters even when they appear after the FIR filter', () => {
    const channelFilters: ChannelProcessingFilter[] = [
      {
        name: 'sf-out-ch1-conv-1',
        config: { type: 'Conv', parameters: { type: 'Values', values: [1] } },
      },
      {
        name: 'sf-out-ch1-biquad-1',
        config: { type: 'Biquad', parameters: { type: 'Peaking', freq: 1000, gain: 3, q: 1 } },
      },
      {
        name: 'sf-out-ch1-deq-1',
        config: { type: 'DiffEq', parameters: { a: [1], b: [1] } },
      },
    ];

    const { result } = renderHook(() =>
      useFirSelection({
        channelFilters,
        filterName: 'sf-out-ch1-conv-1',
      }),
    );

    expect(result.current.correctableUi.map((f) => f.name)).toEqual([
      'sf-out-ch1-biquad-1',
      'sf-out-ch1-deq-1',
    ]);

    expect(result.current.pipelineFilterConfigs.map((c) => c.type)).toEqual([
      'Biquad',
      'DiffEq',
    ]);
  });
});

