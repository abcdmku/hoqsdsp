import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffEqEditor } from './DiffEqEditor';
import type { DiffEqFilter } from '../../types';

const defaultDiffEqFilter: DiffEqFilter = {
  type: 'DiffEq',
  parameters: {
    a: [1.0, -0.5],
    b: [0.5, 0.5],
  },
};

describe('DiffEqEditor', () => {
  it('renders with correct title', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Difference Equation')).toBeInTheDocument();
  });

  it('shows filter order', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Order: 1')).toBeInTheDocument();
  });

  it('shows coefficient counts', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/2 feedforward \/ 2 feedback coefficients/)).toBeInTheDocument();
  });

  it('shows B coefficients section', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('B Coefficients (Feedforward)')).toBeInTheDocument();
  });

  it('shows A coefficients section', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('A Coefficients (Feedback)')).toBeInTheDocument();
  });

  it('shows transfer function display', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Transfer Function')).toBeInTheDocument();
  });

  it('shows add coefficient buttons', () => {
    render(
      <DiffEqEditor
        open={true}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    const addButtons = screen.getAllByRole('button', { name: /add coefficient/i });
    expect(addButtons.length).toBe(2); // One for each array
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DiffEqEditor
        open={true}
        onClose={handleClose}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <DiffEqEditor
        open={false}
        onClose={() => {}}
        filter={defaultDiffEqFilter}
        onSave={() => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
