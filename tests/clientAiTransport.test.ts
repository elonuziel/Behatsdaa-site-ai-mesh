import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeDirectAiChat } from '../src/services/clientAi';
import { capacitorFetch } from '../src/utils/capacitorHttp';
import type { AiProviderKey } from '../src/types/chat';

vi.mock('../src/utils/capacitorHttp', () => ({ capacitorFetch: vi.fn() }));

const providers: {
  provider: AiProviderKey;
  label: string;
  endpoint: string;
  defaultModel: string;
  response: object;
}[] = [
  {
    provider: 'gemini',
    label: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    defaultModel: 'gemini-flash-lite-latest',
    response: { candidates: [{ content: { parts: [{ text: 'שלום מהמודל' }] } }] },
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    response: { choices: [{ message: { content: 'שלום מהמודל' } }] },
  },
  {
    provider: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    response: { choices: [{ message: { content: 'שלום מהמודל' } }] },
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    response: { choices: [{ message: { content: 'שלום מהמודל' } }] },
  },
  {
    provider: 'claude',
    label: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    response: { content: [{ text: 'שלום מהמודל' }] },
  },
];

describe('Direct AI provider transport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected browser request')));
  });

  afterEach(() => {
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  describe.each(providers)('$label', ({ provider, label, endpoint, defaultModel, response }) => {
    const params = {
      provider,
      model: 'custom/model name',
      apiKey: 'synthetic-key+with&reserved=characters',
      messages: [
        { role: 'user', content: 'איזו הטבה יש?' },
        { role: 'assistant', content: 'באיזו חנות?' },
        { role: 'user', content: 'בחנות לדוגמה' },
      ],
      catalogContext: 'Synthetic catalog: example store, 15% discount',
    };

    it.each([false, true])(
      'routes the request through capacitorFetch (default model: %s)',
      async (useDefaultModel) => {
        vi.mocked(capacitorFetch).mockResolvedValue(new Response(JSON.stringify(response)));
        const model = useDefaultModel ? '' : params.model;
        const expectedModel = useDefaultModel ? defaultModel : params.model;

        await expect(executeDirectAiChat({ ...params, model })).resolves.toBe('שלום מהמודל');

        expect(capacitorFetch).toHaveBeenCalledTimes(1);
        const [url, options] = vi.mocked(capacitorFetch).mock.calls[0];
        expect(options?.method).toBe('POST');
        const headers = new Headers(options?.headers);
        expect(headers.get('content-type')).toBe('application/json');
        const body = JSON.parse(options?.body as string);

        if (provider === 'gemini') {
          expect(url).toBe(
            `${endpoint}${encodeURIComponent(expectedModel)}:generateContent?key=${encodeURIComponent(params.apiKey)}`
          );
          expect(body).toEqual({
            contents: [
              { role: 'user', parts: [{ text: params.messages[0].content }] },
              { role: 'model', parts: [{ text: params.messages[1].content }] },
              { role: 'user', parts: [{ text: params.messages[2].content }] },
            ],
            systemInstruction: {
              parts: [{ text: expect.stringContaining(params.catalogContext) }],
            },
            generationConfig: { temperature: 0.7 },
          });
        } else if (provider === 'claude') {
          expect(url).toBe(endpoint);
          expect(headers.get('x-api-key')).toBe(params.apiKey);
          expect(headers.get('anthropic-version')).toBe('2023-06-01');
          expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
          expect(body).toEqual({
            model: expectedModel,
            system: expect.stringContaining(params.catalogContext),
            messages: params.messages,
            max_tokens: 2048,
            temperature: 0.7,
          });
        } else {
          expect(url).toBe(endpoint);
          expect(headers.get('authorization')).toBe(`Bearer ${params.apiKey}`);
          expect(body).toEqual({
            model: expectedModel,
            messages: [
              { role: 'system', content: expect.stringContaining(params.catalogContext) },
              ...params.messages,
            ],
            temperature: 0.7,
          });
        }
      }
    );

    it('preserves HTTP error details returned by the transport', async () => {
      vi.mocked(capacitorFetch).mockResolvedValue(new Response('quota exhausted', { status: 429 }));

      await expect(executeDirectAiChat(params)).rejects.toThrow(
        `${label} HTTP 429: quota exhausted`
      );
      expect(capacitorFetch).toHaveBeenCalledTimes(1);
    });

    it('propagates transport failures without retrying with browser fetch', async () => {
      const error = new Error('Native device is offline');
      vi.mocked(capacitorFetch).mockRejectedValue(error);

      await expect(executeDirectAiChat(params)).rejects.toBe(error);
      expect(capacitorFetch).toHaveBeenCalledTimes(1);
    });

    it('rejects malformed JSON returned through the transport', async () => {
      vi.mocked(capacitorFetch).mockResolvedValue(new Response('not JSON'));

      await expect(executeDirectAiChat(params)).rejects.toBeInstanceOf(SyntaxError);
    });

    it('retains the provider behavior when the response contains no answer', async () => {
      vi.mocked(capacitorFetch).mockResolvedValue(new Response('{}'));

      if (provider === 'gemini') {
        await expect(executeDirectAiChat(params)).rejects.toThrow('Gemini returned empty response');
      } else {
        await expect(executeDirectAiChat(params)).resolves.toBe('');
      }
    });
  });
});
