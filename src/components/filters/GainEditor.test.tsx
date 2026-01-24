import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GainEditor } from './GainEditor';
import type { GainFilter } from '../../types';

const defaultGainFilter: GainFilter = {
  type: 'Gain',
  parameters: {
    gain: 0,
    scale: 'dB',
    inverted: false,
  },
};

const linearGainFilter: GainFilter = {
  type: 'Gain',
  parameters: {
    gain: 1.0,
    scale: 'linear',
    inverted: false,
  },
};

describe('GainEditor', () => {
  it('renders with correct title', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    // "Gain" appears multiple times (title, label)
    const gainElements = screen.getAllByText('Gain');
    expect(gainElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows scale selector', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Scale')).toBeInTheDocument();
  });

  it('shows invert phase toggle', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Invert Phase')).toBeInTheDocument();
  });

  it('shows equivalent values section', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Equivalent')).toBeInTheDocument();
  });

  it('shows linear equivalent when in dB mode', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/Linear:/)).toBeInTheDocument();
  });

  it('shows dB equivalent when in linear mode', () => {
    render(
      <GainEditor
        open={true}
        onClose={() => {}}
        filter={linearGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/dB:/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <GainEditor
        open={true}
        onClose={handleClose}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <GainEditor
        open={false}
        onClose={() => {}}
        filter={defaultGainFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
