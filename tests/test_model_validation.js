import assert from 'assert';

console.log('====================================================');
console.log('   Running Model Parameter Validation Security Tests ');
console.log('====================================================\n');

const ALLOWED_MODELS = new Set([
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);

function validateAndBuildCandidates(requestedModelInput) {
  const requestedModel = (typeof requestedModelInput === 'string' && ALLOWED_MODELS.has(requestedModelInput))
    ? requestedModelInput
    : 'gemini-3.1-flash-lite';

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    requestedModel,
    'gemini-3.8-flash'
  ].filter((v, i, a) => a.indexOf(v) === i && ALLOWED_MODELS.has(v));

  return { requestedModel, candidateModels };
}

// Test 1: Permitted valid model name
console.log('[Test 1] Testing valid allowed model input...');
const res1 = validateAndBuildCandidates('gemini-1.5-pro');
assert.strictEqual(res1.requestedModel, 'gemini-1.5-pro');
assert.ok(res1.candidateModels.includes('gemini-1.5-pro'));
console.log('  -> PASS (Valid model accepted)');

// Test 2: Unallowed/unknown model name injection
console.log('[Test 2] Testing unknown model parameter input...');
const res2 = validateAndBuildCandidates('malicious-custom-model-v999');
assert.strictEqual(res2.requestedModel, 'gemini-3.1-flash-lite');
assert.ok(!res2.candidateModels.includes('malicious-custom-model-v999'));
console.log('  -> PASS (Unknown model sanitized to fallback default)');

// Test 3: Non-string input (object/array injection)
console.log('[Test 3] Testing non-string model input...');
const res3 = validateAndBuildCandidates({ model: 'exploit' });
assert.strictEqual(res3.requestedModel, 'gemini-3.1-flash-lite');
assert.ok(!res3.candidateModels.includes('[object Object]'));
console.log('  -> PASS (Non-string model input sanitized)');

// Test 4: Verify all candidates in result are strictly whitelisted
console.log('[Test 4] Verifying all candidate models are in whitelist...');
for (const m of res1.candidateModels) {
  assert.ok(ALLOWED_MODELS.has(m), 'Model must be in ALLOWED_MODELS');
}
console.log('  -> PASS (All candidates strictly whitelisted)');

console.log('\n====================================================');
console.log('   ALL SECURITY MODEL VALIDATION TESTS PASSED!      ');
console.log('====================================================\n');
