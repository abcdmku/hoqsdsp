import { useCallback, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts';

/**
 * Global keyboard shortcuts for the application.
 * These shortcuts work throughout the app unless an input is focused.
 */
export function useGlobalShortcuts(): void {
  const {
    closeModal,
    toggleSidebar,
    modalOpen,
  } = useUIStore();

  // Handle Escape - close modal
  const handleEscape = useCallback(() => {
    if (modalOpen) {
      closeModal();
    }
  }, [modalOpen, closeModal]);

  // Toggle sidebar with Ctrl+B (like VS Code)
  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    {
      key: 'Escape',
      handler: handleEscape,
      description: 'Close modal',
      excludeInputs: true,
    },
    {
      key: 'b',
      modifiers: { ctrl: true },
      handler: handleToggleSidebar,
      description: 'Toggle sidebar',
      preventDefault: true,
    },
    {
      key: 'b',
      modifiers: { meta: true },
      handler: handleToggleSidebar,
      description: 'Toggle sidebar (Mac)',
      preventDefault: true,
    },
  ], [handleEscape, handleToggleSidebar]);

  useKeyboardShortcuts(shortcuts);
}

/**
 * List of global shortcuts for help/documentation
 */
export const globalShortcutsList: { key: string; description: string }[] = [
  { key: 'Esc', description: 'Close modal' },
  { key: 'Ctrl+B', description: 'Toggle sidebar' },
];
