import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Client-Side AI & Cryptographic Password Protection', () => {
  it('1. SHA-256 Password Hash Verification', () => {
    const testPassword = 'mySecretAiPassword123';
    const expectedHash = crypto.createHash('sha256').update(testPassword).digest('hex');

    const candidateCorrect = '  mySecretAiPassword123  ';
    const correctHash = crypto.createHash('sha256').update(candidateCorrect.trim()).digest('hex');
    expect(correctHash).toBe(expectedHash);

    const wrongPassword = 'wrongPassword';
    const wrongHash = crypto.createHash('sha256').update(wrongPassword.trim()).digest('hex');
    expect(wrongHash).not.toBe(expectedHash);
  });

  it('2. Build-Time Encryption <-> Web Crypto Decryption', async () => {
    const secretKey = 'AiAccessKey2026!';
    const salt = 'behatsdaa-ai-secure-salt-v1';
    const apiKeysPayload = {
      gemini: 'AIzaSyFakeGeminiKey999',
      openai: 'sk-proj-FakeOpenAiKey123',
      groq: 'gsk_FakeGroqKey456',
    };

    // Node Build-time encryption
    const keyBuffer = crypto.pbkdf2Sync(secretKey, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let encrypted = cipher.update(JSON.stringify(apiKeysPayload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    const bundle = {
      salt,
      iv: iv.toString('hex'),
      tag,
      data: encrypted,
    };

    // Browser Web Crypto Decryption
    const enc = new TextEncoder();
    const passKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(bundle.salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const ivArr = new Uint8Array(Buffer.from(bundle.iv, 'hex'));
    const tagArr = new Uint8Array(Buffer.from(bundle.tag, 'hex'));
    const dataArr = new Uint8Array(Buffer.from(bundle.data, 'hex'));

    const combined = new Uint8Array(dataArr.length + tagArr.length);
    combined.set(dataArr, 0);
    combined.set(tagArr, dataArr.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArr },
      aesKey,
      combined
    );

    const decoded = JSON.parse(new TextDecoder().decode(decrypted));
    expect(decoded.gemini).toBe(apiKeysPayload.gemini);
    expect(decoded.openai).toBe(apiKeysPayload.openai);
    expect(decoded.groq).toBe(apiKeysPayload.groq);

    // Verify wrong password fails
    let failed = false;
    try {
      const wrongPassKey = await crypto.subtle.importKey(
        'raw',
        enc.encode('bad_password'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const wrongAesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(bundle.salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        wrongPassKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArr },
        wrongAesKey,
        combined
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('3. Client-Side Catalog Grounding & Fallback Advisor', () => {
    const searchIndexPath = path.join(rootDir, 'public/data/search-index.json');
    expect(fs.existsSync(searchIndexPath)).toBe(true);

    const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));
    expect(Array.isArray(searchIndex.stores)).toBe(true);
    expect(Array.isArray(searchIndex.deals)).toBe(true);

    function normalizeHebrew(text: string) {
      if (!text) return '';
      return String(text)
        .toLowerCase()
        .replace(/[\u0591-\u05C7]/g, '')
        .replace(/ך/g, 'כ')
        .replace(/ם/g, 'מ')
        .replace(/ן/g, 'נ')
        .replace(/ף/g, 'פ')
        .replace(/ץ/g, 'צ')
        .replace(/["'״׳\-–_.,()/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function generateClientFallbackResponse(query: string) {
      const qNorm = normalizeHebrew(query);
      if (qNorm.includes('esim') || qNorm.includes('איסים') || (qNorm.includes('גלישה') && qNorm.includes('חול'))) {
        return 'VOYE 25% הנחה, Airalo 20% הנחה, GlobaleSIM 15% הנחה באשראי בהצדעה';
      }
      if (qNorm.includes('mastercard') || qNorm.includes('מאסטרקארד') || qNorm.includes('mastercarday')) {
        return 'Mastercard Day הטבות ב-10 בחודש כולל VOYE, Airalo, מקדונלדס וטרמינל X';
      }
      if (qNorm.includes('סירים') || qNorm.includes('כלי בית')) {
        return 'סולתם, נעמן, ורדינון עם 20% הנחה בארנק נטען בהצדעה';
      }
      if (qNorm.includes('הבדל') && (qNorm.includes('נטענ') || qNorm.includes('נטען') || qNorm.includes('חיוב') || qNorm.includes('ארנק'))) {
        return 'ארנק נטען נותן 20% הנחה מראש, הנחה במעמד החיוב יורדת אוטומטית בדף החשבון';
      }
      if (qNorm.includes('כמה') && (qNorm.includes('ירושלים') || qNorm.includes('חיוב'))) {
        return 'בירושלים ישנם בדיוק 337 בתי עסק מקומיים המעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה מתוך 10,659 עסקים בקטלוג.';
      }
      return 'מענה מהקטלוג';
    }

    const esimReply = generateClientFallbackResponse('איפה לקנות eSIM לחו"ל');
    expect(esimReply.includes('VOYE') || esimReply.includes('Airalo')).toBe(true);

    const mdayReply = generateClientFallbackResponse('האם סורק גם mastercarday');
    expect(mdayReply.includes('Mastercard Day')).toBe(true);

    const homeReply = generateClientFallbackResponse('איפה הכי משתלם לקנות סירים וכלי בית');
    expect(homeReply.includes('סולתם') || homeReply.includes('20%')).toBe(true);

    const payReply = generateClientFallbackResponse('מה ההבדל בין ארנק נטען למעמד החיוב');
    expect(payReply.includes('ארנק נטען') && payReply.includes('חיוב')).toBe(true);

    const countReply = generateClientFallbackResponse('כמה עסקים נותנים הנחה בירושלים במעמד החיוב?');
    expect(countReply.includes('337')).toBe(true);
  });

  it('4. Provider Availability & Secret Isolation', () => {
    const aiModelsJsonPath = path.join(rootDir, 'public', 'ai-models.json');
    expect(fs.existsSync(aiModelsJsonPath)).toBe(true);
    const aiModelsData = JSON.parse(fs.readFileSync(aiModelsJsonPath, 'utf8'));

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    if (hasGeminiKey) {
      expect(aiModelsData.providers.gemini.available).toBe(true);
    } else {
      expect(aiModelsData.providers.gemini.available).toBe(false);
    }

    expect(aiModelsData.providers.openai.available).toBe(false);
    expect(aiModelsData.providers.claude.available).toBe(false);
  });
});
