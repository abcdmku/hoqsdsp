import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoudnessEditor } from './LoudnessEditor';
import type { LoudnessFilter } from '../../types';

const defaultLoudnessFilter: LoudnessFilter = {
  type: 'Loudness',
  parameters: {
    reference_level: -25,
    high_boost: 5,
    low_boost: 10,
  },
};

describe('LoudnessEditor', () => {
  it('renders with correct title', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Loudness')).toBeInTheDocument();
  });

  it('shows loudness curve visualization', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: /loudness compensation/i })).toBeInTheDocument();
  });

  it('shows reference level control', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Reference Level')).toBeInTheDocument();
  });

  it('shows low frequency boost control', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Low Frequency Boost')).toBeInTheDocument();
  });

  it('shows high frequency boost control', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('High Frequency Boost')).toBeInTheDocument();
  });

  it('displays reference level value', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('-25 dB')).toBeInTheDocument();
  });

  it('displays boost values', () => {
    render(
      <LoudnessEditor
        open={true}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('+10 dB')).toBeInTheDocument(); // low boost
    expect(screen.getByText('+5 dB')).toBeInTheDocument(); // high boost
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <LoudnessEditor
        open={true}
        onClose={handleClose}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <LoudnessEditor
        open={false}
        onClose={() => {}}
        filter={defaultLoudnessFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
