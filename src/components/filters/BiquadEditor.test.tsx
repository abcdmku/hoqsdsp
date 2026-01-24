import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiquadEditor } from './BiquadEditor';
import type { BiquadFilter } from '../../types';

const defaultPeakingFilter: BiquadFilter = {
  type: 'Biquad',
  parameters: {
    type: 'Peaking',
    freq: 1000,
    gain: 0,
    q: 1.0,
  },
};

const lowpassFilter: BiquadFilter = {
  type: 'Biquad',
  parameters: {
    type: 'Lowpass',
    freq: 2000,
    q: 0.707,
  },
};

describe('BiquadEditor', () => {
  it('renders with correct title', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Biquad Filter')).toBeInTheDocument();
  });

  it('displays filter type selector', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Filter Type')).toBeInTheDocument();
  });

  it('shows frequency input for filters with frequency', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Frequency')).toBeInTheDocument();
  });

  it('shows Q factor input for peaking filter', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Q Factor')).toBeInTheDocument();
  });

  it('shows gain input for peaking filter', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Gain')).toBeInTheDocument();
  });

  it('shows Q factor for lowpass filter', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={lowpassFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Q Factor')).toBeInTheDocument();
  });

  it('does not show gain for lowpass filter', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={lowpassFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByText('Gain')).not.toBeInTheDocument();
  });

  it('shows frequency response graph', () => {
    render(
      <BiquadEditor
        open={true}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: /frequency response graph/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <BiquadEditor
        open={true}
        onClose={handleClose}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <BiquadEditor
        open={false}
        onClose={() => {}}
        filter={defaultPeakingFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByText('Biquad Filter')).not.toBeInTheDocument();
  });
});
