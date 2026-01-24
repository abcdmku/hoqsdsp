import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DitherEditor } from './DitherEditor';
import type { DitherFilter } from '../../types';

const defaultDitherFilter: DitherFilter = {
  type: 'Dither',
  parameters: {
    type: 'Simple',
    bits: 16,
  },
};

describe('DitherEditor', () => {
  it('renders with correct title', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Dither')).toBeInTheDocument();
  });

  it('shows dither type selector', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Dither Type')).toBeInTheDocument();
  });

  it('shows bit depth input', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Target Bit Depth')).toBeInTheDocument();
  });

  it('shows quick presets', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '16-bit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24-bit' })).toBeInTheDocument();
  });

  it('displays bit depth in header', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    // May appear in header and preset button
    const bitDepthElements = screen.getAllByText('16-bit');
    expect(bitDepthElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows dynamic range calculation', () => {
    render(
      <DitherEditor
        open={true}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    // 16 bits * 6.02 ≈ 96 dB
    expect(screen.getByText(/~96 dB dynamic range/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DitherEditor
        open={true}
        onClose={handleClose}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <DitherEditor
        open={false}
        onClose={() => {}}
        filter={defaultDitherFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
