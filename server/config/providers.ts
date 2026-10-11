import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export interface ProviderDefinition {
  id: string;
  name: string;
  envKeys: string[];
  defaultModel: string;
  baseUrl?: string;
}

export const DIRECT_AI_PROVIDERS: Record<string, ProviderDefinition> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    envKeys: ['OPENAI_API_KEY'],
    defaultModel: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    envKeys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    defaultModel: 'gemini-flash-lite-latest',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    envKeys: ['ANTHROPIC_API_KEY'],
    defaultModel: 'claude-3-5-sonnet',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    envKeys: ['GROQ_API_KEY'],
    defaultModel: 'llama-3.3-70b',
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    envKeys: ['DEEPSEEK_API_KEY'],
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
  },
};

export function readEnvSecrets(): Record<string, string> {
  const result: Record<string, string> = {};

  // Copy valid environment variables (skipping MY_ placeholders)
  for (const [k, v] of Object.entries(process.env)) {
    if (v && !v.startsWith('MY_') && v.length >= 2) {
      result[k] = v;
    }
  }

  try {
    const envPath = path.resolve(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val && !val.startsWith('MY_') && val.length >= 2) {
            result[key] = val;
          }
        }
      }
    }
  } catch {}

  return result;
}

export function getAiPassword(env: Record<string, string>): string {
  const candidateKeys = ['AI_PASSWORD', 'AI_ACCESS_PASSWORD', 'AI_SECRET', 'VITE_AI_PASSWORD'];
  for (const k of candidateKeys) {
    const val = env[k];
    if (val && typeof val === 'string' && !val.startsWith('MY_') && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

export function getProviderKey(providerId: string, env: Record<string, string>): string {
  const def = DIRECT_AI_PROVIDERS[providerId];
  if (!def) return '';
  for (const k of def.envKeys) {
    const val = env[k];
    if (val && !val.startsWith('MY_') && val.length > 8) {
      return val;
    }
  }
  return '';
}
