import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Checks if the current application context is running as a native iOS or Android Capacitor app.
 */
export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Native HTTP wrapper that uses @capacitor/http (via CapacitorHttp) on iOS/Android native devices
 * to bypass browser CORS constraints when making direct client requests to AI providers
 * (OpenAI, Gemini, Anthropic, Groq, DeepSeek).
 *
 * Falls back to standard browser fetch() when running in web environment.
 */
export async function capacitorFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (isNativeMobile()) {
    const method = options.method || 'GET';
    const headers: Record<string, string> = {};

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    let data: any = undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        try {
          data = JSON.parse(options.body);
        } catch {
          data = options.body;
        }
      } else {
        data = options.body;
      }
    }

    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data,
    });

    const bodyText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const resHeaders = new Headers();
    if (res.headers) {
      Object.entries(res.headers).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          resHeaders.set(k, String(v));
        }
      });
    }

    return new Response(bodyText, {
      status: res.status,
      headers: resHeaders,
    });
  }

  return fetch(url, options);
}
