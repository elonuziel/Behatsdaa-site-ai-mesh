/**
 * Regression checks for the checked-in, credential-free AI manifest.
 * Run directly with: node tests/test_ai_models_manifest.js
 * No build step: regenerating the manifest would replace the artifact under test.
 * Assertions deliberately use the file's contents, not the caller's environment.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (relativePath) => JSON.parse(
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')
);
const manifest = readJson('../public/ai-models.json');

function assertIsoTimestamp(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(Number.isFinite(Date.parse(value)), `${label} must be a valid date`);
  assert.equal(new Date(value).toISOString(), value, `${label} must be canonical UTC ISO-8601`);
}

console.log('🧪 Testing the checked-in AI manifest...');

// Disabling the password gate must also remove its obsolete authentication data.
assert.equal(manifest.isPasswordRequired, false, 'The public manifest must not require a password');
for (const field of ['passwordHash', 'encryptedKeys']) {
  assert.equal(Object.hasOwn(manifest, field), false, `The public manifest must omit ${field}, even if null`);
}
assertIsoTimestamp(manifest.updatedAt, 'AI manifest updatedAt');

// Check both providers changed by this PR independently, so a stale success flag
// or discovery timestamp cannot silently survive the removal of credentials.
const changedProviders = [
  { id: 'gemini', name: 'Gemini', secrets: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'] },
  { id: 'groq', name: 'Groq', secrets: ['GROQ_API_KEY'] },
];

for (const { id, name, secrets } of changedProviders) {
  const provider = manifest.providers[id];
  assert.ok(provider, `${name} must remain present so its configuration error can be displayed`);
  assert.equal(provider.name, name, `${id} must retain its display name`);
  assert.equal(provider.available, false, `${name} must be unavailable without credentials`);
  assert.equal(provider.hasDirectSecret, false, `${name} must not claim a direct secret`);
  assert.equal(Object.hasOwn(provider, 'fetchedAt'), false, `${name} must not claim successful API discovery`);
  assert.equal(typeof provider.error, 'string', `${name} must explain why it is unavailable`);
  assert.ok(provider.error.includes('נדרש מפתח סודי'), `${name} must explain that a secret is required`);
  assert.equal(typeof provider.requiredSecret, 'string', `${name} must identify its required secret`);
  for (const secret of secrets) {
    assert.ok(provider.requiredSecret.includes(secret), `${name} must document ${secret}`);
    assert.ok(provider.error.includes(secret), `${name}'s error must identify ${secret}`);
  }
  assert.ok(provider.error.includes('GitHub Secrets'), `${name} must explain where to configure credentials`);
  assert.ok(Array.isArray(provider.models), `${name} must expose a model array even when unavailable`);
}

// Gemini keeps selectable fallback models even without successful API discovery.
const gemini = manifest.providers.gemini;
assert.equal(gemini.defaultModel, 'gemini-flash-lite-latest', 'Gemini must retain its default fallback');
assert.ok(gemini.models.length > 0, 'Gemini must keep its fallback model list');
assert.ok(
  gemini.models.some(model => model.id === gemini.defaultModel),
  'The Gemini default must be selectable from the fallback list'
);
const modelIds = new Set();
for (const model of gemini.models) {
  assert.equal(typeof model.id, 'string', 'Each fallback model must have a string ID');
  assert.ok(model.id.trim().length > 0, 'Fallback model IDs must not be blank');
  assert.equal(model.id, model.id.trim(), 'Fallback model IDs must not contain surrounding whitespace');
  assert.equal(typeof model.name, 'string', `${model.id} must have a display name`);
  assert.ok(model.name.trim().length > 0, `${model.id} must have a nonblank display name`);
  assert.equal(modelIds.has(model.id), false, `${model.id} must not appear twice in the selector`);
  modelIds.add(model.id);
}

// Groq's configured default is metadata, not evidence of a discovered model.
const groq = manifest.providers.groq;
assert.equal(groq.defaultModel, 'llama-3.3-70b-versatile', 'Groq must retain its configured default');
assert.deepEqual(groq.models, [], 'Groq must not retain stale model options without credentials');

// The other JSON changes in this PR refresh catalog timestamps only. Avoid
// pinning exact dates or catalog contents so routine regeneration remains valid.
for (const dataset of ['stores', 'deals']) {
  const catalog = readJson(`../data/${dataset}.json`);
  assertIsoTimestamp(catalog.metadata.last_updated, `${dataset} metadata.last_updated`);
}

console.log('🎉 AI manifest and refreshed catalog timestamp checks passed!');
