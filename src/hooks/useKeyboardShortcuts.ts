import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key to listen for (e.g., 'Escape', 'Delete', 'a', '1') */
  key: string;
  /** Modifier keys required */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /** Callback when shortcut is triggered */
  handler: (event: KeyboardEvent) => void;
  /** Description for accessibility/help text */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** Only trigger when these elements are NOT focused */
  excludeInputs?: boolean;
}

/**
 * Options for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether the shortcuts are enabled */
  enabled?: boolean;
  /** Target element for event listener (defaults to document) */
  target?: HTMLElement | null;
  /** Use capture phase for event listener */
  capture?: boolean;
}

/**
 * Check if the currently focused element is an input-like element
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Check if modifiers match
 */
function modifiersMatch(
  event: KeyboardEvent,
  modifiers?: KeyboardShortcut['modifiers']
): boolean {
  if (!modifiers) {
    // No modifiers required - make sure none are pressed
    return !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
  }

  return (
    (modifiers.ctrl ?? false) === event.ctrlKey &&
    (modifiers.alt ?? false) === event.altKey &&
    (modifiers.shift ?? false) === event.shiftKey &&
    (modifiers.meta ?? false) === event.metaKey
  );
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'Escape', handler: () => clearSelection() },
 *   { key: 's', modifiers: { ctrl: true }, handler: () => save(), preventDefault: true },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true, target = null, capture = false } = options;
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!shortcutsRef.current.length) return;

    for (const shortcut of shortcutsRef.current) {
      // Check if key matches (case-insensitive for letters)
      const keyMatches =
        event.key === shortcut.key ||
        event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (!keyMatches) continue;

      // Check modifiers
      if (!modifiersMatch(event, shortcut.modifiers)) continue;

      // Check if we should skip input elements
      if (shortcut.excludeInputs !== false && isInputElement(document.activeElement)) {
        continue;
      }

      // Execute handler
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }

      shortcut.handler(event);
      return;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target ?? document;

    targetElement.addEventListener('keydown', handleKeyDown as EventListener, { capture });

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener, { capture });
    };
  }, [enabled, target, capture, handleKeyDown]);
}

/**
 * Predefined shortcut keys for common actions
 */
export const ShortcutKeys = {
  // Navigation
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ENTER: 'Enter',
  SPACE: ' ',

  // Arrow keys
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',

  // Actions
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',

  // Common shortcuts
  SAVE: 's',
  UNDO: 'z',
  REDO: 'y',
  COPY: 'c',
  PASTE: 'v',
  CUT: 'x',
  SELECT_ALL: 'a',
} as const;

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.ctrl) parts.push('Ctrl');
  if (shortcut.modifiers?.alt) parts.push('Alt');
  if (shortcut.modifiers?.shift) parts.push('Shift');
  if (shortcut.modifiers?.meta) parts.push('⌘');

  // Format the key for display
  let keyDisplay = shortcut.key;
  switch (shortcut.key) {
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'ArrowUp':
      keyDisplay = '↑';
      break;
    case 'ArrowDown':
      keyDisplay = '↓';
      break;
    case 'ArrowLeft':
      keyDisplay = '←';
      break;
    case 'ArrowRight':
      keyDisplay = '→';
      break;
    case 'Escape':
      keyDisplay = 'Esc';
      break;
    case 'Delete':
      keyDisplay = 'Del';
      break;
    case 'Backspace':
      keyDisplay = '⌫';
      break;
    default:
      // Capitalize single letters
      if (keyDisplay.length === 1) {
        keyDisplay = keyDisplay.toUpperCase();
      }
  }

  parts.push(keyDisplay);
  return parts.join('+');
}
