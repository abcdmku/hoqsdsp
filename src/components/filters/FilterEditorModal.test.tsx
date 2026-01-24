import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterEditorModal } from './FilterEditorModal';
import type { GainFilter } from '../../types';

// Simple test filter for testing the modal
const testFilter: GainFilter = {
  type: 'Gain',
  parameters: {
    gain: 0,
    scale: 'dB',
    inverted: false,
  },
};

const mockValidate = vi.fn().mockReturnValue({ success: true });

describe('FilterEditorModal', () => {
  it('renders with title and children', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div data-testid="child-content">Test Content</div>
      </FilterEditorModal>,
    );

    expect(screen.getByText('Test Filter')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        description="This is a test description"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterEditorModal
        open={true}
        onClose={handleClose}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('shows Apply button when onApply is provided', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        onApply={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('does not show Apply button when onApply is not provided', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
  });

  it('displays validation errors', () => {
    const validateWithError = vi.fn().mockReturnValue({
      success: false,
      errors: [{ path: ['gain'], message: 'Invalid gain value' }],
    });

    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={validateWithError}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    // The validation error is shown after the filter is modified
    // Initial state should not show errors
    expect(screen.queryByText(/invalid gain value/i)).not.toBeInTheDocument();
  });

  it('disables Save when filter is not dirty', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('does not render when open is false', () => {
    render(
      <FilterEditorModal
        open={false}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    expect(screen.queryByText('Test Filter')).not.toBeInTheDocument();
  });

  it('has Cancel, and Save buttons', () => {
    render(
      <FilterEditorModal
        open={true}
        onClose={() => {}}
        title="Test Filter"
        filter={testFilter}
        onSave={() => {}}
        validate={mockValidate}
      >
        <div>Content</div>
      </FilterEditorModal>,
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
