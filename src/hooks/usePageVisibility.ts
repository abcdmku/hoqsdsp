import { useSyncExternalStore } from 'react';

type Listener = () => void;

let initialized = false;
let isVisible = true;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function init() {
  if (initialized) return;
  initialized = true;

  if (typeof document === 'undefined') {
    isVisible = true;
    return;
  }

  isVisible = !document.hidden;

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    notify();
  });
}

function subscribe(listener: Listener): () => void {
  init();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  init();
  return isVisible;
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * Returns `true` when the document is visible (not in a background tab).
 * Uses a single shared `visibilitychange` listener across the app.
 */
export function usePageVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

