import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { capacitorFetch, isNativeMobile } from '../src/utils/capacitorHttp';
import { initCapacitorApp } from '../src/utils/capacitor';

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...actual,
    CapacitorHttp: {
      request: vi.fn(),
    },
  };
});

describe('Capacitor Mobile Enhancements', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('capacitorFetch Utility', () => {
    it('falls back to standard fetch when in web environment', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const res = await capacitorFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-key' },
        body: JSON.stringify({ model: 'gpt-4o-mini' }),
      });

      expect(isNativeMobile()).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
        method: 'POST',
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it('uses CapacitorHttp native plugin on native iOS/Android platforms to bypass CORS', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const requestMock = vi.mocked(CapacitorHttp.request).mockResolvedValue({
        status: 200,
        data: { choices: [{ message: { content: 'Hello native AI!' } }] },
        headers: { 'content-type': 'application/json' },
        url: 'https://api.openai.com/v1/chat/completions',
      });

      const res = await capacitorFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer native-test-key',
        },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }] }),
      });

      expect(isNativeMobile()).toBe(true);
      expect(requestMock).toHaveBeenCalledWith({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer native-test-key',
        },
        data: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }] },
      });

      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.choices[0].message.content).toBe('Hello native AI!');
    });
  });

  describe('initCapacitorApp Startup Utility', () => {
    it('does nothing when running on web platform', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      await initCapacitorApp();

      expect(StatusBar.setStyle).not.toHaveBeenCalled();
      expect(SplashScreen.hide).not.toHaveBeenCalled();
    });

    it('initializes status bar and hides splash screen on native platform', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

      await initCapacitorApp();

      expect(StatusBar.setStyle).toHaveBeenCalled();
      expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#0F172A' });
      expect(SplashScreen.hide).toHaveBeenCalled();
    });
  });
});
