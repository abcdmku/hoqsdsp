import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvolutionEditor } from './ConvolutionEditor';
import type { ConvolutionFilter } from '../../types';
import { TooltipProvider } from '../ui';

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

const identityConvolutionFilter: ConvolutionFilter = {
  type: 'Conv',
  parameters: {
    type: 'Values',
    values: [1.0],
  },
};

function renderWithTooltips(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('ConvolutionEditor', () => {
  it('renders with correct title', () => {
    renderWithTooltips(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={wavConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'FIR Phase Correction' })).toBeInTheDocument();
  });

  it('shows graph tabs', () => {
    renderWithTooltips(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={valuesConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Mag' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Phase' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Delay' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Impulse' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Phase' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renames settings heading and removes preview toggle', () => {
    renderWithTooltips(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={identityConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('FIR Settings')).toBeInTheDocument();
    expect(screen.queryByText('Design Settings')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/show preview/i)).not.toBeInTheDocument();
  });

  it('displays tap count in stats bar for Values type', () => {
    renderWithTooltips(
      <ConvolutionEditor
        open={true}
        onClose={() => {}}
        filter={valuesConvolutionFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('taps')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderWithTooltips(
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
    renderWithTooltips(
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
