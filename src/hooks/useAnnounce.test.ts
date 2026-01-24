import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnnounce, useLiveRegion } from './useAnnounce';

describe('useAnnounce', () => {
  beforeEach(() => {
    // Clean up any existing live regions
    document.getElementById('aria-live-polite')?.remove();
    document.getElementById('aria-live-assertive')?.remove();
  });

  afterEach(() => {
    // Clean up
    document.getElementById('aria-live-polite')?.remove();
    document.getElementById('aria-live-assertive')?.remove();
  });

  it('returns an announce function', () => {
    const { result } = renderHook(() => useAnnounce());
    expect(typeof result.current).toBe('function');
  });

  it('creates live region elements', () => {
    renderHook(() => useAnnounce());

    const polite = document.getElementById('aria-live-polite');
    const assertive = document.getElementById('aria-live-assertive');

    expect(polite).toBeTruthy();
    expect(assertive).toBeTruthy();
    expect(polite?.getAttribute('aria-live')).toBe('polite');
    expect(assertive?.getAttribute('aria-live')).toBe('assertive');
  });

  it('announces polite messages', async () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current('Test message');
    });

    // Wait for requestAnimationFrame
    await waitFor(() => {
      const polite = document.getElementById('aria-live-polite');
      expect(polite?.textContent).toBe('Test message');
    });
  });

  it('announces assertive messages', async () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current('Urgent message', 'assertive');
    });

    await waitFor(() => {
      const assertive = document.getElementById('aria-live-assertive');
      expect(assertive?.textContent).toBe('Urgent message');
    });
  });

  it('clears content before announcing to re-trigger screen readers', async () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current('First message');
    });

    await waitFor(() => {
      const polite = document.getElementById('aria-live-polite');
      expect(polite?.textContent).toBe('First message');
    });

    // Announce the same message again
    act(() => {
      result.current('First message');
    });

    // The content should be cleared first, then set again
    // This is hard to test synchronously due to requestAnimationFrame
    // but we can at least verify the final state
    await waitFor(() => {
      const polite = document.getElementById('aria-live-polite');
      expect(polite?.textContent).toBe('First message');
    });
  });

  it('reuses existing live region elements', () => {
    // Create the elements first
    const polite = document.createElement('div');
    polite.id = 'aria-live-polite';
    polite.setAttribute('aria-live', 'polite');
    document.body.appendChild(polite);

    const assertive = document.createElement('div');
    assertive.id = 'aria-live-assertive';
    assertive.setAttribute('aria-live', 'assertive');
    document.body.appendChild(assertive);

    renderHook(() => useAnnounce());

    // Should not create duplicates
    expect(document.querySelectorAll('#aria-live-polite')).toHaveLength(1);
    expect(document.querySelectorAll('#aria-live-assertive')).toHaveLength(1);
  });
});

describe('useLiveRegion', () => {
  it('returns announce function and content', () => {
    const { result } = renderHook(() => useLiveRegion());

    expect(typeof result.current.announce).toBe('function');
    expect(result.current.content).toBe('');
  });

  it('updates content when announcing', async () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('Hello');
    });

    await waitFor(() => {
      expect(result.current.content).toBe('Hello');
    });
  });

  it('clears content before re-announcing', async () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('First');
    });

    await waitFor(() => {
      expect(result.current.content).toBe('First');
    });

    act(() => {
      result.current.announce('Second');
    });

    await waitFor(() => {
      expect(result.current.content).toBe('Second');
    });
  });

  it('accepts priority parameter', () => {
    const { result: politeResult } = renderHook(() => useLiveRegion('polite'));
    const { result: assertiveResult } = renderHook(() => useLiveRegion('assertive'));

    expect(politeResult.current.announce).toBeDefined();
    expect(assertiveResult.current.announce).toBeDefined();
  });
});
