import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe(): void {
      // no-op
    }

    unobserve(): void {
      // no-op
    }

    disconnect(): void {
      // no-op
    }
  },
);

afterEach(() => {
  cleanup();
});
