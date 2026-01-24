import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvolutionEditor } from './ConvolutionEditor';
import type { ConvolutionFilter } from '../../types';

const wavConvolutionFilter: ConvolutionFilter = {
  type: 'Conv',
  parameters: {
    type: 'Wav',
    filename: '/path/to/impulse.wav',
    channel: 0,
  },
};

const valuesConvolutionFilter: ConvolutionFilter = {
  type: 'Conv',
  parameters: {
    type: 'Values',
    values: [1.0, 0.5, 0.25],
  },
};

describe('ConvolutionEditor', () => {
  it('renders with correct title', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Convolution Filter')).toBeInTheDocument();
  });

  it('shows source type selector', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Source Type')).toBeInTheDocument();
  });

  it('shows filename input for WAV type', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Filename')).toBeInTheDocument();
  });

  it('shows channel input for WAV type', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Channel')).toBeInTheDocument();
  });

  it('shows coefficients textarea for Values type', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={valuesConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Filter Coefficients')).toBeInTheDocument();
  });

  it('displays coefficient count for Values type', () => {
    render(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={valuesConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/3 coefficients entered/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ConvolutionEditor
        open={true}
        onClose={handleClose}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <ConvolutionEditor
        open={false}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
