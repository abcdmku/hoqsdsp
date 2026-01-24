import { useEffect, useRef, useCallback } from 'react';

/**
 * Selector for all focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[contenteditable=""]:not([contenteditable="false"])',
].join(',');

/**
 * Options for the focus trap hook
 */
export interface UseFocusTrapOptions {
  /** Whether the trap is active */
  enabled?: boolean;
  /** Restore focus to the element that was focused before the trap was activated */
  restoreFocus?: boolean;
  /** Auto-focus the first focusable element when activated */
  autoFocus?: boolean;
  /** Element to focus when activated (overrides autoFocus) */
  initialFocus?: HTMLElement | null;
}

/**
 * Hook to trap focus within a container element.
 * Useful for modals and dialogs to ensure keyboard navigation stays within the component.
 *
 * @example
 * ```tsx
 * function Modal({ open, onClose }) {
 *   const trapRef = useFocusTrap<HTMLDivElement>({ enabled: open });
 *
 *   return (
 *     <div ref={trapRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *       <input type="text" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {}
): React.RefObject<T | null> {
  const {
    enabled = true,
    restoreFocus = true,
    autoFocus = true,
    initialFocus,
  } = options;

  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
      // Filter out elements with display:none or visibility:hidden
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab from first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
        return;
      }

      // Tab from last element -> go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
        return;
      }

      // If focus is outside the container, bring it back
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement)?.focus();
      }
    },
    [getFocusableElements]
  );

  // Set up the trap when enabled
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store current focus for restoration
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Focus initial element
    if (initialFocus) {
      initialFocus.focus();
    } else if (autoFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Small delay to ensure the DOM is ready
        requestAnimationFrame(() => {
          focusableElements[0]?.focus();
        });
      }
    }

    // Add keydown listener
    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus on cleanup
      if (restoreFocus && previousFocusRef.current) {
        // Use setTimeout to avoid focus race conditions
        setTimeout(() => {
          previousFocusRef.current?.focus();
        }, 0);
      }
    };
  }, [enabled, restoreFocus, autoFocus, initialFocus, getFocusableElements, handleKeyDown]);

  return containerRef;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  return element.matches(FOCUSABLE_SELECTOR);
}
