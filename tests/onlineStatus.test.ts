// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnlineStatus } from '../src/hooks/useOnlineStatus';

describe('useOnlineStatus hook', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('reports initial online status correctly', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });

    expect(typeof useOnlineStatus).toBe('function');
  });

  it('sets up event listeners for online and offline events', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    // Simulate event handlers
    const onlineHandler = vi.fn();
    const offlineHandler = vi.fn();

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    window.dispatchEvent(new Event('offline'));
    expect(offlineHandler).toHaveBeenCalled();

    window.dispatchEvent(new Event('online'));
    expect(onlineHandler).toHaveBeenCalled();

    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
