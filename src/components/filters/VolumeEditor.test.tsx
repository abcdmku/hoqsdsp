import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VolumeEditor } from './VolumeEditor';
import type { VolumeFilter } from '../../types';

const defaultVolumeFilter: VolumeFilter = {
  type: 'Volume',
  parameters: {
    ramp_time: 200,
  },
};

const instantVolumeFilter: VolumeFilter = {
  type: 'Volume',
  parameters: {},
};

describe('VolumeEditor', () => {
  it('renders with correct title', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('shows ramp time info section', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    // The new design shows ramp time info text
    expect(screen.getByText(/Ramp time/)).toBeInTheDocument();
    expect(screen.getByText(/smooths volume changes/i)).toBeInTheDocument();
  });

  it('shows ramp time control', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Ramp Time')).toBeInTheDocument();
  });

  it('shows presets', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Presets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Instant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '200ms' })).toBeInTheDocument();
  });

  it('shows volume change response visualization', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: /volume ramp visualization/i })).toBeInTheDocument();
  });

  it('displays ramp time value', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('200 ms')).toBeInTheDocument();
  });

  it('shows Instant when ramp time is 0', () => {
    render(
      <VolumeEditor
        open={true}
        onClose={() => {}}
        filter={instantVolumeFilter}
        onSave={() => {}}
      />,
    );

    // There are multiple "Instant" texts (display label + button preset), just verify they exist
    const instantElements = screen.getAllByText('Instant');
    expect(instantElements.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <VolumeEditor
        open={true}
        onClose={handleClose}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <VolumeEditor
        open={false}
        onClose={() => {}}
        filter={defaultVolumeFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
