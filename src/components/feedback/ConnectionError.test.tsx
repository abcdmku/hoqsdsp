import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionError, OperationError } from './ConnectionError';

describe('ConnectionError', () => {
  it('renders full error display by default', () => {
    render(<ConnectionError />);

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays unit name when provided', () => {
    render(<ConnectionError unitName="Living Room DSP" />);

    expect(screen.getByText('Living Room DSP')).toBeInTheDocument();
  });

  it('displays address when provided', () => {
    render(<ConnectionError address="192.168.1.100:1234" />);

    expect(screen.getByText('192.168.1.100:1234')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<ConnectionError error="WebSocket connection refused" />);

    expect(screen.getByText('WebSocket connection refused')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ConnectionError onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders configure button when onConfigure is provided', async () => {
    const user = userEvent.setup();
    const onConfigure = vi.fn();

    render(<ConnectionError onConfigure={onConfigure} />);

    const configureButton = screen.getByRole('button', { name: /configure/i });
    expect(configureButton).toBeInTheDocument();

    await user.click(configureButton);
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('renders compact version when compact is true', () => {
    render(<ConnectionError compact unitName="DSP Unit" onRetry={() => {}} />);

    expect(screen.getByText(/DSP Unit: Connection failed/)).toBeInTheDocument();
    expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
  });

  it('compact version shows retry button', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ConnectionError compact onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry connection/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<ConnectionError />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});

describe('OperationError', () => {
  it('renders with default title', () => {
    render(<OperationError message="Failed to save configuration" />);

    expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    expect(screen.getByText('Failed to save configuration')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(
      <OperationError
        title="Save Error"
        message="Unable to write to disk"
      />
    );

    expect(screen.getByText('Save Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to write to disk')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<OperationError message="Error" onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button when onDismiss is provided', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<OperationError message="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render buttons when callbacks not provided', () => {
    render(<OperationError message="Error" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<OperationError message="Error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
