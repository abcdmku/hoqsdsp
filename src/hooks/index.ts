// Keyboard shortcuts
export { useKeyboardShortcuts, formatShortcut, ShortcutKeys } from './useKeyboardShortcuts';
export type { KeyboardShortcut, UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';
export { useGlobalShortcuts, globalShortcutsList } from './useGlobalShortcuts';

// Accessibility
export { useAnnounce, useLiveRegion, AriaLiveRegion } from './useAnnounce';
export { useFocusTrap } from './useFocusTrap';
export { useConnectionAnnouncements } from './useConnectionAnnouncements';

// Connection management
export { useConnectionManager } from './useConnectionManager';

// Page visibility (performance)
export { usePageVisibility } from './usePageVisibility';

export { useDevPerformanceEntryCleanup } from './useDevPerformanceEntryCleanup';
export type { UseDevPerformanceEntryCleanupOptions } from './useDevPerformanceEntryCleanup';

// Auto setup
export { useAutoSetup } from './useAutoSetup';
export type { AutoSetupResult, AutoSetupState } from './useAutoSetup';
export { useAutoSetupPrompt } from './useAutoSetupPrompt';
