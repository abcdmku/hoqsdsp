import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { GainFilter } from '../../types';
import { FilterEditorPanel, useFilterEditor } from './FilterEditorModal';

function AutoApplyHarness() {
  const { filter, updateFilter } = useFilterEditor<GainFilter>();
  const gain = filter.parameters.gain;

  return (
    <button
      type="button"
      onClick={() => {
        updateFilter({
          ...filter,
          parameters: { ...filter.parameters, gain: gain + 1 },
        });
      }}
    >
      Inc
    </button>
  );
}

function GainReadout() {
  const { filter } = useFilterEditor<GainFilter>();
  return <div>Gain={filter.parameters.gain}</div>;
}

describe('FilterEditorPanel autoApply', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces and calls onApply after edits', async () => {
    vi.useFakeTimers();

    const onApply = vi.fn();
    const onSave = vi.fn();

    render(
      <FilterEditorPanel
        onClose={() => {}}
        filter={{ type: 'Gain', parameters: { gain: 0 } }}
        onSave={onSave}
        onApply={onApply}
        validate={() => ({ success: true })}
        autoApply={true}
        autoApplyDebounceMs={50}
      >
        <AutoApplyHarness />
      </FilterEditorPanel>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Inc' }));

    expect(onApply).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ type: 'Gain', parameters: { gain: 1 } });
  });

  it('does not reset local edits when filter prop refreshes while dirty', async () => {
    const onApply = vi.fn();
    const onSave = vi.fn();

    const { rerender } = render(
      <FilterEditorPanel
        onClose={() => {}}
        filter={{ type: 'Gain', parameters: { gain: 0 } }}
        onSave={onSave}
        onApply={onApply}
        validate={() => ({ success: true })}
      >
        <AutoApplyHarness />
        <GainReadout />
      </FilterEditorPanel>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Inc' }));
    expect(screen.getByText('Gain=1')).toBeInTheDocument();

    // Simulate an upstream "refresh" that re-passes the original filter object.
    // Previously this would clobber local edits and flash/reset the UI.
    await act(async () => {
      rerender(
        <FilterEditorPanel
          onClose={() => {}}
          filter={{ type: 'Gain', parameters: { gain: 0 } }}
          onSave={onSave}
          onApply={onApply}
          validate={() => ({ success: true })}
        >
          <AutoApplyHarness />
          <GainReadout />
        </FilterEditorPanel>,
      );
    });

    expect(screen.getByText('Gain=1')).toBeInTheDocument();
  });
});
