import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster, showToast, toast } from './Toast';

// Mock sonner
vi.mock('sonner', () => ({
  Toaster: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="sonner-toaster" {...props}>
      {children}
    </div>
  ),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('Toaster', () => {
  it('renders the sonner toaster component', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toBeInTheDocument();
  });
});

describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success', () => {
    it('calls toast.success with message', () => {
      showToast.success('Success message');
      expect(toast.success).toHaveBeenCalledWith('Success message', { description: undefined });
    });

    it('calls toast.success with message and description', () => {
      showToast.success('Success message', 'Additional details');
      expect(toast.success).toHaveBeenCalledWith('Success message', { description: 'Additional details' });
    });
  });

  describe('error', () => {
    it('calls toast.error with message', () => {
      showToast.error('Error message');
      expect(toast.error).toHaveBeenCalledWith('Error message', { description: undefined });
    });

    it('calls toast.error with message and description', () => {
      showToast.error('Error message', 'Error details');
      expect(toast.error).toHaveBeenCalledWith('Error message', { description: 'Error details' });
    });
  });

  describe('warning', () => {
    it('calls toast.warning with message', () => {
      showToast.warning('Warning message');
      expect(toast.warning).toHaveBeenCalledWith('Warning message', { description: undefined });
    });
  });

  describe('info', () => {
    it('calls toast.info with message', () => {
      showToast.info('Info message');
      expect(toast.info).toHaveBeenCalledWith('Info message', { description: undefined });
    });
  });

  describe('loading', () => {
    it('calls toast.loading and returns toast id', () => {
      const id = showToast.loading('Loading...');
      expect(toast.loading).toHaveBeenCalledWith('Loading...');
      expect(id).toBe('toast-id');
    });
  });

  describe('dismiss', () => {
    it('calls toast.dismiss without id', () => {
      showToast.dismiss();
      expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });

    it('calls toast.dismiss with specific id', () => {
      showToast.dismiss('toast-123');
      expect(toast.dismiss).toHaveBeenCalledWith('toast-123');
    });
  });

  describe('promise', () => {
    it('calls toast.promise with promise and messages', async () => {
      const promise = Promise.resolve('data');
      const messages = {
        loading: 'Saving...',
        success: 'Saved!',
        error: 'Failed to save',
      };

      showToast.promise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });
  });
});
