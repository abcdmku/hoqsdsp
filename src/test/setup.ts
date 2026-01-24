import '@testing-library/jest-dom/vitest';
import { cleanup, render, type RenderOptions } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { TooltipProvider } from '../components/ui/Tooltip';

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

// Custom render function that wraps components with TooltipProvider
function AllProviders({ children }: { children: ReactNode }): ReactElement {
  return createElement(TooltipProvider, { delayDuration: 0, children });
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
