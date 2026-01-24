import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  LoadingSpinner,
  LoadingOverlay,
  LoadingState,
  InlineLoading,
  ButtonLoading,
} from './LoadingState';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('w-6', 'h-6');
  });

  it('renders small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('applies animation class', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);
    // Message appears twice: visible and sr-only
    expect(screen.getAllByText('Loading...')).toHaveLength(2);
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Saving configuration..." />);
    // Message appears twice: visible and sr-only
    expect(screen.getAllByText('Saving configuration...')).toHaveLength(2);
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingOverlay message="Loading" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('has screen reader only text', () => {
    render(<LoadingOverlay message="Loading data" />);
    expect(screen.getByText('Loading data', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('applies overlay styling', () => {
    const { container } = render(<LoadingOverlay />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('absolute', 'inset-0', 'z-10');
  });
});

describe('LoadingState', () => {
  it('renders children when not loading and no error', () => {
    render(
      <LoadingState loading={false} error={null}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders default loading spinner when loading', () => {
    const { container } = render(
      <LoadingState loading={true} error={null}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders custom loading fallback when provided', () => {
    render(
      <LoadingState
        loading={true}
        error={null}
        loadingFallback={<div>Custom loading...</div>}
      >
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
  });

  it('renders error message when error exists', () => {
    render(
      <LoadingState loading={false} error={new Error('Something went wrong')}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button when error and onRetry provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <LoadingState
        loading={false}
        error={new Error('Error')}
        onRetry={onRetry}
      >
        <div>Content</div>
      </LoadingState>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom error fallback when provided', () => {
    render(
      <LoadingState
        loading={false}
        error={new Error('Error')}
        errorFallback={<div>Custom error UI</div>}
      >
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });
});

describe('InlineLoading', () => {
  it('renders with default message', () => {
    render(<InlineLoading />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<InlineLoading message="Fetching data" />);
    expect(screen.getByText('Fetching data')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<InlineLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('includes loading spinner', () => {
    const { container } = render(<InlineLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('ButtonLoading', () => {
  it('renders children when not loading', () => {
    render(
      <ButtonLoading loading={false}>
        <span>Submit</span>
      </ButtonLoading>
    );

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders loading state with default text when loading', () => {
    render(
      <ButtonLoading loading={true}>
        <span>Submit</span>
      </ButtonLoading>
    );

    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders loading state with custom text when loading', () => {
    render(
      <ButtonLoading loading={true} loadingText="Saving...">
        <span>Save</span>
      </ButtonLoading>
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('includes loading spinner when loading', () => {
    const { container } = render(
      <ButtonLoading loading={true}>
        <span>Submit</span>
      </ButtonLoading>
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
