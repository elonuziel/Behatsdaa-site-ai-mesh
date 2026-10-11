import { describe, it, expect } from 'vitest';

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

function validateAndBuildCandidates(requestedModelInput: unknown) {
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

describe('Model Parameter Validation Security Tests', () => {
  it('accepts valid allowed model input', () => {
    const res1 = validateAndBuildCandidates('gemini-1.5-pro');
    expect(res1.requestedModel).toBe('gemini-1.5-pro');
    expect(res1.candidateModels).toContain('gemini-1.5-pro');
  });

  it('sanitizes unallowed/unknown model names to fallback default', () => {
    const res2 = validateAndBuildCandidates('malicious-custom-model-v999');
    expect(res2.requestedModel).toBe('gemini-3.1-flash-lite');
    expect(res2.candidateModels).not.toContain('malicious-custom-model-v999');
  });

  it('sanitizes non-string model input', () => {
    const res3 = validateAndBuildCandidates({ model: 'exploit' });
    expect(res3.requestedModel).toBe('gemini-3.1-flash-lite');
    expect(res3.candidateModels).not.toContain('[object Object]');
  });

  it('strictly whitelists all candidate models', () => {
    const res = validateAndBuildCandidates('gemini-1.5-pro');
    for (const m of res.candidateModels) {
      expect(ALLOWED_MODELS.has(m)).toBe(true);
    }
  });
});
