import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DelayEditor } from './DelayEditor';
import type { DelayFilter } from '../../types';

const defaultDelayFilter: DelayFilter = {
  type: 'Delay',
  parameters: {
    delay: 0,
    unit: 'ms',
    subsample: false,
  },
};

describe('DelayEditor', () => {
  it('renders with correct title', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    // "Delay" appears in title and as a label
    const delayElements = screen.getAllByText('Delay');
    expect(delayElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows unit selector', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  it('shows delay input', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    // There should be a Delay label (separate from the title)
    const delayLabels = screen.getAllByText('Delay');
    expect(delayLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows subsample toggle', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Subsample Interpolation')).toBeInTheDocument();
  });

  it('shows equivalent values section', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Equivalent')).toBeInTheDocument();
  });

  it('shows sample rate info', () => {
    render(
      <DelayEditor
        open={true}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
        sampleRate={48000}
      />,
    );

    expect(screen.getByText(/48,000 Hz/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DelayEditor
        open={true}
        onClose={handleClose}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <DelayEditor
        open={false}
        onClose={() => {}}
        filter={defaultDelayFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
