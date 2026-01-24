import { useCallback, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts';

/**
 * Global keyboard shortcuts for the application.
 * These shortcuts work throughout the app unless an input is focused.
 */
export function useGlobalShortcuts(): void {
  const {
    setSelectedChannel,
    setSelectedFilter,
    closeModal,
    toggleSidebar,
    modalOpen,
  } = useUIStore();

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedChannel(null);
    setSelectedFilter(null);
  }, [setSelectedChannel, setSelectedFilter]);

  // Handle Escape - close modal or clear selection
  const handleEscape = useCallback(() => {
    if (modalOpen) {
      closeModal();
    } else {
      clearSelection();
    }
  }, [modalOpen, closeModal, clearSelection]);

  // Toggle sidebar with Ctrl+B (like VS Code)
  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    {
      key: 'Escape',
      handler: handleEscape,
      description: 'Close modal or clear selection',
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
  { key: 'Esc', description: 'Close modal or clear selection' },
  { key: 'Ctrl+B', description: 'Toggle sidebar' },
];
