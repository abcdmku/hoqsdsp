import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { VolumeInlineControl } from './VolumeInlineControl';

describe('VolumeInlineControl', () => {
  it('always renders an editable input', () => {
    const onRampTimeChange = vi.fn();

    render(
      <VolumeInlineControl
        label="Out 1"
        rampEnabled={false}
        rampTimeMs={200}
        onRampTimeChange={onRampTimeChange}
      />,
    );

    const input = screen.getByLabelText(/Out 1 ramp time ms/i);
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRampTimeChange).toHaveBeenCalledTimes(1);
    expect(onRampTimeChange).toHaveBeenCalledWith(250, { debounce: true });
  });

  it('clicking RAMP turns ramp off and keeps current value', () => {
    const onToggleRamp = vi.fn();

    render(
      <VolumeInlineControl
        label="Out 1"
        rampEnabled
        rampTimeMs={275}
        onToggleRamp={onToggleRamp}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Out 1 ramp time$/i }));

    expect(onToggleRamp).toHaveBeenCalledTimes(1);
    expect(onToggleRamp).toHaveBeenCalledWith(false, 275, { debounce: true });
  });

  it('re-enables ramp with the last edited value', () => {
    const onToggleRamp = vi.fn();

    function Harness() {
      const [rampEnabled, setRampEnabled] = useState(false);
      const [rampTimeMs, setRampTimeMs] = useState(220);

      return (
        <VolumeInlineControl
          label="Out 1"
          rampEnabled={rampEnabled}
          rampTimeMs={rampTimeMs}
          onRampTimeChange={(next) => setRampTimeMs(next)}
          onToggleRamp={(enabled, nextRamp) => {
            setRampEnabled(enabled);
            onToggleRamp(enabled, nextRamp, { debounce: true });
          }}
        />
      );
    }

    render(<Harness />);

    const input = screen.getByLabelText(/Out 1 ramp time ms/i);
    fireEvent.change(input, { target: { value: '340' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: /^Out 1 ramp time$/i }));
    expect(onToggleRamp).toHaveBeenCalledWith(true, 340, { debounce: true });

    fireEvent.click(screen.getByRole('button', { name: /^Out 1 ramp time$/i }));
    expect(onToggleRamp).toHaveBeenCalledWith(false, 340, { debounce: true });
  });
});
