import * as React from 'react';
import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Priority levels for announcements
 */
export type AnnouncePriority = 'polite' | 'assertive';

/**
 * Hook for announcing messages to screen readers using ARIA live regions.
 *
 * @example
 * ```tsx
 * const announce = useAnnounce();
 *
 * // Polite announcement (waits for user idle)
 * announce('Item saved successfully');
 *
 * // Assertive announcement (interrupts immediately)
 * announce('Connection lost!', 'assertive');
 * ```
 */
export function useAnnounce(): (message: string, priority?: AnnouncePriority) => void {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  // Create live region elements on mount
  useEffect(() => {
    // Check if we already have the live regions (e.g., from AriaLiveRegion component)
    let politeEl = document.getElementById('aria-live-polite') as HTMLDivElement | null;
    let assertiveEl = document.getElementById('aria-live-assertive') as HTMLDivElement | null;

    // If not found, create them
    if (!politeEl) {
      politeEl = document.createElement('div');
      politeEl.id = 'aria-live-polite';
      politeEl.setAttribute('aria-live', 'polite');
      politeEl.setAttribute('aria-atomic', 'true');
      politeEl.className = 'sr-only';
      document.body.appendChild(politeEl);
    }

    if (!assertiveEl) {
      assertiveEl = document.createElement('div');
      assertiveEl.id = 'aria-live-assertive';
      assertiveEl.setAttribute('aria-live', 'assertive');
      assertiveEl.setAttribute('aria-atomic', 'true');
      assertiveEl.className = 'sr-only';
      document.body.appendChild(assertiveEl);
    }

    politeRef.current = politeEl;
    assertiveRef.current = assertiveEl;

    // Don't remove on unmount - other hooks may be using them
  }, []);

  const announce = useCallback((message: string, priority: AnnouncePriority = 'polite') => {
    const el = priority === 'assertive' ? assertiveRef.current : politeRef.current;
    if (el) {
      // Clear first to ensure re-announcement of same message
      el.textContent = '';
      // Use requestAnimationFrame to ensure the clear is processed
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    }
  }, []);

  return announce;
}

/**
 * Hook for creating a live region that can be rendered in JSX.
 * Returns the announcement function and the content to render.
 */
export function useLiveRegion(_priority: AnnouncePriority = 'polite'): {
  announce: (message: string) => void;
  content: string;
} {
  const [content, setContent] = useState('');

  const announce = useCallback((message: string) => {
    // Clear first to trigger re-announcement
    setContent('');
    requestAnimationFrame(() => {
      setContent(message);
    });
  }, []);

  return { announce, content };
}

/**
 * Component that creates ARIA live regions for announcements.
 * Add this once at the app root level.
 */
export function AriaLiveRegion(): React.ReactNode {
  return (
    <>
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
