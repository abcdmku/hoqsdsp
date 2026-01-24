import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut, type KeyboardShortcut } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls handler when shortcut key is pressed', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not call handler when different key is pressed', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles modifier keys correctly', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', modifiers: { ctrl: true }, handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    // Without Ctrl - should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    expect(handler).not.toHaveBeenCalled();

    // With Ctrl - should trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires all specified modifiers', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', modifiers: { ctrl: true, shift: true }, handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    // Only Ctrl - should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    // Ctrl + Shift - should trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('prevents default when specified', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 's', modifiers: { ctrl: true }, handler, preventDefault: true },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('stops propagation when specified', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler, stopPropagation: true },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    document.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('respects enabled option', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts, { enabled: false }); });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('skips input elements by default', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler },
    ];

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Should still work because we're dispatching on document
    // The check is for document.activeElement, which is the input
    // So it should NOT trigger
    expect(handler).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(input);
  });

  it('triggers on input when excludeInputs is false', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler, excludeInputs: false },
    ];

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(handler).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('handles case-insensitive key matching', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', handler },
    ];

    renderHook(() => { useKeyboardShortcuts(shortcuts); });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', handler },
    ];

    const { unmount } = renderHook(() => { useKeyboardShortcuts(shortcuts); });

    // Trigger before unmount
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();

    // Trigger after unmount - should not call handler
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('formatShortcut', () => {
  it('formats simple key', () => {
    expect(formatShortcut({ key: 'Escape', handler: vi.fn() })).toBe('Esc');
  });

  it('formats key with Ctrl modifier', () => {
    expect(formatShortcut({ key: 's', modifiers: { ctrl: true }, handler: vi.fn() })).toBe('Ctrl+S');
  });

  it('formats key with multiple modifiers', () => {
    expect(formatShortcut({
      key: 's',
      modifiers: { ctrl: true, shift: true },
      handler: vi.fn(),
    })).toBe('Ctrl+Shift+S');
  });

  it('formats arrow keys', () => {
    expect(formatShortcut({ key: 'ArrowUp', handler: vi.fn() })).toBe('↑');
    expect(formatShortcut({ key: 'ArrowDown', handler: vi.fn() })).toBe('↓');
    expect(formatShortcut({ key: 'ArrowLeft', handler: vi.fn() })).toBe('←');
    expect(formatShortcut({ key: 'ArrowRight', handler: vi.fn() })).toBe('→');
  });

  it('formats Space key', () => {
    expect(formatShortcut({ key: ' ', handler: vi.fn() })).toBe('Space');
  });

  it('formats Delete and Backspace', () => {
    expect(formatShortcut({ key: 'Delete', handler: vi.fn() })).toBe('Del');
    expect(formatShortcut({ key: 'Backspace', handler: vi.fn() })).toBe('⌫');
  });

  it('formats key with Meta modifier', () => {
    expect(formatShortcut({ key: 'c', modifiers: { meta: true }, handler: vi.fn() })).toBe('⌘+C');
  });
});
