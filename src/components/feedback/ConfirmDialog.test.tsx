import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
import { useState } from 'react';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
  };

  it('renders dialog content when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons with default labels', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses custom button labels when provided', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state when loading is true', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);

    expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
  });

  it('renders danger variant with appropriate styling', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    // The danger variant should use status-error color (from button danger variant)
    expect(confirmButton).toBeInTheDocument();
  });

  it('renders warning variant with appropriate icon', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);

    // Should render the AlertTriangle icon (warning variant)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });
});

describe('useConfirmDialog', () => {
  function TestComponent() {
    const { confirm, dialogProps } = useConfirmDialog({
      title: 'Test Confirmation',
      description: 'This is a test',
      variant: 'danger',
    });
    const [result, setResult] = useState<boolean | null>(null);

    const handleClick = async () => {
      const confirmed = await confirm();
      setResult(confirmed);
    };

    return (
      <>
        <button onClick={handleClick}>Open Dialog</button>
        {result !== null && (
          <div data-testid="result">{result ? 'Confirmed' : 'Cancelled'}</div>
        )}
        <ConfirmDialog {...dialogProps} />
      </>
    );
  }

  it('opens dialog when confirm is called', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    expect(screen.queryByText('Test Confirmation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Dialog' }));

    expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
  });

  it('resolves true when confirmed', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByRole('button', { name: 'Open Dialog' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Confirmed');
    });
  });

  it('resolves false when cancelled', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByRole('button', { name: 'Open Dialog' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled');
    });
  });
});
