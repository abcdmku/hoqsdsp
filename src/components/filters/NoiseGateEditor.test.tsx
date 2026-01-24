import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoiseGateEditor } from './NoiseGateEditor';
import type { NoiseGateFilter } from '../../types';

const defaultNoiseGateFilter: NoiseGateFilter = {
  type: 'NoiseGate',
  parameters: {
    channels: 2,
    threshold: -60,
    attack: 5,
    release: 100,
    hold: 50,
  },
};

describe('NoiseGateEditor', () => {
  it('renders with correct title', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Noise Gate')).toBeInTheDocument();
  });

  it('shows gate timing diagram', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: /gate timing diagram/i })).toBeInTheDocument();
  });

  it('shows channels input', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Channels')).toBeInTheDocument();
  });

  it('shows threshold control', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Threshold')).toBeInTheDocument();
  });

  it('shows attack, hold, and release controls', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    // Labels may appear multiple times (in diagram labels and controls)
    // Using getAllByText to verify they exist
    expect(screen.getAllByText('Attack').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hold').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Release').length).toBeGreaterThanOrEqual(1);
  });

  it('displays threshold value', () => {
    render(
      <NoiseGateEditor
        open={true}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/Threshold: -60 dB/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <NoiseGateEditor
        open={true}
        onClose={handleClose}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <NoiseGateEditor
        open={false}
        onClose={() => {}}
        filter={defaultNoiseGateFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
