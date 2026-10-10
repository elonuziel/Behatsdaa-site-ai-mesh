import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Dynamically resolve real Gemini API key
let resolvedApiKey: string | null = null;

function getGeminiApiKey(): string {
  if (resolvedApiKey) return resolvedApiKey;

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && !envKey.startsWith('MY_') && envKey.length > 20) {
    resolvedApiKey = envKey;
    return envKey;
  }

  // Check .env file if available
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const match = line.match(/^GEMINI_API_KEY=(.*)$/);
        if (match) {
          const val = match[1].trim();
          if (val && !val.startsWith('MY_') && val.length > 20) {
            resolvedApiKey = val;
            console.log('✅ Resolved valid GEMINI_API_KEY from .env file.');
            return val;
          }
        }
      }
    }
  } catch {}

  // Check running processes in container for AI Studio injected key
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
        for (const entry of environ.split('\0')) {
          if (entry.startsWith('GEMINI_API_KEY=')) {
            const val = entry.slice('GEMINI_API_KEY='.length);
            if (val && !val.startsWith('MY_') && val.length > 20) {
              resolvedApiKey = val;
              console.log('✅ Resolved valid GEMINI_API_KEY from environment session.');
              return val;
            }
          }
        }
      } catch {}
    }
  } catch {}

  return envKey || '';
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Cache catalog data in memory for lightning fast retrieval and grounding
interface StoreItem {
  id: string;
  name: string;
  slug: string;
  category?: string;
  clubs?: string[];
  max_discount?: number;
  logo?: string;
  website?: string;
  conditions?: string;
  cards?: any[];
  payment_options?: any[];
  [key: string]: any;
}

interface DealItem {
  id: string;
  title: string;
  slug: string;
  club?: string;
  supplier?: string;
  category?: string;
  price?: number | null;
  original_price?: number | null;
  discount_percent?: number | null;
  coupon_code?: string | null;
  image?: string;
  url?: string;
  description?: string;
  terms_of_use?: string;
  tags?: string[];
  [key: string]: any;
}

let cachedStores: StoreItem[] = [];
let cachedDeals: DealItem[] = [];

interface BillingStoreItem {
  id: number | string;
  name: string;
  discount: number;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  logo?: string;
  detail_url?: string;
  full_address?: string;
}

let cachedBillingStores: BillingStoreItem[] = [];
let lexiconSynonyms: Record<string, string[]> = {};

function loadCatalogData() {
  try {
    const storesPath = path.resolve(__dirname, 'public/data/stores.json');
    const dealsPath = path.resolve(__dirname, 'public/data/deals.json');
    const billingPath = path.resolve(__dirname, 'public/data/billing_stores.json');
    const lexiconPath = path.resolve(__dirname, 'data/search_lexicon.json');

    if (fs.existsSync(storesPath)) {
      const storesRaw = fs.readFileSync(storesPath, 'utf8');
      const storesJson = JSON.parse(storesRaw);
      cachedStores = storesJson.stores || (Array.isArray(storesJson) ? storesJson : []);
    } else {
      const fallbackStores = path.resolve(__dirname, 'data/stores.json');
      if (fs.existsSync(fallbackStores)) {
        const fallbackRaw = JSON.parse(fs.readFileSync(fallbackStores, 'utf8'));
        cachedStores = fallbackRaw.stores || (Array.isArray(fallbackRaw) ? fallbackRaw : []);
      }
    }

    if (fs.existsSync(dealsPath)) {
      const dealsRaw = fs.readFileSync(dealsPath, 'utf8');
      const dealsJson = JSON.parse(dealsRaw);
      cachedDeals = dealsJson.deals || (Array.isArray(dealsJson) ? dealsJson : []);
    } else {
      const fallbackDeals = path.resolve(__dirname, 'data/deals.json');
      if (fs.existsSync(fallbackDeals)) {
        const fallbackRaw = JSON.parse(fs.readFileSync(fallbackDeals, 'utf8'));
        cachedDeals = fallbackRaw.deals || (Array.isArray(fallbackRaw) ? fallbackRaw : []);
      }
    }

    // Load full 10,000+ billing stores
    const billingPathToUse = fs.existsSync(billingPath)
      ? billingPath
      : path.resolve(__dirname, 'data/billing_stores.json');

    if (fs.existsSync(billingPathToUse)) {
      const billingRaw = fs.readFileSync(billingPathToUse, 'utf8');
      const billingJson = JSON.parse(billingRaw);
      cachedBillingStores = billingJson.stores || (Array.isArray(billingJson) ? billingJson : []);
    }

    // Load search lexicon synonyms & transliterations
    if (fs.existsSync(lexiconPath)) {
      try {
        const lexRaw = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));
        const syns: Record<string, string[]> = {};
        if (lexRaw.synonyms) {
          for (const [k, v] of Object.entries(lexRaw.synonyms)) {
            syns[k.toLowerCase()] = Array.isArray(v) ? v.map((s: any) => String(s).toLowerCase()) : [];
          }
        }
        if (lexRaw.transliterations) {
          for (const [k, v] of Object.entries(lexRaw.transliterations)) {
            const keyLower = k.toLowerCase();
            const arr = Array.isArray(v) ? v.map((s: any) => String(s).toLowerCase()) : [];
            syns[keyLower] = [...(syns[keyLower] || []), ...arr];
            for (const item of arr) {
              syns[item] = [...(syns[item] || []), keyLower];
            }
          }
        }
        lexiconSynonyms = syns;
      } catch (e) {
        console.warn('Failed parsing search_lexicon.json', e);
      }
    }

    console.log(` Loaded ${cachedStores.length} stores, ${cachedDeals.length} deals, and ${cachedBillingStores.length} billing stores (10,000+ businesses) for AI search.`);
  } catch (err) {
    console.error('Error loading catalog data in server:', err);
  }
}

// Ensure catalog is loaded
loadCatalogData();

// Hebrew normalization helper
function normalizeHebrew(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '') // remove niqqud
    .replace(/[״"''`]/g, '')
    .replace(/[–—־-]/g, ' ')
    .trim();
}

// Whitelist of strictly permitted AI model names to prevent unvalidated model injection
const ALLOWED_MODELS = new Set<string>([
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);

const HEBREW_STOP_WORDS = new Set([
  'איפה', 'הכי', 'משתלם', 'יש', 'של', 'על', 'את', 'מה', 'איזה', 'אילו', 'האם',
  'כדאי', 'אפשר', 'רוצה', 'מחפש', 'הנחה', 'הנחות', 'מבצע', 'מבצעים', 'מועדון',
  'מועדונים', 'חנות', 'רשת', 'חבר', 'חברי', 'למצוא', 'לקנות', 'באיזה', 'כמה',
  'טוב', 'טובה', 'טובים', 'שלום', 'היי', 'תודה', 'בבקשה', 'ספר', 'לי', 'בשבילי',
  'אבל', 'עם', 'גם', 'לם', 'להם', 'אז', 'ומה', 'שם', 'אלו', 'אלה', 'שלהם', 'עוד'
]);

// Check if user query is conversational, meta, explanatory, or greeting rather than a specific store search
function isPurelyConversationalOrInformational(query: string): boolean {
  const qNorm = normalizeHebrew(query);
  if (!qNorm) return true;

  // Commercial / product keywords that clearly indicate a catalog search
  const commercialKeywords = [
    'פיצה', 'נעלי', 'נעליים', 'ספורט', 'מגה ספורט', 'פוקס', 'טרמינל', 'קולומביה', 'שופרסל', 'קרפור',
    'מחשב', 'לפטופ', 'טלפון', 'סמארטפון', 'מלון', 'מלונות', 'ספא', 'צימר', 'קולנוע', 'סינמה', 'סיטי',
    'מסעדה', 'מסעדות', 'המבורגר', 'סושי', 'אוכל', 'משלוח', 'וולט', 'משלוחה', 'רכב', 'מוסך', 'שיניים',
    'רופא', 'אופנה', 'בגדים', 'קניון', 'אילת', 'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'באר שבע',
    'נתניה', 'כרמיאל', 'אשדוד', 'פתח תקווה', 'חולון', 'רמת גן', 'הרצליה', 'רעננה', 'כפר סבא', 'מבצעים',
    'קופון', 'קופונים', 'שובר', 'שוברים', 'איסים', 'סים', 'גלישה', 'voye', 'airalo', 'globalesim', 'besim',
    'esim', 'pizza', 'shoes', 'hotel', 'flights', 'burger', 'flight', 'clothes', 'laptop', 'phone'
  ];

  for (const word of commercialKeywords) {
    if (qNorm.includes(word)) return false;
  }

  // Conversational or meta questions in Hebrew and English
  const metaPhrases = [
    'איך האתר עובד', 'איך משתמשים', 'מה האתר', 'הסבר לי על', 'מי אתה', 'מה אתה', 'האם אתה', 'באמת ai',
    'איך לחסוך', 'מה זה ארנק נטען', 'מה ההבדל בין', 'הנחה במעמד החיוב', 'איך מטעינים', 'איך ממשים',
    'שלום', 'היי', 'בוקר טוב', 'ערב טוב', 'צהריים טובים', 'תודה', 'מי יצר', 'מה היכולות', 'גולש ומבין',
    'זה רע', 'זה לא טוב', 'שיחה', 'שיחתי', 'תדבר כמו', 'תענה לי',
    'thats bad', 'that is bad', 'it should be a conversation', 'conversation', 'chat', 'not true',
    'thats not true', 'does it scan', 'they do have', 'what about', 'who are you', 'how does this work',
    'hello', 'hi', 'thank you', 'thanks'
  ];

  return metaPhrases.some(phrase => qNorm.includes(phrase));
}

function matchesToken(text: string, token: string): boolean {
  if (!text || !token) return false;
  if (token.length <= 3) {
    const regex = new RegExp(`(^|[^a-zA-Z0-9\u0590-\u05fe])${token}([^a-zA-Z0-9\u0590-\u05fe]|$)`, 'i');
    return regex.test(text);
  }
  return text.includes(token);
}

const isWaterOrFitness = (text: string) =>
  /מועדון גלישה|שיעורי גלישה|חוף הצוק|ווי סרף|we surf|סאפ|קייט|גלשן|ספורט ימי|חוף נאות|דאדיז|פילאטיס|כושר|הולמס פלייס/i.test(text);

// Find relevant stores & deals from query across all 10,000+ businesses with context awareness
function findRelevantCatalog(query: string, activeClubs?: string[], conversationTopic?: string) {
  // If the query is purely a meta question, greeting, or conceptual explanation, don't force random store cards
  if (isPurelyConversationalOrInformational(query) && !conversationTopic) {
    return {
      topStores: [],
      topDeals: [],
      topBilling: [],
    };
  }

  const combinedSearchQuery = conversationTopic ? `${query} ${conversationTopic}` : query;
  const qNorm = normalizeHebrew(combinedSearchQuery);

  // Detect explicit club targeting from the query or conversation topic
  const isMastercardMentioned =
    qNorm.includes('mastercard') || qNorm.includes('מאסטרקארד') || qNorm.includes('מסטרקארד') ||
    qNorm.includes('mastercarday') || qNorm.includes('matercarday') || qNorm.includes('matercard');

  const targetClub = isMastercardMentioned
    ? 'mastercard'
    : (qNorm.includes('בהצדעה') || qNorm.includes('בהצדאה') || qNorm.includes('מילואים'))
      ? 'behatsdaa'
      : (qNorm.includes('יוניק') || qNorm.includes('uniq'))
        ? 'uniq'
        : (conversationTopic && (
            conversationTopic.includes('mastercard') || conversationTopic.includes('מאסטרקארד') ||
            conversationTopic.includes('mastercarday') || conversationTopic.includes('matercarday') ||
            conversationTopic.includes('matercard')
          ))
          ? 'mastercard'
          : null;

  const isEsimTopic = qNorm.includes('esim') || qNorm.includes('איסים') ||
    qNorm.includes('voye') || qNorm.includes('airalo') ||
    qNorm.includes('globalesim') || qNorm.includes('besim') ||
    ((qNorm.includes('גלישה') || qNorm.includes('אינטרנט')) && (qNorm.includes('חול') || qNorm.includes('חו ל') || qNorm.includes('סלולר') || qNorm.includes('סים') || qNorm.includes('טיסה')));

  const isAllDealsRequest =
    qNorm.includes('all other') || qNorm.includes('other deals') || qNorm.includes('all deals') ||
    qNorm.includes('options') || qNorm.includes('what else') || qNorm.includes('שאר') ||
    qNorm.includes('עוד מבצעים') || qNorm.includes('כל המבצעים') || qNorm.includes('הטבות נוספות') ||
    qNorm.includes('שאר ההטבות') || qNorm.includes('מבצעים ואפשרויות');

  const rawWords = qNorm.split(/\s+/).filter(w => w.length > 1);
  const keywords = rawWords.filter(w => !HEBREW_STOP_WORDS.has(w));
  const activeWords = keywords.length > 0 ? keywords : rawWords;

  // Expand with synonyms and related terms
  const searchTerms = new Set<string>(activeWords);
  for (const word of activeWords) {
    if (lexiconSynonyms[word]) {
      for (const syn of lexiconSynonyms[word]) {
        searchTerms.add(normalizeHebrew(syn));
      }
    }
  }
  const expandedWords = Array.from(searchTerms);

  const matchedStores: { store: StoreItem; score: number }[] = [];
  const matchedDeals: { deal: DealItem; score: number }[] = [];

  // Effective club filter: If the question is about eSIM or targets a specific club, permit relevant clubs
  const effectiveClubs = isEsimTopic
    ? ['behatsdaa', 'uniq', 'mastercard']
    : (targetClub && activeClubs && activeClubs.length > 0)
      ? [...activeClubs, targetClub]
      : activeClubs;

  // 1. Filter primary club stores
  for (const s of cachedStores) {
    if (effectiveClubs && effectiveClubs.length > 0) {
      const hasClub = (s.clubs || []).some(c => effectiveClubs.includes(c));
      if (!hasClub) continue;
    }

    // When targeting mastercard, only consider mastercard partner stores
    if (targetClub === 'mastercard' && !(s.clubs || []).includes('mastercard')) {
      continue;
    }

    // Exclude water surfing / unrelated fitness when searching for cellular eSIM
    if (isEsimTopic && isWaterOrFitness(s.name || '')) {
      continue;
    }

    const nameNorm = normalizeHebrew(s.name || '');
    const catNorm = normalizeHebrew(s.category || '');
    const condNorm = normalizeHebrew(s.conditions || '');
    const cardsNorm = normalizeHebrew(
      (s.cards || []).map((c: any) => typeof c === 'string' ? c : c.card_name || '').join(' ')
    );

    let score = 0;
    if (nameNorm.includes(qNorm)) score += 80;
    if (catNorm.includes(qNorm)) score += 35;

    for (const w of expandedWords) {
      if (matchesToken(nameNorm, w)) score += 25;
      if (matchesToken(catNorm, w)) score += 12;
      if (matchesToken(cardsNorm, w)) score += 6;
      if (matchesToken(condNorm, w)) score += 3;
    }

    // Boost club if explicitly targeted
    if (targetClub && (s.clubs || []).includes(targetClub)) {
      score += 40;
    }

    // Boost eSIM providers if relevant
    if (isEsimTopic) {
      const sId = (s.id || '').toLowerCase();
      if (sId.includes('voye') || sId.includes('airalo') || nameNorm.includes('voye') || nameNorm.includes('airalo')) {
        score += 200;
      }
    }

    if (isAllDealsRequest && targetClub === 'mastercard') {
      score += 30;
    }

    // Require threshold to avoid noisy random suggestions
    if (score >= 25) {
      score += (s.max_discount || 0) * 0.5;
      matchedStores.push({ store: s, score });
    }
  }

  // 2. Filter deals & vouchers
  for (const d of cachedDeals) {
    if (effectiveClubs && effectiveClubs.length > 0) {
      if (d.club && !effectiveClubs.includes(d.club)) continue;
    }

    // If query targeted a specific club, filter out other clubs so they don't pollute
    if (targetClub && d.club && d.club !== targetClub) {
      continue;
    }

    // Exclude water sports / gym when looking for eSIM
    if (isEsimTopic) {
      const dTitle = d.title || '';
      const dSupp = d.supplier || '';
      const dCat = d.category || '';
      if (isWaterOrFitness(dTitle) || isWaterOrFitness(dSupp) || dCat.includes('כושר')) {
        continue;
      }
    }

    const titleNorm = normalizeHebrew(d.title || '');
    const suppNorm = normalizeHebrew(d.supplier || '');
    const catNorm = normalizeHebrew(d.category || '');
    const descNorm = normalizeHebrew(`${d.description || ''} ${d.terms_of_use || ''}`);
    const tagsNorm = normalizeHebrew((d.tags || []).join(' '));

    let score = 0;
    if (titleNorm.includes(qNorm)) score += 70;
    if (suppNorm.includes(qNorm)) score += 45;
    if (catNorm.includes(qNorm)) score += 20;

    for (const w of expandedWords) {
      if (matchesToken(titleNorm, w)) score += 25;
      if (matchesToken(suppNorm, w)) score += 25;
      if (matchesToken(tagsNorm, w)) score += 30; // Tags are curated and highly accurate
      if (matchesToken(catNorm, w)) score += 10;
      if (matchesToken(descNorm, w)) score += 5;
    }

    // Target club boost
    if (targetClub && d.club === targetClub) {
      score += 40;
    }

    // eSIM & travel data boost
    if (isEsimTopic) {
      const suppLow = (d.supplier || '').toLowerCase();
      const titleLow = (d.title || '').toLowerCase();
      if (suppLow.includes('voye') || suppLow.includes('airalo') || titleLow.includes('voye') || titleLow.includes('airalo') || (titleLow.includes('גלישה') && titleLow.includes('חול'))) {
        score += 200;
        if (targetClub && d.club === targetClub) {
          score += 40;
        }
      }
    }

    if (isAllDealsRequest && targetClub === 'mastercard') {
      score += 35;
    }

    // Require strong relevance threshold
    if (score >= 25) {
      score += (d.discount_percent || 0) * 0.5;
      matchedDeals.push({ deal: d, score });
    }
  }

  // 3. Filter 10,000+ billing stores directory (only if not restricted to mastercard)
  const matchedBilling: { store: BillingStoreItem; score: number }[] = [];
  if (!targetClub || targetClub === 'behatsdaa') {
    for (const b of cachedBillingStores) {
      const nameNorm = normalizeHebrew(b.name || '');
      const catNorm = normalizeHebrew(b.category || '');
      const cityNorm = normalizeHebrew(b.city || '');
      const addrNorm = normalizeHebrew(b.full_address || b.address || '');
      const descNorm = normalizeHebrew(b.description || '');

      if (isEsimTopic && isWaterOrFitness(nameNorm)) {
        continue;
      }

      let score = 0;
      if (nameNorm.includes(qNorm)) score += 75;
      if (catNorm.includes(qNorm)) score += 35;
      if (cityNorm && cityNorm.includes(qNorm)) score += 40;

      for (const w of expandedWords) {
        if (matchesToken(nameNorm, w)) score += 25;
        if (cityNorm && matchesToken(cityNorm, w)) score += 18;
        if (catNorm && matchesToken(catNorm, w)) score += 12;
        if (addrNorm && matchesToken(addrNorm, w)) score += 8;
        if (descNorm && matchesToken(descNorm, w)) score += 5;
      }

      // Boost eSIM billing stores
      if (isEsimTopic && (nameNorm.includes('globalesim') || nameNorm.includes('besim') || nameNorm.includes('סים פור פליי'))) {
        score += 200;
      }

      // Strict threshold: do not include random businesses on loose word matches
      if (score >= 35) {
        score += (b.discount || 0) * 0.8;
        matchedBilling.push({ store: b, score });
      }
    }
  }

  matchedStores.sort((a, b) => b.score - a.score);
  matchedDeals.sort((a, b) => b.score - a.score);
  matchedBilling.sort((a, b) => b.score - a.score);

  return {
    topStores: matchedStores.slice(0, 6).map(m => m.store),
    topDeals: matchedDeals.slice(0, 6).map(m => m.deal),
    topBilling: matchedBilling.slice(0, 8).map(m => m.store),
  };
}

// Generate smart follow-up suggestions based on context
function generateFollowUps(query: string, stores: StoreItem[], deals: DealItem[]): string[] {
  const suggestions: string[] = [];
  const qLower = query.toLowerCase();

  if (qLower.includes('נעל') || qLower.includes('ספורט') || qLower.includes('בגדים') || qLower.includes('אופנה')) {
    suggestions.push('איך הכי משתלם לשלם במגה ספורט?');
    suggestions.push('האם יש הנחה באאוטלט או באתר Terminal X?');
    suggestions.push('מה ההנחה על נעליים בכרטיס נטען UNIQ?');
  } else if (qLower.includes('פיצה') || qLower.includes('אוכל') || qLower.includes('מסעד') || qLower.includes('בורגר')) {
    suggestions.push('איזה שוברים יש למשלוחי אוכל (משלוחה, וולט)?');
    suggestions.push('האם יש מבצעים לפיצה האט או מקדונלדס?');
    suggestions.push('איזה מסעדות נותנות הנחה במעמד החיוב?');
  } else if (qLower.includes('סופר') || qLower.includes('מזון') || qLower.includes('קרפור') || qLower.includes('קניות')) {
    suggestions.push('איך לממש כרטיס נטען בקרפור ובשופרסל?');
    suggestions.push('איזה רשתות מזון מכבדות את ארנק בהצדעה?');
  } else if (qLower.includes('מלון') || qLower.includes('נופש') || qLower.includes('ספא') || qLower.includes('אילת')) {
    suggestions.push('הראה לי מבצעי ספא במלונות עם הנחה');
    suggestions.push('איזה שוברים יש לאטרקציות ופעילויות למשפחה?');
  } else if (qLower.includes('מאסטרקארד') || qLower.includes('mastercard')) {
    suggestions.push('אילו קופונים פעילים ב-10 לחודש ב-Mastercard Day?');
    suggestions.push('איך מקבלים 50 ₪ הנחה ב-Terminal X?');
  } else {
    suggestions.push('איזה מועדון נותן את ההנחה הכי גדולה ברשתות אלו?');
    suggestions.push('הסבר לי איך עובד ארנק נטען בהצדעה של 20%');
    suggestions.push('מה ההבדל בין כרטיס נטען להנחה במעמד החיוב?');
  }

  return suggestions.slice(0, 3);
}

// POST /api/chat: Multi-turn chat with Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, activeClubs, model = 'gemini-3.1-flash-lite' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userPromptText = latestUserMessage ? latestUserMessage.content : '';

    // Extract conversation context from prior turns to maintain topic continuity
    let previousTopic = '';
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 1) {
      const priorUserPrompts = userMessages.slice(0, -1).map(m => m.content).join(' ');
      const normPrior = normalizeHebrew(priorUserPrompts);
      // Key topic anchors: esim, food, shoes, hotel, supermarket, etc.
      const topicMatches: string[] = [];
      const topics = [
        'esim', 'איסים', 'סים', 'חו ל', 'טיסה', 'פיצה', 'נעליים', 'ספורט', 'מלון', 'ספא', 'קרפור',
        'שופרסל', 'וולט', 'משלוחה', 'רכב', 'מוסך', 'שיניים', 'בגדים', 'טרמינל x', 'מגה ספורט',
        'mastercard', 'mastercarday', 'matercarday', 'matercard', 'מאסטרקארד', 'מסטרקארד',
        'uniq', 'יוניק', 'behatsdaa', 'בהצדעה'
      ];
      for (const t of topics) {
        if (normPrior.includes(t)) topicMatches.push(t);
      }
      if (topicMatches.length > 0) {
        previousTopic = topicMatches.join(' ');
      }
    }

    // Search catalog for grounded knowledge with conversation awareness
    const { topStores, topDeals, topBilling } = findRelevantCatalog(userPromptText, activeClubs, previousTopic);

    // Build catalog context summary
    let catalogContext = '';
    if (topStores.length > 0) {
      catalogContext += '\nרשתות וחנויות רלוונטיות מהקטלוג:\n' + topStores.map((s, idx) => {
        const clubsStr = (s.clubs || []).join(', ');
        const cardsStr = (s.cards || []).map((c: any) => `${c.card_name} (${c.discount})`).join(', ');
        return `${idx + 1}. ${s.name} (קטגוריה: ${s.category || 'כללי'}, הנחה מרבית: ${s.max_discount || 0}%, מועדונים: ${clubsStr}${cardsStr ? ', כרטיסים: ' + cardsStr : ''})`;
      }).join('\n');
    }

    if (topDeals.length > 0) {
      catalogContext += '\n\nמבצעים ושוברים רלוונטיים מהקטלוג:\n' + topDeals.map((d, idx) => {
        const priceStr = d.price ? `${d.price} ₪` : 'ללא מחיר נקוב';
        const discStr = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
        const couponStr = d.coupon_code ? `, קוד קופון: ${d.coupon_code}` : '';
        return `${idx + 1}. "${d.title}" - ספק: ${d.supplier || 'בהצדעה'}, מועדון: ${d.club || 'behatsdaa'}, מחיר: ${priceStr}${discStr}${couponStr}`;
      }).join('\n');
    }

    if (topBilling.length > 0) {
      catalogContext += '\n\nעסקים וחנויות מהקטלוג המורחב (הנחות במעמד החיוב באשראי בהצדעה מתוך 10,000+ סניפים):\n' + topBilling.map((b, idx) => {
        const locStr = b.full_address || b.city || '';
        return `${idx + 1}. "${b.name}" - ${b.discount}% הנחה במעמד החיוב באשראי${locStr ? ' (' + locStr + ')' : ''}, תחום: ${b.category || 'כללי'}`;
      }).join('\n');
    }

    const systemInstruction = `אתה "סייר ה-AI והיועץ הפיננסי של פורטל ההטבות שלי".
אתה מודל בינה מלאכותית מודרני, חד, שיחתי וחכם המחובר ישירות לקטלוג המועדונים וההטבות של בהצדעה, UNIQ ו-Mastercard Day.
המשתמש משוחח איתך בשיחה רציפה (Multi-turn conversation). חובה עליך להבין את ההקשר של כל השאלות הקודמות בשיחה ולהתנהג כמו בן אדם ויועץ מומחה, לא כמו בוט מנותק!

מידע מקיף ומדויק על מועדון Mastercard Day (הטבות יום מאסטרקארד בכל 10 בחודש):
1. **חבילות גלישה, תקשורת ו-eSIM לחו"ל ב-Mastercard Day**:
   - **VOYE**: **25% הנחה** ב-10 וב-11 בחודש (ו-**18% הנחה** בכל שאר ימות החודש) על כל חבילות הגלישה וה-eSIM באתר ובאפליקציית VOYE! קוד קופון: \`MASTERCARDAY\`.
   - **Airalo**: **20% הנחה** ב-10 וב-11 בחודש (ו-**15% הנחה** בכל שאר ימות החודש) על כל חבילות האינטרנט באתר ובאפליקציית Airalo (חברת ה-eSIM הפופולרית בעולם)! קוד קופון: \`MASTERCARDAY\`.
   - **Gett בחו"ל**: 20 ₪ הנחה בהזמנת נסיעה בחו"ל באפליקציית Gett (קוד קופון: \`mastercard 10\`).
   - **Booking.com**: 4% קרדיט כספי לארנק בהזמנת לינה ומלונות (קוד: \`MASTERCARDAY\`).

2. **קטגוריות מובילות נוספות ב-Mastercard Day (בכל 10 בחודש)**:
   - **אופנה ולייף סטייל**: Terminal X (50 ₪ הנחה בקנייה מעל 250 ₪ עם קוד \`MASTERCARDAY10\`), adidas (אקסטרה 20% הנחה), ALDO (20%), GALI (20%), Lee Cooper (20%), Minene (20%), Nine West (20%), Nautica (15%), Timberland (15%), Guess (15%).
   - **קולינריה ומסעדות**: מקדונלד'ס (50% הנחה על ארוחות), דומינו'ס (2 פיצות משפחתיות + נלווה ב-130 ₪ עם קוד \`MDAY130\`), גולדה Golda (קילו גלידה + 2 רטבים ב-84 ₪ בלבד), משלוחה (30 ₪ הנחה לחדשים), rebar (10 ₪ הנחה על משקה M).
   - **חשמל, אלקטרוניקה וגיימינג**: עולם הקולנוע והחשמל (200 ₪ הנחה מעל 2000 ₪), BUG (עד 30% הנחה), Lenovo (10% הנחה נוספים), Nintendo (10% הנחה), Last Price (10% אקסטרה הנחה), Walla Shops (10% הנחה).
   - **קניות בינלאומיות אונליין**: Amazon (10% הנחה מעל $49), AliExpress ($5 הנחה מעל $35).

3. **מועדון בהצדעה (משרתי מילואים ולוחמים)**:
   - **eSIM ותקשורת**: GlobaleSIM (15% הנחה אוטומטית במעמד החיוב באשראי בהצדעה ללא צורך בקוד קופון), BeSIM (10% הנחה אוטומטית במעמד החיוב).
   - **ארנק רשתות / כרטיס נטען 20%**: טעינה דיגיטלית מוזלת (מגה ספורט, פוקס הום, שילב, קולומביה, סטימצקי, ורדינון ועוד).
   - **הנחה אוטומטית באשראי**: מעל 10,650 בתי עסק וסניפים בכל עיר בישראל (2%-15% אוטומטית בדף החשבון).
   - **שוברים מסובסדים**: קולנוע (סינמה סיטי ב-33 ₪), ארוחות (מקדונלד'ס, בורגרים, פיצה האט), מלונות וספא.

4. **מועדון UNIQ (סטודנטים ובוגרים אקדמאים)**:
   - **כרטיס נטען UNIQ 15%**: טעינה דיגיטלית ל-31 רשתות מובילות כולל טרמינל X.
   - מבצעים וקופונים ייחודיים ללימודים, פנאי וקולנוע.

הנחיות קריטיות לשיחה (Conversation Rules):
- **מענה לשאלות המשך (Follow-up handling)**:
  אם המשתמש שאל קודם "איפה לקנות ESIM" וענית לו על בהצדעה, ואז הוא שואל: "אבל מה עם MASTERCARDAY גם לם יש" (או "גם להם יש?"):
  ענה ישירות ובצורה שיחתית טבעית: **כן, בהחלט!** הסבר שב-Mastercard Day ישנן שתי הטבות מצוינות ל-eSIM ולגלישה בחו"ל עם אחוזי הנחה אפילו גבוהים יותר (VOYE 25% ו-Airalo 20% עם קוד קופון MASTERCARDAY).
  ערוך עבורו השוואה חכמה: ב-10-11 לחודש VOYE נותן את ההנחה הגבוהה ביותר (25%), Airalo נותן 20% ומציע את הכיסוי הגלובלי הנרחב ביותר, ואילו בבהצדעה יש 15% ב-GlobaleSIM ו-10% ב-BeSIM שתקפים בכל יום בשנה אוטומטית באשראי בלי לחכות לקופון. הזכר גם את הטבות הנסיעות המשלימות של מאסטרקארד (20 ₪ ב-Gett ו-4% ב-Booking.com).
- **מענה לגבי שאר המבצעים והאפשרויות (All other deals and options)**:
  אם המשתמש מבקש לראות גם את שאר המבצעים של Mastercard Day או להכיר אפשרויות נוספות, פתח בפניו סקירה שיחתית, עשירה ומסודרת של ההטבות הבולטות לפי תחומי עניין (אופנה, מסעדות ואוכל, מחשבים וטכנולוגיה, קניות אונליין).
- **שיחה זורמת, אנושית ומקצועית**: שוחח כמו יועץ חיסכון אישי שמבין בדיוק מה הצרכים של המשתמש. אל תזרוק רשימות אקראיות של חנויות שאינן קשורות לנושא!

${catalogContext ? `פריטים שנמצאו בקטלוג המערכת עבור השאלה הנוכחית:\n${catalogContext}` : 'לא נמצאו פריטים קונקרטיים בקטלוג עבור מילות השאלה הללו. השתמש בידע הקטלוגי המלא שלך והסבר למשתמש בצורה עשירה ומלאה.'}`;

    // Map conversation history into Gemini Content format
    const contents = messages
      .filter(m => m && m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    let replyText = '';
    const activeKey = getGeminiApiKey();

    // Validate requested model parameter against whitelist
    const requestedModel = (typeof model === 'string' && ALLOWED_MODELS.has(model))
      ? model
      : 'gemini-3.1-flash-lite';

    if (activeKey && !activeKey.startsWith('MY_')) {
      // Prioritize confirmed high-speed working models: gemini-3.1-flash-lite & gemini-3.5-flash
      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        requestedModel,
        'gemini-3.8-flash'
      ].filter((v, i, a) => a.indexOf(v) === i && ALLOWED_MODELS.has(v));

      let success = false;
      const ai = getGeminiClient();

      for (const mName of candidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout for ${mName}`)), 15000)
          );

          const aiPromise = ai.models.generateContent({
            model: mName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          });

          const response = await Promise.race([aiPromise, timeoutPromise]);
          if (response && response.text) {
            replyText = response.text;
            success = true;
            break;
          }
        } catch (geminiError: any) {
          console.warn(`Model ${mName} call failed (${geminiError?.message || geminiError}), trying next candidate...`);
        }
      }

      if (!success || !replyText) {
        replyText = generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
      }
    } else {
      replyText = generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
    }

    // Keep deals and stores if they have genuine relevance
    const filteredStores = topStores;
    const filteredDeals = topDeals;
    const filteredBilling = topBilling;

    const followUps = generateFollowUps(userPromptText, topStores, topDeals);

    return res.json({
      reply: replyText,
      recommendedStores: filteredStores.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category,
        clubs: s.clubs,
        max_discount: s.max_discount,
        logo: s.logo,
        website: s.website,
        cards: s.cards,
        payment_options: s.payment_options,
      })),
      recommendedDeals: filteredDeals.map(d => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        club: d.club,
        supplier: d.supplier,
        category: d.category,
        price: d.price,
        original_price: d.original_price,
        discount_percent: d.discount_percent,
        coupon_code: d.coupon_code,
        image: d.image,
        url: d.url,
      })),
      recommendedBilling: filteredBilling.map(b => ({
        id: b.id,
        name: b.name,
        discount: b.discount,
        city: b.city,
        address: b.address,
        category: b.category,
        description: b.description,
        logo: b.logo,
        detail_url: b.detail_url,
        full_address: b.full_address,
      })),
      suggestedFollowUps: followUps,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: 'שגיאה בעיבוד הבקשה. אנא נסה שוב.',
      details: error?.message || 'Unknown error',
    });
  }
});

// Fallback intelligent responder when offline or API key missing
function generateFallbackResponse(
  query: string,
  stores: StoreItem[],
  deals: DealItem[],
  billingStores: BillingStoreItem[] = [],
  previousTopic: string = ''
): string {
  const qNorm = normalizeHebrew(query);
  const qLower = query.toLowerCase();

  // 1. Feedback handling ("thats bad... it should be a conversation")
  if (
    qNorm.includes('זה רע') ||
    qNorm.includes('לא טוב') ||
    qNorm.includes('שיחה') ||
    qNorm.includes('תדבר') ||
    qLower.includes('thats bad') ||
    qLower.includes('that is bad') ||
    qLower.includes('be a conversation') ||
    qLower.includes('chat')
  ) {
    if (qLower.includes('bad') || qLower.includes('conversation')) {
      return `You are completely right — let's have a genuine conversation rather than throwing isolated store lists at you!

I am your personal benefits advisor across **Behatsdaa** (IDF reservists & veterans), **UNIQ** (students & academics), and **Mastercard Day** (monthly benefits on the 10th for all Mastercard cardholders).

Feel free to ask me anything conversationally:
• Which club gives the highest discount for what you need (eSIMs, sneakers, pizza, tech, supermarkets)?
• How to combine rechargeable wallets (20%) with automatic credit card discounts?
• Any upcoming offers, coupons, or promo codes.

What are you currently planning to purchase? I'm listening!`;
    }

    return `אתה צודק לחלוטין – בוא ננהל שיחה אמיתית וזורמת במקום לזרוק רשימות חנויות מנותקות!

אני כאן כיועץ הפיננסי האישי שלך למועדוני **בהצדעה**, **UNIQ** ו-**Mastercard Day**. 
אתה יכול לשוחח איתי בחופשיות על כל נושא:
• איפה תקבל את אחוז ההנחה המקסימלי (חבילות eSIM לחו"ל, נעליים, פיצה, גאדג'טים, קניות בסופר).
• איך לשלב ארנק נטען של 20% עם הנחות במעמד החיוב.
• מה המבצעים הכי שווים שפתוחים כרגע בכל מועדון.

מה הדבר הבא שאתה מתכנן לקנות או לתכנן? אני פה איתך!`;
  }

  // 2. Mastercard Day scanning confirmation ("does it scan matercarday as well? they do have")
  const isMastercardQuery =
    qNorm.includes('mastercard') ||
    qNorm.includes('מאסטרקארד') ||
    qNorm.includes('מסטרקארד') ||
    qNorm.includes('mastercarday') ||
    qNorm.includes('matercarday') ||
    qNorm.includes('matercard') ||
    previousTopic.includes('mastercard') ||
    previousTopic.includes('mastercarday') ||
    previousTopic.includes('matercarday');

  const isScanningCheck =
    qLower.includes('scan') ||
    qLower.includes('they do have') ||
    qLower.includes('does it') ||
    qNorm.includes('סורק') ||
    qNorm.includes('כולל') ||
    qNorm.includes('יש להם') ||
    qNorm.includes('גם להם יש') ||
    qNorm.includes('גם לם יש');

  const isEsimQuestion =
    previousTopic.includes('esim') ||
    previousTopic.includes('איסים') ||
    previousTopic.includes('חו ל') ||
    previousTopic.includes('טיסה') ||
    previousTopic.includes('גלישה') ||
    qNorm.includes('esim') ||
    qNorm.includes('איסים') ||
    qNorm.includes('גלישה') ||
    qNorm.includes('voye') ||
    qNorm.includes('airalo');

  const isAllDealsQuestion =
    qLower.includes('all other') ||
    qLower.includes('other deals') ||
    qLower.includes('all deals') ||
    qLower.includes('options') ||
    qLower.includes('what else') ||
    qNorm.includes('עוד') ||
    qNorm.includes('שאר') ||
    qNorm.includes('כל') ||
    qNorm.includes('מבצעים') ||
    qNorm.includes('אפשרויות') ||
    qNorm.includes('דיי') ||
    qNorm.includes('הטבות נוספות');

  if (isMastercardQuery && (isScanningCheck || isEsimQuestion) && !isAllDealsQuestion) {
    if (qLower.includes('scan') || qLower.includes('they do have') || qLower.includes('esim') || qLower.includes('matercard')) {
      return `**Yes, absolutely!** Our portal fully scans, indexes, and tracks **Mastercard Day** benefits (which take place on the 10th of every month, with many extended through the 11th and all month long).

Regarding **eSIM and global travel data packages**, Mastercard Day actually offers some of the highest discounts available:

1. 🌐 **VOYE (eSIM)**:
   • **25% discount** on the 10th and 11th of the month.
   • **18% ongoing discount** for all other days of the month.
   • **Coupon Code**: \`MASTERCARDAY\` (apply at checkout on voye.com or their app with a Mastercard).

2. 📱 **Airalo (eSIM)**:
   • **20% discount** on the 10th and 11th of the month.
   • **15% ongoing discount** throughout the month.
   • **Coupon Code**: \`MASTERCARDAY\` (the world's most popular eSIM platform covering 200+ destinations).

✈️ **Complementary Travel Benefits on Mastercard Day:**
• **Gett Abroad**: 20 ₪ off taxi rides abroad in the Gett app (Coupon: \`mastercard 10\`).
• **Booking.com**: 4% wallet credit on hotel reservations (Coupon: \`MASTERCARDAY\`).

⚖️ **Comparison with Behatsdaa:**
• **For peak percentage (10th-11th)**: **VOYE on Mastercard Day (25%)** gives the highest rate.
• **For worldwide destination variety**: **Airalo (20% / 15%)** is premier.
• **For year-round zero-effort savings**: **Behatsdaa** gives **15% off GlobaleSIM** and **10% off BeSIM** directly on your credit card statement automatically without coupons or waiting for the 10th.`;
    }

    return `**כן, בהחלט!** הפורטל סורק ומעדכן את כל ההטבות והקופונים של **Mastercard Day** (שמתקיים בכל 10 בחודש, עם מבצעים שממשיכים גם ב-11 ובמהלך כל החודש).

בנושא **חבילות eSIM וגלישה בחו"ל**, ב-Mastercard Day יש שתי הטבות מובילות עם אחוזי הנחה מעולים:

1. 🌐 **VOYE (eSIM)**:
   • **25% הנחה** ב-10 וב-11 בחודש!
   • **18% הנחה קבועה** בכל שאר ימות החודש.
   • **קוד קופון**: \`MASTERCARDAY\` (תקף באתר ובאפליקציה למשלמים במאסטרקארד).

2. 📱 **Airalo (eSIM)**:
   • **20% הנחה** ב-10 וב-11 בחודש!
   • **15% הנחה קבועה** במהלך כל ימות החודש.
   • **קוד קופון**: \`MASTERCARDAY\` (ספק ה-eSIM הפופולרי בעולם עם כיסוי במאות יעדים).

✈️ **הטבות משלימות לטסים לחו"ל ב-Mastercard Day:**
• **Gett בחו"ל**: 20 ₪ הנחה בנסיעות בחו"ל באפליקציית Gett (קוד קופון: \`mastercard 10\`).
• **Booking.com**: 4% קרדיט כספי לארנק בהזמנת לינה ומלונות (קוד: \`MASTERCARDAY\`).

⚖️ **השוואת כדאיות מול מועדון בהצדעה:**
• **ב-10 וה-11 לחודש**: **VOYE ב-Mastercard Day מנצח עם 25% הנחה**!
• **למגוון יעדים עולמי רחב**: **Airalo (20% / 15%)** מציע שירות גלובלי מצוין.
• **לכל יום בשנה בלי לחכות לקופון**: ב**בהצדעה** יש לך את **GlobaleSIM עם 15% הנחה** ו-**BeSIM עם 10% הנחה** אוטומטית במעמד החיוב באשראי.`;
  }

  // 3. All other deals and options in Mastercard Day
  if (isMastercardQuery && isAllDealsQuestion) {
    if (qLower.includes('all other') || qLower.includes('deals') || qLower.includes('options')) {
      return `Here is a complete, curated guide to all the top deals and options available on **Mastercard Day** (held on the 10th of every month, with peak benefits on the 10th-11th and ongoing offers all month):

🛍️ **Fashion & Lifestyle:**
• **Terminal X**: 50 ₪ off on purchases over 250 ₪ (Coupon: \`MASTERCARDAY10\`)
• **adidas**: Extra 20% discount on official site and app (Coupon: \`MASTERCARDAY\`)
• **ALDO**, **GALI**, **Lee Cooper**, **Nine West**, **Minene**: 20% off (Coupon: \`MDAY20\` or \`MASTERCARDAY\`)
• **Timberland**, **Nautica**, **Guess**, **Emporium**: 15% off
• **Afrodita**: 20% off sitewide

🍔 **Culinary & Food Delivery:**
• **McDonald's**: 50% discount on select combo meals (Coupon: \`MASTERCARDAY\`)
• **Domino's Pizza**: 2 family pizzas + side dish for 130 ₪ (Coupon: \`MDAY130\`)
• **Golda**: 1 kg premium ice cream + 2 sauce jars for only 84 ₪ (Coupon: \`MASTERCARDAY\`)
• **Mishloha**: 30 ₪ off for new users (Coupon: \`MASTERCARDAY\`)
• **rebar**: 10 ₪ off any size M smoothie

💻 **Tech, Electronics & Gaming:**
• **Cinema & Electronics (עולם הקולנוע והחשמל)**: 200 ₪ off orders over 2,000 ₪ (Coupon: \`MASTERCARDAY\`)
• **BUG**: Up to 30% discount on select gaming and gadgets (Coupon: \`MASTERCARDAY\`)
• **Lenovo**: Extra 10% discount on laptops and accessories
• **Nintendo**: 10% discount on games and consoles
• **Last Price** & **Walla Shops**: 10% extra discount on electronics

✈️ **Travel & Global Connectivity:**
• **VOYE**: 25% off eSIM data packages on the 10th-11th (18% ongoing) (Coupon: \`MASTERCARDAY\`)
• **Airalo**: 20% off global eSIM packages on the 10th-11th (15% ongoing) (Coupon: \`MASTERCARDAY\`)
• **Gett Abroad**: 20 ₪ off taxi rides abroad (Coupon: \`mastercard 10\`)
• **Booking.com**: 4% wallet cashback credit (Coupon: \`MASTERCARDAY\`)

🛒 **Global Online Shopping:**
• **Amazon**: 10% off purchases over $49 (Coupon: \`MASTERCARDAY\`)
• **AliExpress**: $5 off orders over $35 (Coupon: \`MASTERCARDAY\`)

💡 **Pro Tip**: Use your Mastercard on the 10th to stack discounts with existing site sales, and remember that UNIQ and Behatsdaa wallets can be compared anytime!`;
    }

    return `הנה סקירה מקיפה ומסודרת של כל המבצעים והאפשרויות המובילות ב-**Mastercard Day** (שמתקיים בכל 10 בחודש, עם הטבות שיא ב-10-11 והטבות מתמשכות בכל החודש):

🛍️ **אופנה ולייף סטייל:**
• **Terminal X**: 50 ₪ הנחה בקנייה מעל 250 ₪ (קוד קופון: \`MASTERCARDAY10\`)
• **adidas**: אקסטרה 20% הנחה באתר ובאפליקציה (קוד: \`MASTERCARDAY\`)
• **ALDO**, **GALI**, **Lee Cooper**, **Nine West**, **Minene**: 20% הנחה (קוד: \`MDAY20\` / \`MASTERCARDAY\`)
• **Timberland**, **Nautica**, **Guess**, **Emporium**: 15% הנחה
• **אפרודיטה**: 20% הנחה על כל האתר

🍔 **קולינריה, מתוקים ומשלוחים:**
• **מקדונלד'ס**: 50% הנחה על מגוון ארוחות (קוד: \`MASTERCARDAY\`)
• **דומינו'ס פיצה**: 2 פיצות משפחתיות + נלווה ב-130 ₪ (קוד: \`MDAY130\`)
• **Golda**: 1 ק"ג גלידה + 2 רטבים ב-84 ₪ בלבד (קוד: \`MASTERCARDAY\`)
• **משלוחה**: 30 ₪ הנחה למזמינים חדשים (קוד: \`MASTERCARDAY\`)
• **rebar**: 10 ₪ הנחה על משקה M

💻 **חשמל, גיימינג ואלקטרוניקה:**
• **עולם הקולנוע והחשמל**: 200 ₪ הנחה בקנייה מעל 2,000 ₪ (קוד: \`MASTERCARDAY\`)
• **BUG**: עד 30% הנחה על מגוון מוצרי גיימינג ואלקטרוניקה (קוד: \`MASTERCARDAY\`)
• **Lenovo**: 10% הנחה נוספים על מחשבים ניידים
• **Nintendo**: 10% הנחה על קונסולות ומשחקים
• **Last Price** ו-**Walla Shops**: 10% הנחה על מוצרי חשמל

✈️ **תיירות ו-eSIM:**
• **VOYE**: 25% הנחה על חבילות גלישה ו-eSIM ב-10-11 (18% בשאר החודש)
• **Airalo**: 20% הנחה על חבילות אינטרנט עולמיות ב-10-11 (15% בשאר החודש)
• **Gett בחו"ל**: 20 ₪ הנחה בנסיעות (קוד: \`mastercard 10\`)
• **Booking.com**: 4% קרדיט כספי לארנק בהזמנת מלונות

🛒 **קניות בינלאומיות אונליין:**
• **Amazon**: 10% הנחה בקנייה מעל $49
• **AliExpress**: $5 הנחה בקנייה מעל $35

💡 **טיפ חשוב**: מרבית הקופונים מאפשרים כפל מבצעים עם מחירי המבצע באתרי הסחר עצמם.`;
  }

  // 4. Meta identity & capability responses
  if (
    qNorm.includes('מי אתה') ||
    qNorm.includes('מה אתה') ||
    qNorm.includes('ai') ||
    qNorm.includes('בינה מלאכותית') ||
    qNorm.includes('אמיתי') ||
    qNorm.includes('גולש ומבין') ||
    qLower.includes('who are you') ||
    qLower.includes('what are you')
  ) {
    return `שלום! אני סייר ה-AI והיועץ הפיננסי של פורטל **"ההטבות שלי"**, מבוסס מודלי השפה המתקדמים של Gemini מגוגל.

אני מחובר ישירות לקטלוג המלא של שלושת מועדוני הצרכנות המובילים:
1. **בהצדעה** – משרתי מילואים ולוחמים (ארנק נטען 20%, מעל 10,650 בתי עסק בהנחה אוטומטית במעמד החיוב באשראי, ושוברים מסובסדים).
2. **UNIQ** – סטודנטים ובוגרים אקדמאים (כרטיס נטען 15% ל-31 רשתות מובילות כולל טרמינל X, הטבות קולנוע וסבסודים).
3. **Mastercard Day** – כל מחזיקי מאסטרקארד בכל 10 בחודש (קופונים בלעדיים ל-VOYE, Airalo, Terminal X, adidas, דומינו'ס, אמזון ועוד).

אני כאן לשיחה חופשית, השוואת מועדונים וייעוץ חכם כדי להבטיח שתשלם את המחיר הנמוך ביותר בכל רכישה!`;
  }

  // 5. How does the site work?
  if (
    qNorm.includes('איך האתר עובד') ||
    qNorm.includes('איך משתמשים') ||
    qNorm.includes('הסבר על האתר') ||
    qNorm.includes('מה האתר') ||
    qLower.includes('how does')
  ) {
    return `פורטל **"ההטבות שלי"** הוא מנוע חיפוש והשוואה חכם המרכז את כל ההטבות של בהצדעה, UNIQ ו-Mastercard Day במקום אחד!

איך מפיקים מהאתר את המקסימום:
* 🔍 **מגה חיפוש**: חפש כל מוצר, רשת (כמו מגה ספורט, קולומביה), עיר (כמו תל אביב, חיפה) או קטגוריה, ותקבל תוצאות מכל המועדונים יחד.
* 💳 **השוואת שיטות תשלום**: גלה האם שווה להטעין כרטיס נטען מראש, לקנות שובר מוזל, או לשלם באשראי המועדון להנחה אוטומטית במעמד החיוב.
* ⚡ **תצוגה נקייה vs מורחבת**: כפתור "תצוגה נקייה" בראש הדף מאפשר מצב טבלאי מהיר וממוקד לחיפוש מיידי.
* 🤖 **סייר AI**: שוחח איתי בחופשיות ושאל אותי שאלות מורכבות על כדאיות תשלום.`;
  }

  // 6. Payment methods explanation
  if (
    qNorm.includes('הבדל') ||
    qNorm.includes('מעמד החיוב') ||
    qNorm.includes('ארנק נטען') ||
    qNorm.includes('איך מטעינים')
  ) {
    return `ישנם 3 אפיקי חיסכון עיקריים שכדאי להכיר ולשלב ביניהם:

1. 👛 **ארנק רשתות / כרטיס נטען (עד 20% הנחה)**:
   מטעינים מראש סכום כסף דיגיטלי באתר המועדון (משלמים למשל 80 ₪ ומקבלים 100 ₪ למימוש). תקף ברשתות האופנה, הספורט והבית הגדולות (מגה ספורט, שילב, פוקס הום, ורדינון, טרמינל X ועוד). מציגים את הקוד בקופה או מזינים באונליין.

2. 💳 **הנחה במעמד החיוב (2%-15% אוטומטית)**:
   השיטה הפשוטה ביותר: לא קונים שום דבר מראש! פשוט משלמים בבית העסק עם כרטיס האשראי של המועדון (בהצדעה/UNIQ), ובדף החשבון בסוף החודש יורד אחוז ההנחה באופן שקט ואוטומטי. תקף ביותר מ-**10,650 עסקים מקומיים** ברחבי הארץ.

3. 🎟️ **שוברים ומבצעים מסובסדים**:
   רכישת שובר מוגדר מראש במחיר מוזל (למשל כרטיס לסינמה סיטי ב-33 ₪ במקום 47 ₪, ארוחה במקדונלד'ס, או לינה במלונות).`;
  }

  // Fallback catalog list if user asked for a specific item
  if (stores.length === 0 && deals.length === 0 && billingStores.length === 0) {
    return `לא מצאתי תוצאות ספציפיות בקטלוג עבור **"${query}"**.
אפשר לחפש רשתות (מגה ספורט, פוקס, טרמינל X, קולומביה), תחומים (נעליים, פיצה, מלונות, מוסכים, שיניים, eSIM), או לשאול אותי שאלה חופשית על המועדונים וההטבות!`;
  }

  let text = `מצאתי מספר אפשרויות מצוינות בקטלוג עבור **"${query}"**:\n\n`;

  if (stores.length > 0) {
    text += `### 🏢 רשתות ומותגים מובילים:\n`;
    for (const s of stores.slice(0, 5)) {
      const clubsHeb = (s.clubs || []).map(c => c === 'behatsdaa' ? 'בהצדעה' : c === 'uniq' ? 'UNIQ' : 'Mastercard Day').join(', ');
      text += `* **${s.name}** (${s.category || 'כללי'}) – הנחה של עד **${s.max_discount || 0}%** במועדון **${clubsHeb}**.\n`;
    }
    text += `\n`;
  }

  if (deals.length > 0) {
    text += `### 🏷️ מבצעים ושוברים מומלצים:\n`;
    for (const d of deals.slice(0, 4)) {
      const priceText = d.price ? `ב-₪${d.price}` : '';
      const discText = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
      const clubName = d.club === 'behatsdaa' ? 'בהצדעה' : d.club === 'uniq' ? 'UNIQ' : 'Mastercard Day';
      text += `* **${d.title}** ${priceText}${discText} דרך מועדון ${clubName}.\n`;
    }
    text += `\n`;
  }

  if (billingStores.length > 0) {
    text += `### 💳 עסקים מקומיים בהנחה במעמד החיוב באשראי (מתוך 10,000+ סניפים):\n`;
    for (const b of billingStores.slice(0, 5)) {
      const locText = b.full_address || b.city ? ` (${b.full_address || b.city})` : '';
      text += `* **${b.name}**${locText} – **${b.discount}%** הנחה אוטומטית במעמד החיוב באשראי בהצדעה [${b.category || 'כללי'}].\n`;
    }
    text += `\n`;
  }

  text += `💡 **טיפ לחיסכון מרבי:** לפני ביצוע הרכישה, מומלץ לבדוק אם ניתן לשלם בארנק נטען בהצדעה (20%) או UNIQ (15%), או לשלם ישירות בכרטיס האשראי של המועדון להנחה אוטומטית בחשבון.`;
  return text;
}

// Serve Vite in development or static dist in production
async function startServer() {
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic import of Vite in development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
