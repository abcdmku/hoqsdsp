import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);

    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Add your first item to get started"
      />
    );

    expect(screen.getByText('Add your first item to get started')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No items"
        icon={<Inbox data-testid="inbox-icon" className="w-6 h-6" />}
      />
    );

    expect(screen.getByTestId('inbox-icon')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const onClick = vi.fn();

    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick,
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick,
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />
    );

    const emptyState = container.firstChild as HTMLElement;
    expect(emptyState).toHaveClass('custom-class');
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="No items" />);

    // Only the title should be present, no paragraph for description
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('does not render action button when not provided', () => {
    render(<EmptyState title="No items" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
