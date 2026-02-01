import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompressorEditor } from './CompressorEditor';
import type { CompressorFilter } from '../../types';

const defaultCompressorFilter: CompressorFilter = {
  type: 'Compressor',
  parameters: {
    threshold: -20,
    factor: 4,
    attack: 10,
    release: 100,
    makeup_gain: 0,
    soft_clip: false,
  },
};

describe('CompressorEditor', () => {
  it('renders with correct title', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Compressor')).toBeInTheDocument();
  });

  it('shows transfer curve visualization', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: /compression transfer curve/i })).toBeInTheDocument();
  });

  it('shows threshold control', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Threshold')).toBeInTheDocument();
  });

  it('shows ratio control', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Ratio')).toBeInTheDocument();
  });

  it('shows attack and release controls', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText('Release')).toBeInTheDocument();
  });

  it('shows makeup gain control', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Makeup Gain')).toBeInTheDocument();
  });

  it('shows soft clip toggle', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Soft Clip')).toBeInTheDocument();
  });

  it('displays ratio value', () => {
    render(
      <CompressorEditor
        open={true}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    // Ratio appears in multiple places (display + slider label)
    const ratioElements = screen.getAllByText('4:1');
    expect(ratioElements.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <CompressorEditor
        open={true}
        onClose={handleClose}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <CompressorEditor
        open={false}
        onClose={() => {}}
        filter={defaultCompressorFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
