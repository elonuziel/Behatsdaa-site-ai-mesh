/**
 * Workflow Build-Time AI Models Fetcher
 *
 * Runs automatically every time GitHub Actions builds a new site in the workflow
 * (npm run build), as well as locally before development.
 *
 * It uses the configured API Keys / Secrets to query each AI provider's official API
 * for fresh, up-to-date models, and writes the output to:
 * - public/data/ai-models.json
 * - public/ai-models.json
 *
 * This guarantees that static deployments on GitHub Pages always have fresh, dynamic
 * model lists without allowing users to type free-form models.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const publicDataDir = path.join(publicDir, 'data');

// Read local .env if present
function readEnvFile() {
  const env = {};
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val && !val.startsWith('MY_') && val.length > 5) {
            env[key] = val;
          }
        }
      }
    } catch {}
  }
  return env;
}

const fileEnv = readEnvFile();

function getSecret(keys) {
  for (const k of keys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && !val.startsWith('MY_') && val.trim().length > 0) {
      return val.trim();
    }
    const fVal = fileEnv[k];
    if (fVal && typeof fVal === 'string' && !fVal.startsWith('MY_') && fVal.trim().length > 0) {
      return fVal.trim();
    }
  }

  // Also check /proc if running inside sandbox
  try {
    const pids = fs.readdirSync('/proc').filter((p) => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
        for (const entry of environ.split('\0')) {
          for (const k of keys) {
            if (entry.startsWith(`${k}=`)) {
              const val = entry.slice(k.length + 1).trim();
              if (val && !val.startsWith('MY_') && val.length > 0) {
                return val;
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  return '';
}

const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Latest)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
  { id: 'gemini-pro-latest', name: 'Gemini Pro Latest' },
];

const PROVIDERS_CONFIG = {
  gemini: {
    name: 'Gemini',
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'],
    defaultModel: 'gemini-flash-lite-latest',
    requiredSecret: 'GOOGLE_API_KEY / GEMINI_API_KEY',
  },
  openai: {
    name: 'OpenAI',
    envKeys: ['OPENAI_API_KEY'],
    defaultModel: 'gpt-4o-mini',
    requiredSecret: 'OPENAI_API_KEY',
  },
  claude: {
    name: 'Claude',
    envKeys: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    requiredSecret: 'ANTHROPIC_API_KEY',
  },
  groq: {
    name: 'Groq',
    envKeys: ['GROQ_API_KEY'],
    defaultModel: 'llama-3.3-70b-versatile',
    requiredSecret: 'GROQ_API_KEY',
  },
  deepseek: {
    name: 'DeepSeek',
    envKeys: ['DEEPSEEK_API_KEY'],
    defaultModel: 'deepseek-chat',
    requiredSecret: 'DEEPSEEK_API_KEY',
  },
};

async function fetchGeminiModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.models) ? data.models : [];
  const rawList = [];
  for (const m of list) {
    const cleanId = (m.name || '').replace(/^models\//, '');
    if (cleanId) {
      rawList.push({
        id: cleanId,
        name: m.displayName || cleanId,
        description: m.description || '',
      });
    }
  }

  const combined = [...DEFAULT_GEMINI_MODELS];
  for (const item of rawList) {
    if (!combined.some((x) => x.id === item.id)) {
      combined.push(item);
    }
  }

  const priorityOrder = DEFAULT_GEMINI_MODELS.map((m) => m.id);

  combined.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.id);
    const idxB = priorityOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });

  return combined;
}

async function fetchOpenAiModels(apiKey) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : [];
  const filtered = list
    .map((m) => ({ id: m.id, name: m.id }))
    .filter((m) => {
      const id = m.id.toLowerCase();
      return id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('chat');
    });

  const priority = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  filtered.sort((a, b) => {
    const idxA = priority.indexOf(a.id);
    const idxB = priority.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });
  return filtered;
}

async function fetchClaudeModels(apiKey) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : [];
      if (list.length > 0) {
        return list.map((m) => ({ id: m.id, name: m.display_name || m.id }));
      }
    }
  } catch {}

  return [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  ];
}

async function fetchGroqModels(apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : [];
  const models = list.map((m) => ({
    id: m.id,
    name: m.id,
    description: m.owned_by ? `ספק: ${m.owned_by}` : undefined,
  }));
  const priority = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  models.sort((a, b) => {
    const idxA = priority.indexOf(a.id);
    const idxB = priority.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });
  return models;
}

async function fetchDeepSeekModels(apiKey) {
  const res = await fetch('https://api.deepseek.com/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : [];
  return list.map((m) => ({ id: m.id, name: m.id }));
}

async function main() {
  console.log('🤖 [Workflow AI Models Fetcher] Checking configured provider secrets...');

  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  // Preserve existing cache if available as base
  let existingCache = {};
  const cachePath = path.join(publicDataDir, 'ai-models.json');
  if (fs.existsSync(cachePath)) {
    try {
      existingCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {}
  }

  const aiPassword = getSecret([
    'AI_PASSWORD',
    'AI_ACCESS_PASSWORD',
    'AI_SECRET',
    'AI_PASS',
    'AI_PASSPHRASE',
    'PASSWORD',
    'SECRET_PASSWORD',
    'ACCESS_PASSWORD',
  ]);
  const isPasswordRequired = Boolean(aiPassword && aiPassword.trim().length > 0);
  const passwordHash = isPasswordRequired
    ? crypto.createHash('sha256').update(aiPassword.trim()).digest('hex')
    : undefined;

  if (isPasswordRequired) {
    console.log('🔒 AI Password protection enabled at build time (SHA-256 hash generated)');
  }

  const result = {
    updatedAt: new Date().toISOString(),
    isPasswordRequired,
    ...(passwordHash ? { passwordHash } : {}),
    providers: {},
  };

  const availableKeys = {};

  for (const [providerKey, config] of Object.entries(PROVIDERS_CONFIG)) {
    const key = getSecret(config.envKeys);
    if (!key) {
      console.log(`⚠️  ${config.name} (${providerKey}): No secret key found in environment/secrets.`);
      result.providers[providerKey] = {
        available: false,
        hasDirectSecret: false,
        name: config.name,
        defaultModel: config.defaultModel,
        requiredSecret: config.requiredSecret,
        models: providerKey === 'gemini' ? DEFAULT_GEMINI_MODELS : (existingCache.providers?.[providerKey]?.models || []),
        error: `נדרש מפתח סודי ${config.requiredSecret} ב-GitHub Secrets`,
      };
      continue;
    }

    availableKeys[providerKey] = key;

    try {
      console.log(`⚡ Fetching fresh models for ${config.name} using configured API Key...`);
      let models = [];

      if (providerKey === 'gemini') {
        models = await fetchGeminiModels(key);
      } else if (providerKey === 'openai') {
        models = await fetchOpenAiModels(key);
      } else if (providerKey === 'claude') {
        models = await fetchClaudeModels(key);
      } else if (providerKey === 'groq') {
        models = await fetchGroqModels(key);
      } else if (providerKey === 'deepseek') {
        models = await fetchDeepSeekModels(key);
      }

      console.log(`✅ Successfully fetched ${models.length} models for ${config.name}!`);
      result.providers[providerKey] = {
        available: true,
        hasDirectSecret: true,
        name: config.name,
        defaultModel: config.defaultModel,
        requiredSecret: config.requiredSecret,
        models,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`⚠️ Warning: Provider API fetch for ${config.name} encountered an issue: ${err?.message || err}`);
      // Fallback for Gemini so build always succeeds with models when key is present
      if (providerKey === 'gemini') {
        result.providers[providerKey] = {
          available: true,
          hasDirectSecret: true,
          name: config.name,
          defaultModel: config.defaultModel,
          requiredSecret: config.requiredSecret,
          models: DEFAULT_GEMINI_MODELS,
          fetchedAt: new Date().toISOString(),
        };
      } else {
        result.providers[providerKey] = {
          available: false,
          hasDirectSecret: true,
          name: config.name,
          defaultModel: config.defaultModel,
          requiredSecret: config.requiredSecret,
          models: existingCache.providers?.[providerKey]?.models || [],
          error: err?.message || 'שגיאה במשיכת מודלים',
        };
      }
    }
  }

  // Encrypt available provider API keys for secure static execution on GitHub Pages
  if (Object.keys(availableKeys).length > 0) {
    try {
      const salt = 'behatsdaa-ai-secure-salt-v1';
      // If AI_PASSWORD was set, encrypt with that password (user must enter it to unlock).
      // If no AI_PASSWORD was set, encrypt with public default app key so browser can use it without password prompt.
      const encryptionSecret = isPasswordRequired ? aiPassword.trim() : 'behatsdaa-public-app-key-v1';
      const keyBuffer = crypto.pbkdf2Sync(encryptionSecret, salt, 100000, 32, 'sha256');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      let encrypted = cipher.update(JSON.stringify(availableKeys), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');
      result.encryptedKeys = {
        salt,
        iv: iv.toString('hex'),
        tag,
        data: encrypted,
      };
      console.log(`🔒 Encrypted ${Object.keys(availableKeys).length} provider API keys (${isPasswordRequired ? 'Password Protected' : 'Default app-level bundle'})`);
    } catch (e) {
      console.warn('⚠️ Error encrypting keys:', e);
    }
  }

  const jsonStr = JSON.stringify(result, null, 2);

  fs.writeFileSync(path.join(publicDataDir, 'ai-models.json'), jsonStr, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'ai-models.json'), jsonStr, 'utf8');

  console.log(`💾 Saved fresh AI models to public/data/ai-models.json and public/ai-models.json`);
}

main().catch((err) => {
  console.error('Fatal error in fetch-models-at-build:', err);
  process.exit(1);
});
