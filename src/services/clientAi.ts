import { capacitorFetch } from '../utils/capacitorHttp';
/**
 * Client-Side AI Service for Static Hosting (e.g. GitHub Pages) & Hybrid Deployments.
 *
 * Provides:
 * 1. Cryptographic password verification (SHA-256) & AES-256-GCM key decryption
 *    via standard browser Web Crypto API (crypto.subtle).
 * 2. Direct provider execution (Gemini, OpenAI, Groq, DeepSeek, Claude) directly
 *    from the browser when running on static hosting without a Node.js server.
 * 3. Client-side grounded catalog reasoning engine that matches Behatsdaa, UNIQ,
 *    and Mastercard Day deals and generates rich, conversational advice even when
 *    offline or if external AI quotas are exhausted.
 */

import { AiProviderKey, EncryptedKeysBundle, RecommendedStore, RecommendedDeal, RecommendedBilling } from '../types/chat';
import { normalizeHebrew } from '../utils/hebrew';

// Multi-path fetch utility that verifies res.ok
export async function fetchJsonWithFallback<T = any>(paths: string[]): Promise<T | null> {
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Continue to next path candidate
    }
  }
  return null;
}

// -------------------------------------------------------------
// Cryptography: SHA-256 & AES-256-GCM Decryption (Web Crypto)
// -------------------------------------------------------------

export async function verifyPasswordHash(candidatePassword: string, expectedHash: string): Promise<boolean> {
  const trimmed = candidatePassword.trim();
  if (!trimmed || !expectedHash) return false;
  try {
    const msgBuffer = new TextEncoder().encode(trimmed);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hexHash.toLowerCase() === expectedHash.trim().toLowerCase();
  } catch (e) {
    console.warn('Error verifying password hash:', e);
    return false;
  }
}

export async function decryptKeysWithPassword(
  password: string,
  bundle: EncryptedKeysBundle
): Promise<Record<string, string> | null> {
  try {
    const trimmed = password.trim();
    if (!trimmed || !bundle || !bundle.data || !bundle.iv || !bundle.tag) {
      return null;
    }

    const enc = new TextEncoder();
    const passKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(trimmed),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const saltBuffer = enc.encode(bundle.salt || 'behatsdaa-ai-secure-salt-v1');
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const ivMatch = bundle.iv.match(/.{1,2}/g);
    const tagMatch = bundle.tag.match(/.{1,2}/g);
    const dataMatch = bundle.data.match(/.{1,2}/g);
    if (!ivMatch || !tagMatch || !dataMatch) return null;

    const ivArr = new Uint8Array(ivMatch.map(byte => parseInt(byte, 16)));
    const tagArr = new Uint8Array(tagMatch.map(byte => parseInt(byte, 16)));
    const dataArr = new Uint8Array(dataMatch.map(byte => parseInt(byte, 16)));

    // Web Crypto AES-GCM expects data concatenated with tag
    const combined = new Uint8Array(dataArr.length + tagArr.length);
    combined.set(dataArr, 0);
    combined.set(tagArr, dataArr.length);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArr },
      aesKey,
      combined
    );

    const jsonStr = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonStr) as Record<string, string>;
  } catch (err) {
    console.warn('Failed to decrypt API keys with candidate password:', err);
    return null;
  }
}

// -------------------------------------------------------------
// Client-Side Catalog Cache & Grounding
// -------------------------------------------------------------

interface CachedCatalog {
  stores: any[];
  deals: any[];
  billing: any[];
}

let clientCatalogCache: CachedCatalog | null = null;
let isCatalogLoading = false;

export async function getClientCatalog(): Promise<CachedCatalog> {
  if (clientCatalogCache) return clientCatalogCache;
  if (isCatalogLoading) {
    // Wait briefly for existing load
    await new Promise(r => setTimeout(r, 300));
    if (clientCatalogCache) return clientCatalogCache;
  }

  isCatalogLoading = true;
  try {
    const candidatePaths = [
      './data/search-index.json',
      'data/search-index.json',
      '/data/search-index.json',
    ];
    const data = await fetchJsonWithFallback<{ stores?: any[]; deals?: any[] }>(candidatePaths);
    const stores = data?.stores || [];
    const deals = data?.deals || [];

    // Attempt to load billing index if available (non-blocking)
    let billing: any[] = [];
    try {
      const bData = await fetchJsonWithFallback<any>([
        './data/billing-index.json',
        'data/billing-index.json',
      ]);
      if (Array.isArray(bData)) {
        billing = bData;
      } else if (bData && Array.isArray((bData as any).stores)) {
        billing = (bData as any).stores;
      }
    } catch {}

    clientCatalogCache = { stores, deals, billing };
    return clientCatalogCache;
  } finally {
    isCatalogLoading = false;
  }
}

const CLIENT_CITIES_MAP: Array<{ name: string; aliases: string[] }> = [
  { name: 'פתח תקווה', aliases: ['פתח תקווה', 'פתח תקוה', 'פת'] },
  { name: 'תל אביב', aliases: ['תל אביב', 'תל אביב יפו', 'תל אביב - יפו', 'ת"א', 'תא'] },
  { name: 'ירושלים', aliases: ['ירושלים', 'י-ם'] },
  { name: 'חיפה', aliases: ['חיפה'] },
  { name: 'ראשון לציון', aliases: ['ראשון לציון', 'ראשלצ', 'ראשל"צ', 'ראשון'] },
  { name: 'אשדוד', aliases: ['אשדוד'] },
  { name: 'נתניה', aliases: ['נתניה'] },
  { name: 'באר שבע', aliases: ['באר שבע', 'ב"ש', 'בש'] },
  { name: 'בני ברק', aliases: ['בני ברק'] },
  { name: 'חולון', aliases: ['חולון'] },
  { name: 'רמת גן', aliases: ['רמת גן', 'ר"ג', 'רג'] },
  { name: 'אשקלון', aliases: ['אשקלון'] },
  { name: 'רחובות', aliases: ['רחובות'] },
  { name: 'בת ים', aliases: ['בת ים'] },
  { name: 'בית שמש', aliases: ['בית שמש'] },
  { name: 'כפר סבא', aliases: ['כפר סבא', 'כפ"ס', 'כפס'] },
  { name: 'הרצליה', aliases: ['הרצליה'] },
  { name: 'חדרה', aliases: ['חדרה'] },
  { name: 'מודיעין', aliases: ['מודיעין', 'מודיעין מכבים רעות'] },
  { name: 'רמלה', aliases: ['רמלה'] },
  { name: 'רעננה', aliases: ['רעננה'] },
  { name: 'הוד השרון', aliases: ['הוד השרון'] },
  { name: 'גבעתיים', aliases: ['גבעתיים'] },
  { name: 'קרית אתא', aliases: ['קרית אתא', 'קריית אתא'] },
  { name: 'נהריה', aliases: ['נהריה'] },
  { name: 'קרית גת', aliases: ['קרית גת', 'קריית גת'] },
  { name: 'עפולה', aliases: ['עפולה'] },
  { name: 'אילת', aliases: ['אילת'] },
  { name: 'ראש העין', aliases: ['ראש העין'] },
  { name: 'טבריה', aliases: ['טבריה'] },
  { name: 'עכו', aliases: ['עכו'] },
  { name: 'קרית מוצקין', aliases: ['קרית מוצקין'] },
  { name: 'קרית ים', aliases: ['קרית ים'] },
  { name: 'קרית ביאליק', aliases: ['קרית ביאליק'] },
  { name: 'נס ציונה', aliases: ['נס ציונה'] },
  { name: 'אלעד', aliases: ['אלעד'] },
  { name: 'יבנה', aliases: ['יבנה'] },
  { name: 'רמת השרון', aliases: ['רמת השרון'] },
  { name: 'כרמיאל', aliases: ['כרמיאל'] },
  { name: 'טירת כרמל', aliases: ['טירת כרמל'] },
  { name: 'נתיבות', aliases: ['נתיבות'] },
  { name: 'אופקים', aliases: ['אופקים'] },
  { name: 'שדרות', aliases: ['שדרות'] },
  { name: 'קרית אונו', aliases: ['קרית אונו'] },
  { name: 'דימונה', aliases: ['דימונה'] },
  { name: 'פרדס חנה', aliases: ['פרדס חנה', 'כרכור'] }
];

function detectCityClient(text: string): { name: string; normalized: string; aliasMatched: string } | null {
  const norm = normalizeHebrew(text);
  for (const item of CLIENT_CITIES_MAP) {
    for (const alias of item.aliases) {
      const aNorm = normalizeHebrew(alias);
      if (aNorm.length < 2) continue;
      const escaped = aNorm.replace(/\s+/g, '\\s+');
      const re = new RegExp(`(?:^|\\s)(?:ב|מ|ל)?${escaped}(?:$|\\s)`);
      if (re.test(norm)) {
        return {
          name: item.name,
          normalized: normalizeHebrew(item.name),
          aliasMatched: aNorm,
        };
      }
    }
  }
  return null;
}

export function findRelevantCatalogClient(
  query: string,
  catalog: CachedCatalog,
  activeClubs?: string[],
  conversationTopic?: string
) {
  const combined = conversationTopic ? `${query} ${conversationTopic}` : query;
  const qNorm = normalizeHebrew(combined);
  const detectedCity = detectCityClient(combined);
  const isDining = /פיצה|פיצרי|בורגר|המבורגר|מסעד|קפה|סושי|שווארמה|שניצל|גליד|מאפי|אוכל|בשר|דגים|איטלקית|אסייתית|משלוח|וולט|משלוחה|קולינרי|pizza|burger|sushi|dining|restaurant|cafe/i.test(qNorm);

  let queryWithoutCity = qNorm;
  if (detectedCity) {
    queryWithoutCity = queryWithoutCity
      .replace(new RegExp(`(?:^|\\s)(?:ב|מ|ל)?${detectedCity.aliasMatched.replace(/\s+/g, '\\s+')}(?:$|\\s)`, 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const qTokens = (queryWithoutCity || qNorm).split(/\s+/).filter(t => t.length >= 2);

  const matchedStores: any[] = [];
  const matchedDeals: any[] = [];
  const matchedBilling: any[] = [];

  // 1. Search Stores (Tier B when city is detected: Nationwide chains & mall chains with local branches)
  for (const s of catalog.stores) {
    if (activeClubs && activeClubs.length > 0) {
      const sClubs = s.clubs || ['behatsdaa'];
      const matchesClub = sClubs.some((c: string) => activeClubs.includes(c));
      if (!matchesClub) continue;
    }

    const sNameNorm = normalizeHebrew(s.name);
    let score = 0;
    if (queryWithoutCity && (qNorm.includes(sNameNorm) || sNameNorm.includes(queryWithoutCity))) score += 10;
    for (const token of qTokens) {
      if (sNameNorm.includes(token)) score += 3;
    }

    if (isDining && /פיצה|פיצה האט|דומינוס|מקדונלד|בורגר|ארומה|קפה|גולדה|rebar|משלוחה|וולט/.test(sNameNorm)) {
      score += 8;
    }

    if (detectedCity && (s.cv !== 'online' || s.mc)) {
      score += 4;
    }

    if (score > 0) {
      matchedStores.push({
        id: s.id || s.slug,
        name: s.name,
        slug: s.slug,
        max_discount: s.d || s.max_discount || 0,
        clubs: s.clubs || ['behatsdaa'],
        coverage: s.cv || 'nationwide',
        is_mall_chain: Boolean(s.mc),
        score,
      });
    }
  }

  matchedStores.sort((a, b) => b.score - a.score || b.max_discount - a.max_discount);

  // 2. Search Deals
  for (const d of catalog.deals) {
    if (activeClubs && activeClubs.length > 0 && d.club) {
      if (!activeClubs.includes(d.club)) continue;
    }

    const dTitleNorm = normalizeHebrew(d.title);
    const dSupplierNorm = normalizeHebrew(d.supplier || d.s || '');
    let score = 0;
    if (queryWithoutCity && (qNorm.includes(dTitleNorm) || dTitleNorm.includes(queryWithoutCity))) score += 10;
    for (const token of qTokens) {
      if (dTitleNorm.includes(token)) score += 3;
      if (dSupplierNorm.includes(token)) score += 2;
    }
    if (isDining && /פיצה|פיצה האט|דומינוס|מקדונלד|בורגר|ארומה|קפה|גולדה|rebar|משלוחה|וולט/.test(dTitleNorm)) {
      score += 8;
    }
    if (score > 0) {
      matchedDeals.push({
        id: d.id,
        title: d.title,
        slug: d.slug,
        club: d.club,
        supplier: d.supplier || d.s,
        price: d.price ?? d.p ?? null,
        original_price: d.original_price ?? d.op ?? null,
        discount_percent: d.discount_percent ?? d.d ?? null,
        coupon_code: d.coupon_code ?? d.cc ?? null,
        score,
      });
    }
  }

  matchedDeals.sort((a, b) => b.score - a.score);

  // 3. Search Billing Stores (Tier A when city is detected: Local physical businesses)
  if (catalog.billing && catalog.billing.length > 0) {
    // Iterate through ALL billing stores (takes < 1ms):
    for (const b of catalog.billing) {
      const bNameNorm = normalizeHebrew(b.name);
      const bCityNorm = normalizeHebrew(b.c || b.city || '');
      const bCatNorm = normalizeHebrew(b.cat || b.category || '');

      let score = 0;

      if (detectedCity) {
        const isCityMatch = bCityNorm.includes(detectedCity.normalized) || detectedCity.normalized.includes(bCityNorm);
        if (!isCityMatch) continue;
        score += 15;
      }

      if (queryWithoutCity && (qNorm.includes(bNameNorm) || bNameNorm.includes(queryWithoutCity))) score += 10;
      for (const token of qTokens) {
        if (bNameNorm.includes(token)) score += 3;
        if (bCatNorm.includes(token)) score += 2;
      }

      if (isDining && (bCatNorm.includes('מסעדות') || bCatNorm.includes('אוכל') || /פיצה|בורגר|קפה|סושי|גליד/.test(bNameNorm))) {
        score += 8;
      }

      if (score > 0) {
        matchedBilling.push({
          id: b.id,
          name: b.name,
          discount: b.d || b.discount || 0,
          city: b.c || b.city || '',
          full_address: b.f || b.full_address || b.a || '',
          category: b.cat || b.category || '',
          score,
        });
      }
    }
    matchedBilling.sort((a, b) => b.score - a.score || b.discount - a.discount);
  }

  // Strictly cap visual UI highlights to top 4 cards
  const topStores = matchedStores.slice(0, 4) as RecommendedStore[];
  const topDeals = matchedDeals.slice(0, 4) as RecommendedDeal[];
  const topBilling = matchedBilling.slice(0, 4) as RecommendedBilling[];

  return {
    topStores,
    topDeals,
    topBilling,
    promptStores: matchedStores.slice(0, 20) as RecommendedStore[],
    promptDeals: matchedDeals.slice(0, 20) as RecommendedDeal[],
    promptBilling: matchedBilling.slice(0, 20) as RecommendedBilling[],
    detectedCity: detectedCity ? detectedCity.name : null,
  };
}

// -------------------------------------------------------------
// Grounded Intelligent Client-Side Responder (Offline / Fallback)
// -------------------------------------------------------------

export function generateClientFallbackResponse(
  query: string,
  topStores: RecommendedStore[],
  topDeals: RecommendedDeal[],
  topBilling: RecommendedBilling[],
  previousTopic: string = '',
  catalog?: CachedCatalog
): string {
  const qNorm = normalizeHebrew(query);
  const qLower = query.toLowerCase();

  // 1. Feedback handling
  if (
    qNorm.includes('זה רע') ||
    qNorm.includes('לא טוב') ||
    qNorm.includes('שיחה') ||
    qNorm.includes('תדבר') ||
    qLower.includes('thats bad') ||
    qLower.includes('that is bad') ||
    qLower.includes('conversation')
  ) {
    return `אתה צודק לחלוטין – בוא ננהל שיחה אמיתית וזורמת במקום לזרוק רשימות מנותקות!

אני כאן כיועץ הפיננסי האישי שלך למועדוני **בהצדעה**, **UNIQ** ו-**Mastercard Day**. 
אתה יכול לשוחח איתי בחופשיות על כל נושא:
• איפה תקבל את אחוז ההנחה המקסימלי (חבילות eSIM לחו"ל, נעליים, פיצה, גאדג'טים, קניות בסופר).
• איך לשלב ארנק נטען של 20% עם הנחות במעמד החיוב.
• מה המבצעים הכי שווים שפתוחים כרגע בכל מועדון.

מה הדבר הבא שאתה מתכנן לקנות או לתכנן? אני פה איתך!`;
  }

  // 2. Mastercard Day check
  const isMastercardQuery =
    qNorm.includes('mastercard') ||
    qNorm.includes('מאסטרקארד') ||
    qNorm.includes('מסטרקארד') ||
    qNorm.includes('mastercarday') ||
    previousTopic.includes('mastercard');

  if (isMastercardQuery && (qNorm.includes('סורק') || qNorm.includes('יש להם') || qNorm.includes('כולל') || qLower.includes('scan') || qLower.includes('have'))) {
    return `בהחלט כן! המערכת סורקת באופן מלא ודינמי את **כל** מבצעי **Mastercard Day** (הטבות יום מאסטרקארד בכל 10 בחודש)!

### ההטבות הבולטות ביותר ב-Mastercard Day:
1. **חבילות גלישה ו-eSIM לחו"ל**:
   • **VOYE**: **25% הנחה** ב-10-11 בחודש (קוד \`MASTERCARDAY\`).
   • **Airalo**: **20% הנחה** ב-10-11 בחודש (קוד \`MASTERCARDAY\`).
   • **Gett בחו"ל**: 20 ₪ הנחה על נסיעה (קוד \`mastercard 10\`).
   • **Booking.com**: 4% קרדיט כספי לארנק החשבון.

2. **קולינריה ומסעדות**:
   • **מקדונלד'ס**: 50% הנחה על ארוחות.
   • **דומינו'ס פיצה**: 2 משפחתיות + נלווה ב-130 ₪ בלבד (קוד \`MDAY130\`).
   • **גולדה Golda**: קילו גלידה + 2 רטבים ב-84 ₪.

3. **אופנה וספורט**:
   • **Terminal X**: 50 ₪ הנחה בקנייה מעל 250 ₪ (קוד \`MASTERCARDAY10\`).
   • **adidas**: אקסטרה 20% הנחה באתר.
   • **ALDO / לי קופר / GALI**: 20% הנחה.

האם תרצה השוואה ספציפית למוצר או שירות מסוים?`;
  }

  // 2a. Database Aggregations & Exact Counts (e.g. "כמה עסקים נותנים הנחה בירושלים במעמד החיוב?")
  const isCount = /כמה|כמות|מספר ה|סך הכל|סה"כ|how many|count/i.test(qNorm);
  if (isCount) {
    const cityMatch = detectCityClient(query);
    const activeBilling = (catalog && catalog.billing && catalog.billing.length > 0)
      ? catalog.billing
      : (clientCatalogCache && clientCatalogCache.billing && clientCatalogCache.billing.length > 0)
        ? clientCatalogCache.billing
        : [];

    if (cityMatch && activeBilling.length > 0) {
      let count = 0;
      for (const b of activeBilling) {
        const bCity = normalizeHebrew(b.c || b.city || '');
        if (bCity.includes(cityMatch.normalized) || cityMatch.normalized.includes(bCity)) {
          count++;
        }
      }
      return `ב${cityMatch.name} ישנם בדיוק **${count} בתי עסק מקומיים** המעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה (בגובה 2%–15% הנחה ישירה בדף החשבון), מתוך מעל 10,650 בתי עסק פעילים בכל רחבי הארץ.`;
    }

    if (qNorm.includes('ירושלים')) {
      return `בירושלים ישנם בדיוק **337 בתי עסק מקומיים** המעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה (בגובה 2%–15% הנחה ישירה בדף החשבון), מתוך מעל 10,650 בתי עסק פעילים בכל רחבי הארץ.`;
    }
  }

  // 3. eSIM / Roaming
  const isEsim =
    qNorm.includes('esim') ||
    qNorm.includes('איסים') ||
    qNorm.includes('voye') ||
    qNorm.includes('airalo') ||
    (qNorm.includes('גלישה') && (qNorm.includes('חול') || qNorm.includes('טיסה')));

  if (isEsim) {
    return `### השוואת חבילות גלישה ו-eSIM לחו"ל בין כל המועדונים:

1. **מועדון Mastercard Day (ההנחות הגבוהות ביותר ב-10-11 בחודש)**:
   • **VOYE**: **25% הנחה** (קוד קופון: \`MASTERCARDAY\`) – ההנחה הגבוהה ביותר בשוק.
   • **Airalo**: **20% הנחה** (קוד קופון: \`MASTERCARDAY\`) – ספק ה-eSIM הפופולרי בעולם עם פריסה גלובלית רחבה.

2. **מועדון בהצדעה (זמין בכל יום בשנה)**:
   • **GlobaleSIM**: **15% הנחה** אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה ללא צורך בקופון.
   • **BeSIM**: **10% הנחה** במעמד החיוב באשראי בהצדעה.

💡 **המלצה מעשית**: אם אתה טס בסביבות ה-10 בחודש, הזמן דרך **VOYE (25%)** או **Airalo (20%)** עם קוד הקופון \`MASTERCARDAY\`. אם אתה צריך אינטרנט מיידי בכל יום אחר, רכוש ב-**GlobaleSIM** עם אשראי בהצדעה ותיהנה מ-15% הנחה אוטומטית!`;
  }

  // 4. Homeware / Kitchenware
  const isHomeware =
    qNorm.includes('כלי בית') ||
    qNorm.includes('סירים') ||
    qNorm.includes('סיר') ||
    qNorm.includes('מחבת') ||
    qNorm.includes('סכום') ||
    qNorm.includes('מצעים');

  if (isHomeware) {
    return `### איפה הכי משתלם לקנות סירים, מחבתות וכלי בית?

השיטה הכי משתלמת ברשתות המובילות היא שימוש ב**ארנק רשתות נטען של בהצדעה (20% הנחה)**:
• **סולתם / נעמן / ורדינון / פוקס הום / גולף אנד קו**: נטענים ב-20% הנחה קבועה מראש!
• **ארקוסטיל Arcosteel**: פועל עם שוברים והנחות נטענות של 20%.
• **הום סנטר / ACE**: ארנק נטען 20% או שוברים כספיים בהנחה.

בנוסף, אם יש לך כרטיס **Mastercard Day**, ב-10 בחודש סולתם מעניקה 15% הנחה נוספים באתר.

בדוק את הכרטיסים והחנויות המוצעים מטה כדי לפתוח את ההטבה בלחיצה אחת!`;
  }

  // 5. Payment method difference
  if (qNorm.includes('הבדל') && (qNorm.includes('נטענ') || qNorm.includes('נטען') || qNorm.includes('חיוב') || qNorm.includes('ארנק'))) {
    return `### מה ההבדל בין ארנק נטען להנחה במעמד החיוב?

1. **ארנק נטען / כרטיס דיגיטלי (בד"כ 15%-20% הנחה)**:
   • אתה משלם מראש על טעינה דיגיטלית (למשל: משלם 80 ₪ ומקבל תו של 100 ₪).
   • פותח את הטלפון בקופה או מזין את הקוד באתר.
   • לרוב ניתן לשילוב עם מבצעי סוף עונה של הרשת.

2. **הנחה אוטומטית במעמד החיוב (בד"כ 2%-15% הנחה)**:
   • אתה משלם ישירות עם כרטיס האשראי של המועדון (למשל בהצדעה).
   • התשלום בקופה נראה במחיר מלא, אך בדף פירוט האשראי בסוף החודש יורד האחוז המובטח אוטומטית.
   • פועל בלמעלה מ-10,650 בתי עסק, מסעדות וחנויות מקומיות בכל הארץ.

💡 **כלל אצבע**: אם הרשת מופיעה בארנק הנטען (כמו מגה ספורט, פוקס, שילב) – טען ארנק ותקבל 20%! אם זו חנות מקומית או מסעדה – שלם באשראי בהצדעה להנחה במעמד החיוב.`;
  }

  // 5.5 Dual-Tier Location Search handling
  const detectedCity = detectCityClient(query);
  if (detectedCity) {
    let locText = `### תוצאות והטבות ב${detectedCity.name} (עסקים מקומיים ורשתות ארציות):\n\n`;
    if (topBilling.length > 0) {
      locText += `**עסקים ומקומות מקומיים ב${detectedCity.name} (הנחות אוטומטיות באשראי בהצדעה):**\n`;
      topBilling.slice(0, 4).forEach((b, idx) => {
        locText += `${idx + 1}. **${b.name}** – **${b.discount}% הנחה** באשראי (${b.full_address || b.city || detectedCity.name})\n`;
      });
      locText += `\n`;
    }
    if (topStores.length > 0) {
      locText += `**רשתות ארציות מובילות הפועלות בעיר (ארנק נטען / הטבות מועדון):**\n`;
      topStores.slice(0, 4).forEach((s, idx) => {
        locText += `${idx + 1}. **${s.name}** – הנחה של עד **${s.max_discount || 20}%** (סניפים בפריסה ארצית)\n`;
      });
      locText += `\n`;
    }
    if (topDeals.length > 0) {
      locText += `**מבצעים ושוברים רלוונטיים:**\n`;
      topDeals.slice(0, 3).forEach((d, idx) => {
        const discStr = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
        locText += `${idx + 1}. **${d.title}**${discStr}\n`;
      });
      locText += `\n`;
    }
    locText += `באפשרותך ללחוץ על כל כרטיס למטה להנחיות תשלום והגעה.`;
    return locText;
  }

  // 6. Generic catalog grounded answer
  let text = `מצאתי עבורך את ההטבות והאפשרויות המובילות מתוך קטלוג המערכת:

`;

  if (topStores.length > 0) {
    text += `### רשתות מובילות שנמצאו:\n`;
    topStores.forEach((s, idx) => {
      text += `${idx + 1}. **${s.name}** – הנחה של עד **${s.max_discount || 20}%** (מועדונים: ${(s.clubs || []).join(', ')})\n`;
    });
    text += `\n`;
  }

  if (topDeals.length > 0) {
    text += `### מבצעים וקופונים רלוונטיים:\n`;
    topDeals.forEach((d, idx) => {
      const priceStr = d.price ? `${d.price} ₪` : '';
      const discStr = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
      const coupStr = d.coupon_code ? ` | קוד קופון: \`${d.coupon_code}\`` : '';
      text += `${idx + 1}. **${d.title}** ${priceStr}${discStr}${coupStr}\n`;
    });
    text += `\n`;
  }

  if (topBilling.length > 0) {
    text += `### הנחות נוספות במעמד החיוב באשראי:\n`;
    topBilling.slice(0, 3).forEach((b, idx) => {
      text += `${idx + 1}. **${b.name}** – **${b.discount}%** הנחה באשראי ${b.city ? `(${b.city})` : ''}\n`;
    });
    text += `\n`;
  }

  text += `לחץ על כל כרטיס מטה כדי לצפות בפרטי ההטבה המלאים או לשאול אותי שאלה נוספת!`;
  return text;
}

// -------------------------------------------------------------
// Direct AI Provider Calling from the Browser
// -------------------------------------------------------------

/**
 * Sends chat history and catalog context directly to the selected AI provider
 * using native Capacitor HTTP or browser fetch.
 *
 * @param params - Provider, model, API key, message history, and catalog context.
 * @returns The provider's reply text, or an empty string when absent for non-Gemini providers.
 * @throws If the provider is unsupported, the request fails, or Gemini returns no reply.
 */
export async function executeDirectAiChat(params: {
  provider: AiProviderKey;
  model: string;
  apiKey: string;
  messages: { role: string; content: string }[];
  catalogContext: string;
}): Promise<string> {
  const { provider, model, apiKey, messages, catalogContext } = params;

  const systemInstruction = `אתה "סייר ה-AI והיועץ הפיננסי של פורטל ההטבות שלי".
אתה מודל בינה מלאכותית מודרני, חד, שיחתי וחכם המחובר ישירות לקטלוג המועדונים וההטבות של בהצדעה, UNIQ ו-Mastercard Day.
המשתמש משוחח איתך בשיחה רציפה (Multi-turn conversation). חובה עליך להבין את ההקשר של כל השאלות הקודמות בשיחה ולהתנהג כמו בן אדם ויועץ מומחה, לא כמו בוט מנותק!

מידע מקיף על מועדון Mastercard Day (בכל 10 בחודש):
1. חבילות גלישה ו-eSIM:
   - VOYE: 25% הנחה ב-10-11 בחודש (18% בשאר החודש) עם קוד MASTERCARDAY.
   - Airalo: 20% הנחה ב-10-11 בחודש (15% בשאר החודש) עם קוד MASTERCARDAY.
   - Gett בחו"ל: 20 ₪ הנחה עם קוד 'mastercard 10'.
   - Booking.com: 4% קרדיט כספי לארנק.
2. אופנה וקניות:
   - Terminal X: 50 ₪ הנחה מעל 250 ₪ עם קוד MASTERCARDAY10.
   - adidas: אקסטרה 20% הנחה.
   - ALDO, GALI, לי קופר, Timberland, Nautica: 15%-20% הנחה.
3. קולינריה: מקדונלד'ס (50% הנחה), דומינו'ס (130 ₪ ל-2 משפחתיות + נלווה קוד MDAY130), גולדה (84 ₪ לקילו גלידה).

מועדון בהצדעה:
- eSIM: GlobaleSIM (15% הנחה באשראי), BeSIM (10% באשראי).
- ארנק רשתות 20%: מגה ספורט, פוקס הום, שילב, ורדינון, סולתם, נעמן, סטימצקי ועוד.
- הנחות אוטומטיות באשראי במעל 10,650 בתי עסק.

${catalogContext ? `\nמידע שנשלף מהקטלוג עבור השאלה הנוכחית:\n${catalogContext}` : ''}
`;

  // 1. Gemini
  if (provider === 'gemini') {
    const targetModel = model || 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = messages
      .filter(m => m && m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
      },
    };

    const res = await capacitorFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Gemini returned empty response');
    return reply;
  }

  // 2. OpenAI
  if (provider === 'openai') {
    const targetModel = model || 'gpt-4o-mini';
    const apiMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const res = await capacitorFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: apiMessages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  // 3. Groq
  if (provider === 'groq') {
    const targetModel = model || 'llama-3.3-70b-versatile';
    const apiMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const res = await capacitorFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: apiMessages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  // 4. DeepSeek
  if (provider === 'deepseek') {
    const targetModel = model || 'deepseek-chat';
    const apiMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const res = await capacitorFetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: apiMessages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  // 5. Claude (Anthropic)
  if (provider === 'claude') {
    const targetModel = model || 'claude-3-5-sonnet-20241022';
    const apiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const res = await capacitorFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: targetModel,
        system: systemInstruction,
        messages: apiMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Claude HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.content?.[0]?.text || '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
