import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
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
    vi.restoreAllMocks();
  });

  describe('capacitorFetch Utility', () => {
    it('falls back to standard fetch when in web environment', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const res = await capacitorFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-key' },
        body: JSON.stringify({ model: 'gpt-4o-mini' }),
      });

      expect(isNativeMobile()).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
        })
      );
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

    it('passes browser options and the original response through unchanged', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const options: RequestInit = {
        method: 'PATCH',
        headers: new Headers({ 'X-Request-Id': 'test-request' }),
        body: 'plain text',
        credentials: 'include',
        signal: new AbortController().signal,
      };
      const response = new Response('unavailable', { status: 503 });
      globalThis.fetch = vi.fn().mockResolvedValue(response);

      expect(await capacitorFetch('https://example.test/resource', options)).toBe(response);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith('https://example.test/resource', options);
      expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toBe(options);
      expect(CapacitorHttp.request).not.toHaveBeenCalled();
    });

    it('preserves browser network failures without switching transports', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const error = new TypeError('Failed to fetch');
      globalThis.fetch = vi.fn().mockRejectedValue(error);

      await expect(capacitorFetch('https://example.test/resource')).rejects.toBe(error);
      expect(CapacitorHttp.request).not.toHaveBeenCalled();
    });

    describe('native request and response conversion', () => {
      const url = 'https://example.test/resource';

      beforeEach(() => {
        vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Unexpected browser request'));
        vi.mocked(CapacitorHttp.request).mockResolvedValue({
          url,
          status: 200,
          data: { answer: 'שלום' },
          headers: { 'Content-Type': 'application/json' },
        });
      });

      afterEach(() => {
        expect(globalThis.fetch).not.toHaveBeenCalled();
      });

      it('defaults to GET with no headers or body', async () => {
        await capacitorFetch(url);

        expect(CapacitorHttp.request).toHaveBeenCalledTimes(1);
        expect(CapacitorHttp.request).toHaveBeenCalledWith({
          url,
          method: 'GET',
          headers: {},
          data: undefined,
        });
      });

      it.each<[string, HeadersInit, Record<string, string>]>([
        ['record', { Authorization: 'Bearer test-key' }, { Authorization: 'Bearer test-key' }],
        [
          'Headers',
          new Headers({ Authorization: 'Bearer test-key' }),
          { authorization: 'Bearer test-key' },
        ],
        [
          'tuples',
          [
            ['Authorization', 'Bearer test-key'],
            ['X-Request-Id', '123'],
          ],
          { Authorization: 'Bearer test-key', 'X-Request-Id': '123' },
        ],
      ])('converts %s headers for the native plugin', async (_label, headers, expected) => {
        await capacitorFetch(url, { headers });

        expect(CapacitorHttp.request).toHaveBeenCalledWith(
          expect.objectContaining({ headers: expected })
        );
      });

      it.each([
        ['object', '{"message":"שלום"}', { message: 'שלום' }],
        ['array', '[1,2]', [1, 2]],
        ['false', 'false', false],
        ['zero', '0', 0],
        ['null', 'null', null],
        ['JSON string', '"hello"', 'hello'],
        ['plain text', 'hello', 'hello'],
        ['malformed JSON', '{"incomplete":', '{"incomplete":'],
      ])('converts a %s request body without losing its value', async (_label, body, expected) => {
        await capacitorFetch(url, { method: 'POST', body });

        expect(CapacitorHttp.request).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'POST', data: expected })
        );
      });

      it('passes a non-string body to the plugin unchanged', async () => {
        const body = new URLSearchParams({ query: 'שלום' });
        await capacitorFetch(url, { method: 'POST', body });

        expect(vi.mocked(CapacitorHttp.request).mock.calls[0][0].data).toBe(body);
      });

      it('exposes native JSON and response headers through the Response API', async () => {
        const response = await capacitorFetch(url);

        expect(response).toBeInstanceOf(Response);
        expect(response.headers.get('content-type')).toBe('application/json');
        expect(await response.json()).toEqual({ answer: 'שלום' });
        expect(response.bodyUsed).toBe(true);
      });

      it.each([200, 299, 300, 401, 429, 500])(
        'preserves HTTP status %i and a plain text response',
        async (status) => {
          vi.mocked(CapacitorHttp.request).mockResolvedValue({
            url,
            status,
            data: 'provider response',
            headers: { 'Retry-After': '60' },
          });

          const response = await capacitorFetch(url);

          expect(response.status).toBe(status);
          expect(response.ok).toBe(status >= 200 && status < 300);
          expect(response.headers.get('retry-after')).toBe('60');
          expect(await response.text()).toBe('provider response');
        }
      );

      it('preserves serialized JSON strings without encoding them twice', async () => {
        vi.mocked(CapacitorHttp.request).mockResolvedValue({
          url,
          status: 200,
          data: '{"answer":"hello"}',
          headers: {},
        });

        expect(await (await capacitorFetch(url)).json()).toEqual({ answer: 'hello' });
      });

      // Known defect: capacitorFetch serializes null to "null", but HTTP 204
      // forbids a response body. Keep the desired behavior executable; remove
      // `.fails` when the wrapper passes a null body for bodyless statuses.
      it.fails('returns a bodyless Response for native HTTP 204', async () => {
        vi.mocked(CapacitorHttp.request).mockResolvedValue({
          url,
          status: 204,
          data: null,
          headers: {},
        });

        const response = await capacitorFetch(url);

        expect(response.status).toBe(204);
        expect(response.ok).toBe(true);
        expect(response.body).toBeNull();
        expect(await response.text()).toBe('');
      });

      it('propagates native failures without retrying through browser fetch', async () => {
        const error = new Error('Native connection failed');
        vi.mocked(CapacitorHttp.request).mockRejectedValueOnce(error);

        await expect(capacitorFetch(url)).rejects.toBe(error);
        expect(CapacitorHttp.request).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('initCapacitorApp Startup Utility', () => {
    it('does nothing when running on web platform', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      await initCapacitorApp();

      expect(StatusBar.setStyle).not.toHaveBeenCalled();
      expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
      expect(SplashScreen.hide).not.toHaveBeenCalled();
    });

    it('initializes status bar and hides splash screen on native platform', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

      await initCapacitorApp();

      expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
      expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#0F172A' });
      expect(SplashScreen.hide).toHaveBeenCalled();
    });

    it('styles iOS and hides its splash without setting an Android background', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');

      await initCapacitorApp();

      expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
      expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
      expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    });

    it.each(['style', 'background'] as const)(
      'still hides the splash when status bar %s setup fails',
      async (stage) => {
        vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
        vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
        const error = new Error('Status bar unavailable');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(
          stage === 'style' ? StatusBar.setStyle : StatusBar.setBackgroundColor
        ).mockRejectedValueOnce(error);

        await expect(initCapacitorApp()).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith('Status bar initialization failed:', error);
        expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
        if (stage === 'style') expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
      }
    );

    it('reports splash failure without rejecting app startup', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
      const error = new Error('Splash unavailable');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(SplashScreen.hide).mockRejectedValueOnce(error);

      await expect(initCapacitorApp()).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('Splash screen hide failed:', error);
      expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#0F172A' });
    });

    it('finishes Android status bar setup before hiding the splash', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
      const events: string[] = [];
      vi.mocked(StatusBar.setStyle).mockImplementationOnce(async () => {
        await Promise.resolve();
        events.push('style ready');
      });
      vi.mocked(StatusBar.setBackgroundColor).mockImplementationOnce(async () => {
        events.push('background started');
        await Promise.resolve();
        events.push('background ready');
      });
      vi.mocked(SplashScreen.hide).mockImplementationOnce(async () => {
        events.push('splash hidden');
      });

      await initCapacitorApp();

      expect(events).toEqual([
        'style ready',
        'background started',
        'background ready',
        'splash hidden',
      ]);
    });
  });
});
