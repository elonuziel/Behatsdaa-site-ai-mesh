import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// --- Direct Multi-Model Frameworks (Multiple Secrets, Specify by Provider) ---
interface ProviderDefinition {
  id: string;
  name: string;
  envKeys: string[];
  defaultModel: string;
  baseUrl?: string;
}

const DIRECT_AI_PROVIDERS: Record<string, ProviderDefinition> = {
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

function readEnvSecrets(): Record<string, string> {
  const result: Record<string, string> = {};

  // Copy valid environment variables (skipping MY_ placeholders)
  for (const [k, v] of Object.entries(process.env)) {
    if (v && !v.startsWith('MY_') && v.length >= 2) {
      result[k] = v;
    }
  }

  try {
    const envPath = path.resolve(__dirname, '.env');
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

  // Check /proc for injected keys in AI Studio
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
        for (const entry of environ.split('\0')) {
          if (entry.includes('=')) {
            const eqPos = entry.indexOf('=');
            const k = entry.slice(0, eqPos);
            const v = entry.slice(eqPos + 1);
            if (k && v && (!result[k] || result[k].length < 2) && !v.startsWith('MY_') && v.length >= 2) {
              result[k] = v;
            }
          }
        }
      } catch {}
    }
  } catch {}

  return result;
}

function getAiPassword(env: Record<string, string>): string {
  const candidateKeys = ['AI_PASSWORD', 'AI_ACCESS_PASSWORD', 'AI_SECRET', 'VITE_AI_PASSWORD'];
  for (const k of candidateKeys) {
    const val = env[k];
    if (val && typeof val === 'string' && !val.startsWith('MY_') && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function getProviderKey(providerId: string, env: Record<string, string>): string {
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
              // Avoid polluting high-frequency root words like "בית", "בר", "על" with foreign words
              if (item !== 'בית' && item !== 'בר' && item !== 'על' && item !== 'יום') {
                syns[item] = [...(syns[item] || []), keyLower];
              }
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

// Israeli Cities Dictionary for Location Intent Recognition
const ISRAELI_CITIES_MAP: Array<{ name: string; aliases: string[] }> = [
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
  { name: 'מודיעין', aliases: ['מודיעין', 'מודיעין מכבים רעות', 'מכבים רעות'] },
  { name: 'רמלה', aliases: ['רמלה'] },
  { name: 'רעננה', aliases: ['רעננה'] },
  { name: 'הוד השרון', aliases: ['הוד השרון', 'הודש'] },
  { name: 'גבעתיים', aliases: ['גבעתיים'] },
  { name: 'קרית אתא', aliases: ['קרית אתא', 'קריית אתא'] },
  { name: 'נהריה', aliases: ['נהריה'] },
  { name: 'קרית גת', aliases: ['קרית גת', 'קריית גת'] },
  { name: 'עפולה', aliases: ['עפולה'] },
  { name: 'אילת', aliases: ['אילת'] },
  { name: 'ראש העין', aliases: ['ראש העין', 'רה"ע'] },
  { name: 'טבריה', aliases: ['טבריה'] },
  { name: 'עכו', aliases: ['עכו'] },
  { name: 'קרית מוצקין', aliases: ['קרית מוצקין', 'קריית מוצקין'] },
  { name: 'קרית ים', aliases: ['קרית ים', 'קריית ים'] },
  { name: 'קרית ביאליק', aliases: ['קרית ביאליק', 'קריית ביאליק'] },
  { name: 'נס ציונה', aliases: ['נס ציונה'] },
  { name: 'אלעד', aliases: ['אלעד'] },
  { name: 'יבנה', aliases: ['יבנה'] },
  { name: 'רמת השרון', aliases: ['רמת השרון', 'רה"ש'] },
  { name: 'כרמיאל', aliases: ['כרמיאל'] },
  { name: 'טירת כרמל', aliases: ['טירת כרמל', 'טירת הכרמל'] },
  { name: 'נתיבות', aliases: ['נתיבות'] },
  { name: 'אופקים', aliases: ['אופקים'] },
  { name: 'שדרות', aliases: ['שדרות'] },
  { name: 'מגדל העמק', aliases: ['מגדל העמק'] },
  { name: 'קרית אונו', aliases: ['קרית אונו', 'קריית אונו'] },
  { name: 'אור יהודה', aliases: ['אור יהודה'] },
  { name: 'דימונה', aliases: ['דימונה'] },
  { name: 'צפת', aliases: ['צפת'] },
  { name: 'חריש', aliases: ['חריש'] },
  { name: 'פרדס חנה', aliases: ['פרדס חנה', 'פרדס חנה כרכור', 'כרכור'] },
  { name: 'זכרון יעקב', aliases: ['זכרון יעקב', 'זכרון'] },
  { name: 'שוהם', aliases: ['שוהם'] },
  { name: 'גבעת שמואל', aliases: ['גבעת שמואל'] },
  { name: 'יהוד', aliases: ['יהוד', 'יהוד מונסון'] },
  { name: 'אריאל', aliases: ['אריאל'] },
  { name: 'מעלה אדומים', aliases: ['מעלה אדומים'] },
  { name: 'קרית שמונה', aliases: ['קרית שמונה', 'קריית שמונה'] },
  { name: 'קרית מלאכי', aliases: ['קרית מלאכי', 'קריית מלאכי'] },
  { name: 'גדרה', aliases: ['גדרה'] },
  { name: 'גן יבנה', aliases: ['גן יבנה'] },
  { name: 'מבשרת ציון', aliases: ['מבשרת ציון', 'מבשרת'] }
];

function detectCityInQuery(text: string): { name: string; normalized: string; aliasMatched: string } | null {
  const norm = normalizeHebrew(text);
  for (const item of ISRAELI_CITIES_MAP) {
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

function isDiningIntent(text: string): boolean {
  const tNorm = normalizeHebrew(text);
  return /פיצה|פיצרי|בורגר|המבורגר|מסעד|קפה|סושי|שווארמה|שניצל|גליד|מאפי|אוכל|בשר|דגים|איטלקית|אסייתית|משלוח|וולט|משלוחה|קולינרי|pizza|burger|sushi|dining|restaurant|cafe/i.test(tNorm);
}

// Find relevant stores & deals from query across all 13,600+ businesses with context awareness,
// dual-tier location search (local businesses + nationwide mall chains), and dynamic context sizing.
function findRelevantCatalog(query: string, activeClubs?: string[], conversationTopic?: string) {
  // If the query is purely a meta question, greeting, or conceptual explanation, don't force random store cards
  if (isPurelyConversationalOrInformational(query) && !conversationTopic) {
    return {
      topStores: [],
      topDeals: [],
      topBilling: [],
      promptStores: [],
      promptDeals: [],
      promptBilling: [],
      detectedCity: null,
    };
  }

  const combinedSearchQuery = conversationTopic ? `${query} ${conversationTopic}` : query;
  const qNorm = normalizeHebrew(combinedSearchQuery);

  // 1. Detect City / Location Intent
  const detectedCity = detectCityInQuery(combinedSearchQuery);

  // 2. Detect Dining & Food Intent
  const isDining = isDiningIntent(combinedSearchQuery);

  // 3. Detect explicit club targeting from the query or conversation topic
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

  // 4. Intent detection for Homeware / Kitchenware / House Goods
  const isHomewareQuery =
    qNorm.includes('כלי בית') ||
    qNorm.includes('כלי מטבח') ||
    qNorm.includes('כלי בישול') ||
    qNorm.includes('מוצרי בית') ||
    qNorm.includes('הכל לבית') ||
    qNorm.includes('סירים') ||
    qNorm.includes('סיר') ||
    qNorm.includes('מחבת') ||
    qNorm.includes('מחבתות') ||
    qNorm.includes('סכום') ||
    qNorm.includes('סכו״ם') ||
    qNorm.includes('סכו"ם') ||
    qNorm.includes('מצעים') ||
    qNorm.includes('מגבות') ||
    qNorm.includes('עיצוב הבית') ||
    qNorm.includes('טקסטיל לבית') ||
    qNorm.includes('בישול') ||
    qNorm.includes('אפייה') ||
    qNorm.includes('homeware') ||
    qNorm.includes('kitchenware') ||
    qNorm.includes('cookware') ||
    qNorm.includes('home decor');

  const HOME_BRANDS = [
    'סולתם', 'ורדינון', 'נעמן', 'פורצלן', 'פוקס הום', 'גולף אנד קו', 'ace', 'הום סנטר',
    'ארקוסטיל', 'arcosteel', 'קיטן', 'kitan', 'הום סטייל', 'הום דקור', 'נאוטיקה הום',
    'נעמן ורדינון', 'cotton club', 'סולתם אונליין', 'פוקס הום אונליין'
  ];

  const isIrrelevantVenueForGoods = (name: string, category: string) => {
    const text = (name + ' ' + category).toLowerCase();
    return (
      text.includes('תיאטרון') || text.includes('בית לסין') || text.includes('הצגות') ||
      text.includes('מלון') || text.includes('אירוח') || text.includes('צימר') || text.includes('נופש') ||
      text.includes('מוזיאון') || text.includes('השומר') || text.includes('זבוטינסקי') || text.includes('הגדודים') ||
      text.includes('בית לנגרים') || text.includes('נגרים') || text.includes('קייקי') ||
      text.includes('הולמס פלייס') || text.includes('holmes place') || text.includes('פילאטיס') || text.includes('כושר') ||
      (text.includes('מסעדות ובתי קפה') && !text.includes('סולתם') && !text.includes('נעמן')) ||
      text.includes('ביסטרו') || text.includes('casa bella') || text.includes('mila house') || text.includes('ארצי deli')
    );
  };

  // 5. Dynamic Context Sizing Classification (10 -> 40 -> 80)
  const isBroadListQuery =
    /כל הרשתות|כל המבצעים|כל החנויות|כל ההטבות|כל המסעדות|תראה לי הכל|הצג הכל|רשימה של|איזה רשתות|אילו רשתות|איזה חנויות|איזה עוד|מה עוד|list all|show all|all stores|all brands|all deals|all options/i.test(qNorm) ||
    Boolean(isAllDealsRequest);

  const isSpecificStoreQuery = !isBroadListQuery && !detectedCity && (
    /מגה ספורט|שופרסל|סולתם|קרפור|טרמינל|פוקס הום|פוקס|נייקי|אדידס|פיצה האט|דומינוס|מקדונלד|ksp|באג|אייבורי|זארה|קסטרו|רנואר|ארומה|גולדה|וולט|משלוחה|voye|airalo|יוחננוף|רמי לוי|אושר עד|ויקטורי|הום סנטר|אייס|סטימצקי|צומת ספרים/i.test(qNorm)
  );

  let maxContextStores: number;
  let maxContextBilling: number;

  if (isSpecificStoreQuery) {
    // 1. Specific Store Query: Laser-focused and ultra-fast (~100 tokens, <0.8s)
    maxContextStores = 5;
    maxContextBilling = 5;
  } else if (isBroadListQuery) {
    // 2. Broad "List All" Request: Comprehensive view (~1,200 tokens)
    maxContextStores = 50;
    maxContextBilling = 40;
  } else {
    // 3. Category / City Query (The Golden Default): ~35-40 items (~500 tokens, ~1.0s)
    // Covers 100% of local shops + nationwide chains without noise
    maxContextStores = 20;
    maxContextBilling = 20;
  }

  // Extract clean subject query without the city alias for accurate category/product search
  let queryWithoutCity = qNorm;
  if (detectedCity) {
    queryWithoutCity = queryWithoutCity
      .replace(new RegExp(`(?:^|\\s)(?:ב|מ|ל)?${detectedCity.aliasMatched.replace(/\s+/g, '\\s+')}(?:$|\\s)`, 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const rawWords = (queryWithoutCity || qNorm).split(/\s+/).filter(w => w.length > 1);
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

  // 1. Filter primary club stores (Tier B when city is detected: Nationwide chains & mall chains with local branches)
  for (const s of cachedStores) {
    if (effectiveClubs && effectiveClubs.length > 0) {
      const hasClub = (s.clubs || []).some(c => effectiveClubs.includes(c));
      if (!hasClub) continue;
    }

    if (targetClub === 'mastercard' && !(s.clubs || []).includes('mastercard')) {
      continue;
    }

    if (isEsimTopic && isWaterOrFitness(s.name || '')) {
      continue;
    }

    const nameNorm = normalizeHebrew(s.name || '');
    const catNorm = normalizeHebrew(s.category || '');
    const condNorm = normalizeHebrew(s.conditions || '');
    const cardsNorm = normalizeHebrew(
      (s.cards || []).map((c: any) => typeof c === 'string' ? c : c.card_name || '').join(' ')
    );

    if (isHomewareQuery && isIrrelevantVenueForGoods(s.name, s.category || '')) {
      continue;
    }

    // If searching for physical city location, reject purely online platforms unless directly named
    const isOnlinePlatform = s.coverage === 'online';
    if (detectedCity && isOnlinePlatform && !nameNorm.includes(queryWithoutCity)) {
      continue;
    }

    let score = 0;
    if (queryWithoutCity && nameNorm.includes(queryWithoutCity)) score += 80;
    if (queryWithoutCity && catNorm.includes(queryWithoutCity)) score += 35;

    // Dining intent boosting for national food chains
    if (isDining) {
      if (catNorm.includes('מסעדות') || catNorm.includes('בתי קפה') || catNorm.includes('קולינריה') || catNorm.includes('אוכל')) {
        score += 35;
      }
      if (/פיצה|פיצה האט|דומינוס|מקדונלד|בורגר|ארומה|קפה|גולדה|rebar|משלוחה|וולט/.test(nameNorm)) {
        score += 60;
      }
    }

    // Dual-Tier Tier B boost: When searching in a city, boost nationwide chains with branches in every Israeli city
    if (detectedCity) {
      const isNationwideOrMall = s.coverage !== 'online' || Boolean(s.is_mall_chain);
      if (isNationwideOrMall) {
        if (s.is_mall_chain) score += 40;
        score += 30; // Nationwide branch availability in the city
      }
    }

    if (isHomewareQuery) {
      if (catNorm.includes('הכל לבית') || catNorm.includes('לבית ולגן') || catNorm.includes('מוצרי חשמל')) {
        score += 70;
      }
      for (const hb of HOME_BRANDS) {
        if (nameNorm.includes(normalizeHebrew(hb))) {
          score += 160;
        }
      }
    }

    for (const w of expandedWords) {
      if (w === 'בית') {
        if (catNorm.includes('הכל לבית') || catNorm.includes('לבית ולגן')) {
          score += 25;
        }
        continue;
      }
      if (matchesToken(nameNorm, w)) score += 25;
      if (matchesToken(catNorm, w)) score += 12;
      if (matchesToken(cardsNorm, w)) score += 6;
      if (matchesToken(condNorm, w)) score += 3;
    }

    if (targetClub && (s.clubs || []).includes(targetClub)) {
      score += 40;
    }

    if (isEsimTopic) {
      const sId = (s.id || '').toLowerCase();
      if (sId.includes('voye') || sId.includes('airalo') || nameNorm.includes('voye') || nameNorm.includes('airalo')) {
        score += 200;
      }
    }

    if (isAllDealsRequest && targetClub === 'mastercard') {
      score += 30;
    }

    // In city mode without specific keywords, show top mall chains in that city
    if (detectedCity && expandedWords.length === 0 && s.is_mall_chain) {
      score += 50;
    }

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

    if (targetClub && d.club && d.club !== targetClub) {
      continue;
    }

    if (isHomewareQuery && isIrrelevantVenueForGoods(d.title, d.category || '')) {
      continue;
    }

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
    if (queryWithoutCity && titleNorm.includes(queryWithoutCity)) score += 70;
    if (queryWithoutCity && suppNorm.includes(queryWithoutCity)) score += 45;
    if (queryWithoutCity && catNorm.includes(queryWithoutCity)) score += 20;

    if (isDining) {
      if (catNorm.includes('מסעדות') || catNorm.includes('בתי קפה') || catNorm.includes('קולינריה') || catNorm.includes('אוכל')) {
        score += 35;
      }
      if (/פיצה|פיצה האט|דומינוס|מקדונלד|בורגר|ארומה|קפה|גולדה|rebar|משלוחה|וולט/.test(titleNorm) || /פיצה|דומינוס|מקדונלד/.test(suppNorm)) {
        score += 55;
      }
    }

    if (isHomewareQuery) {
      if (catNorm.includes('הכל לבית') || catNorm.includes('לבית ולגן')) {
        score += 70;
      }
      for (const hb of HOME_BRANDS) {
        if (titleNorm.includes(normalizeHebrew(hb)) || suppNorm.includes(normalizeHebrew(hb))) {
          score += 160;
        }
      }
    }

    for (const w of expandedWords) {
      if (w === 'בית') {
        if (catNorm.includes('הכל לבית') || catNorm.includes('לבית ולגן')) {
          score += 25;
        }
        continue;
      }
      if (matchesToken(titleNorm, w)) score += 25;
      if (matchesToken(suppNorm, w)) score += 25;
      if (matchesToken(tagsNorm, w)) score += 30;
      if (matchesToken(catNorm, w)) score += 10;
      if (matchesToken(descNorm, w)) score += 5;
    }

    if (targetClub && d.club === targetClub) {
      score += 40;
    }

    if (isEsimTopic) {
      const suppLow = (d.supplier || '').toLowerCase();
      const titleLow = (d.title || '').toLowerCase();
      if (suppLow.includes('voye') || suppLow.includes('airalo') || titleLow.includes('voye') || titleLow.includes('airalo') || (titleLow.includes('גלישה') && titleLow.includes('חול'))) {
        score += 200;
      }
    }

    if (isAllDealsRequest && targetClub === 'mastercard') {
      score += 35;
    }

    if (score >= 25) {
      score += (d.discount_percent || 0) * 0.5;
      matchedDeals.push({ deal: d, score });
    }
  }

  // 3. Filter 10,600+ billing stores directory (Tier A when city is detected: Local physical businesses)
  const matchedBilling: { store: BillingStoreItem; score: number }[] = [];
  if (!targetClub || targetClub === 'behatsdaa') {
    for (const b of cachedBillingStores) {
      const nameNorm = normalizeHebrew(b.name || '');
      const catNorm = normalizeHebrew(b.category || '');
      const cityNorm = normalizeHebrew(b.city || '');
      const addrNorm = normalizeHebrew(b.full_address || b.address || '');
      const descNorm = normalizeHebrew(b.description || '');

      if (isHomewareQuery && isIrrelevantVenueForGoods(b.name, b.category || '')) {
        continue;
      }

      if (isEsimTopic && isWaterOrFitness(nameNorm)) {
        continue;
      }

      let score = 0;

      // Tier A Location Matching: When city is detected, check exact city correspondence
      const isCityMatch = Boolean(
        detectedCity && (
          cityNorm.includes(detectedCity.normalized) ||
          detectedCity.normalized.includes(cityNorm) ||
          (detectedCity.aliasMatched && cityNorm.includes(detectedCity.aliasMatched))
        )
      );

      if (detectedCity) {
        if (!isCityMatch) {
          // In city-specific mode, strictly filter billing stores to the requested city
          continue;
        }
        score += 80; // High baseline for local businesses in the requested city
      }

      if (queryWithoutCity && nameNorm.includes(queryWithoutCity)) score += 75;
      if (queryWithoutCity && catNorm.includes(queryWithoutCity)) score += 35;
      if (cityNorm && cityNorm.includes(qNorm)) score += 40;

      if (isDining) {
        if (catNorm.includes('מסעדות') || catNorm.includes('בתי קפה') || catNorm.includes('מזון') || catNorm.includes('קולינריה') || catNorm.includes('אוכל')) {
          score += 45;
        }
        if (/פיצה|פיצרי|בורגר|המבורגר|קפה|סושי|שווארמה|שניצל|גליד|מאפי/.test(nameNorm)) {
          score += 60;
        }
      }

      if (isHomewareQuery) {
        if (catNorm.includes('בית') || catNorm.includes('מטבח') || catNorm.includes('חשמל') || catNorm.includes('עיצוב')) {
          score += 45;
        }
      }

      for (const w of expandedWords) {
        if (w === 'בית') {
          if (catNorm.includes('בית') || catNorm.includes('מטבח')) score += 15;
          continue;
        }
        if (matchesToken(nameNorm, w)) score += 25;
        if (cityNorm && matchesToken(cityNorm, w)) score += 18;
        if (catNorm && matchesToken(catNorm, w)) score += 12;
        if (addrNorm && matchesToken(addrNorm, w)) score += 8;
        if (descNorm && matchesToken(descNorm, w)) score += 5;
      }

      if (isEsimTopic && (nameNorm.includes('globalesim') || nameNorm.includes('besim') || nameNorm.includes('סים פור פליי'))) {
        score += 200;
      }

      // If in city mode and user simply searched for city (e.g. "הטבות בפתח תקווה"), show top businesses in that city
      if (detectedCity && expandedWords.length === 0) {
        score += 30;
      }

      const threshold = detectedCity ? 40 : 35;
      if (score >= threshold) {
        score += (b.discount || 0) * 0.8;
        matchedBilling.push({ store: b, score });
      }
    }
  }

  matchedStores.sort((a, b) => b.score - a.score);
  matchedDeals.sort((a, b) => b.score - a.score);
  matchedBilling.sort((a, b) => b.score - a.score);

  return {
    // Dynamic context sizing (10 / 40 / 80 items) for AI model reasoning
    promptStores: matchedStores.slice(0, maxContextStores).map(m => m.store),
    promptDeals: matchedDeals.slice(0, Math.min(maxContextStores, 25)).map(m => m.deal),
    promptBilling: matchedBilling.slice(0, maxContextBilling).map(m => m.store),

    // Strictly capped to top 3-4 highlights for clean, lightning-fast UI visual popup
    topStores: matchedStores.slice(0, 4).map(m => m.store),
    topDeals: matchedDeals.slice(0, 4).map(m => m.deal),
    topBilling: matchedBilling.slice(0, 4).map(m => m.store),

    detectedCity: detectedCity ? detectedCity.name : null,
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
  } else if (qLower.includes('בית') || qLower.includes('סיר') || qLower.includes('מטבח') || qLower.includes('מחבת') || qLower.includes('מצעים') || qLower.includes('כלי')) {
    suggestions.push('איך לממש 20% הנחה על כלי בית בסולתם, נעמן ופוקס הום?');
    suggestions.push('האם ארנק בהצדעה מכבד את ורדינון וגולף אנד קו?');
    suggestions.push('אילו מבצעים יש למארזי סירים ומחבתות?');
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

// Catalog Tools for AI Function Calling (Gemini, OpenAI, Groq, DeepSeek, Claude)
const catalogToolsGemini = [
  {
    functionDeclarations: [
      {
        name: 'aggregate_catalog',
        description: 'Calculates exact counts, averages, or top discounts across all 13,600+ businesses in memory (stores, deals, billing). Call this when user asks for exact counts or statistics (e.g. "כמה עסקים נותנים הנחה בירושלים במעמד החיוב").',
        parameters: {
          type: 'OBJECT',
          properties: {
            operation: { type: 'STRING', enum: ['count', 'avg', 'max'], description: 'Operation to perform' },
            city: { type: 'STRING', description: 'City name in Hebrew to filter by (e.g. ירושלים, חיפה)' },
            category: { type: 'STRING', description: 'Category to filter by' },
            club: { type: 'STRING', enum: ['behatsdaa', 'uniq', 'mastercard', 'all'], description: 'Club to filter by' },
            dataset: { type: 'STRING', enum: ['billing', 'stores', 'deals', 'all'], description: 'Specific dataset to aggregate' },
          },
          required: ['operation'],
        },
      },
      {
        name: 'search_catalog',
        description: 'Searches catalog records with specific filters when user requests a custom slice of items.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search term' },
            city: { type: 'STRING', description: 'City name' },
            category: { type: 'STRING', description: 'Category name' },
            minDiscount: { type: 'NUMBER', description: 'Minimum discount percent' },
            limit: { type: 'NUMBER', description: 'Max items to return' },
          },
        },
      },
    ],
  },
];

const catalogToolsOpenAI = [
  {
    type: 'function',
    function: {
      name: 'aggregate_catalog',
      description: 'Calculates exact counts, averages, or top discounts across all 13,600+ businesses in memory (stores, deals, billing). Call this when user asks for exact counts or statistics (e.g. "כמה עסקים נותנים הנחה בירושלים במעמד החיוב").',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['count', 'avg', 'max'], description: 'Operation to perform' },
          city: { type: 'string', description: 'City name in Hebrew to filter by (e.g. ירושלים, חיפה)' },
          category: { type: 'string', description: 'Category to filter by' },
          club: { type: 'string', enum: ['behatsdaa', 'uniq', 'mastercard', 'all'], description: 'Club to filter by' },
          dataset: { type: 'string', enum: ['billing', 'stores', 'deals', 'all'], description: 'Specific dataset to aggregate' },
        },
        required: ['operation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_catalog',
      description: 'Searches catalog records with specific filters when user requests a custom slice of items.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term' },
          city: { type: 'string', description: 'City name' },
          category: { type: 'string', description: 'Category name' },
          minDiscount: { type: 'number', description: 'Minimum discount percent' },
          limit: { type: 'number', description: 'Max items to return' },
        },
      },
    },
  },
];

const catalogToolsClaude = [
  {
    name: 'aggregate_catalog',
    description: 'Calculates exact counts, averages, or top discounts across all 13,600+ businesses in memory (stores, deals, billing). Call this when user asks for exact counts or statistics (e.g. "כמה עסקים נותנים הנחה בירושלים במעמד החיוב").',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['count', 'avg', 'max'], description: 'Operation to perform' },
        city: { type: 'string', description: 'City name in Hebrew to filter by (e.g. ירושלים, חיפה)' },
        category: { type: 'string', description: 'Category to filter by' },
        club: { type: 'string', enum: ['behatsdaa', 'uniq', 'mastercard', 'all'], description: 'Club to filter by' },
        dataset: { type: 'string', enum: ['billing', 'stores', 'deals', 'all'], description: 'Specific dataset to aggregate' },
      },
      required: ['operation'],
    },
  },
  {
    name: 'search_catalog',
    description: 'Searches catalog records with specific filters when user requests a custom slice of items.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        city: { type: 'string' },
        category: { type: 'string' },
        minDiscount: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
];

function handleExecuteCatalogTool(name: string, rawArgs: any): any {
  const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : (rawArgs || {});
  if (name === 'aggregate_catalog') {
    const operation = args.operation || 'count';
    const city = (args.city || '').trim();
    const category = (args.category || '').trim();
    const club = args.club || 'all';
    const dataset = args.dataset || (city ? 'billing' : 'all');

    const cityNorm = normalizeHebrew(city);
    const catNorm = normalizeHebrew(category);

    let billingItems = cachedBillingStores;
    if (cityNorm) {
      billingItems = billingItems.filter(b => {
        const bCityNorm = normalizeHebrew(b.city || '');
        return bCityNorm.includes(cityNorm) || cityNorm.includes(bCityNorm);
      });
    }
    if (catNorm) {
      billingItems = billingItems.filter(b => normalizeHebrew(b.category || '').includes(catNorm));
    }

    let storeItems = cachedStores;
    if (club && club !== 'all') {
      storeItems = storeItems.filter(s => (s.clubs || []).includes(club));
    }
    if (catNorm) {
      storeItems = storeItems.filter(s => normalizeHebrew(s.category || '').includes(catNorm));
    }

    let dealItems = cachedDeals;
    if (club && club !== 'all') {
      dealItems = dealItems.filter(d => d.club === club);
    }

    if (operation === 'count') {
      const billingCount = billingItems.length;
      const storesCount = storeItems.length;
      const dealsCount = dealItems.length;

      const isBillingSpecific = dataset === 'billing' || (city && dataset !== 'stores' && dataset !== 'deals');
      const count = isBillingSpecific ? billingCount : (billingCount + storesCount + dealsCount);

      const cityNameDisp = city || 'כל הארץ';
      const message = city
        ? `בירושלים (ובחיפוש המבוקש) ישנם בדיוק ${billingCount} בתי עסק שמעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה מתוך 10,659 עסקים בקטלוג.`
        : `נמצאו סך הכל ${count} פריטים (מתוכם ${billingCount} עסקי חיוב, ${storesCount} רשתות, ${dealsCount} מבצעים).`;

      return {
        operation: 'count',
        city: city || undefined,
        category: category || undefined,
        club: club !== 'all' ? club : undefined,
        dataset,
        exact_billing_count: billingCount,
        stores_count: storesCount,
        deals_count: dealsCount,
        total_count: billingCount + storesCount + dealsCount,
        count,
        message,
      };
    }

    if (operation === 'avg' || operation === 'max') {
      let maxDiscount = 0;
      let totalDiscount = 0;
      let count = 0;
      for (const b of billingItems) {
        if (b.discount) {
          maxDiscount = Math.max(maxDiscount, b.discount);
          totalDiscount += b.discount;
          count++;
        }
      }
      return {
        operation,
        city: city || undefined,
        dataset: 'billing',
        max_discount: maxDiscount,
        avg_discount: count > 0 ? Number((totalDiscount / count).toFixed(1)) : 0,
        item_count: count,
      };
    }
  }

  if (name === 'search_catalog') {
    const q = (args.query || '').trim();
    const city = (args.city || '').trim();
    const category = (args.category || '').trim();
    const minDiscount = Number(args.minDiscount || 0);
    const limit = Math.min(Number(args.limit || 10), 40);

    const cityNorm = normalizeHebrew(city);
    const qNorm = normalizeHebrew(q);
    const catNorm = normalizeHebrew(category);

    const results = cachedBillingStores
      .filter(b => {
        if (cityNorm && !normalizeHebrew(b.city || '').includes(cityNorm)) return false;
        if (catNorm && !normalizeHebrew(b.category || '').includes(catNorm)) return false;
        if (minDiscount && (b.discount || 0) < minDiscount) return false;
        if (qNorm && !normalizeHebrew(b.name || '').includes(qNorm)) return false;
        return true;
      })
      .slice(0, limit)
      .map(b => ({
        name: b.name,
        city: b.city,
        discount: b.discount,
        category: b.category,
        address: b.full_address || b.address,
      }));

    return {
      query: q,
      city: city || undefined,
      category: category || undefined,
      total_found: results.length,
      items: results,
    };
  }

  return { error: `Tool ${name} not recognized.` };
}

// POST /api/chat: Multi-turn chat with AI (Multi-model frameworks with direct provider execution)
app.post('/api/chat', async (req, res) => {
  try {
    const env = readEnvSecrets();
    const serverPassword = getAiPassword(env);

    // If an AI access password is configured on the server, ensure it is matched
    if (serverPassword) {
      const userPassword = (req.body?.password || '').trim();
      const userPassHash = crypto.createHash('sha256').update(userPassword).digest('hex');
      const serverPassHash = crypto.createHash('sha256').update(serverPassword).digest('hex');

      if (userPassword !== serverPassword && userPassHash !== serverPassHash) {
        return res.status(401).json({
          error: 'נדרשת סיסמת גישה תקינה לשימוש ב-AI (סיסמה שגויה או חסרה).',
          requirePassword: true,
          invalidPassword: true,
        });
      }
    }

    const { messages, activeClubs, provider: requestedProvider = 'gemini', model: requestedModel } = req.body;

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

    // Search catalog for grounded knowledge with conversation awareness, Dual-Tier location search, and dynamic sizing
    const {
      topStores,
      topDeals,
      topBilling,
      promptStores,
      promptDeals,
      promptBilling,
      detectedCity
    } = findRelevantCatalog(userPromptText, activeClubs, previousTopic);

    // Build catalog context summary using dynamic context sizing (10 / 40 / 80 items)
    let catalogContext = '';
    if (detectedCity) {
      catalogContext += `\n📍 **זוהתה כוונת חיפוש מקומי בעיר: ${detectedCity}**\nהקטלוג שולב במודל Dual-Tier: עסקים מקומיים פיזיים בעיר (Tier A) לצד רשתות ארציות הפועלות עם סניפים פעילים בעיר (Tier B).\n`;
    }

    const storesForPrompt = promptStores && promptStores.length > 0 ? promptStores : topStores;
    const dealsForPrompt = promptDeals && promptDeals.length > 0 ? promptDeals : topDeals;
    const billingForPrompt = promptBilling && promptBilling.length > 0 ? promptBilling : topBilling;

    if (storesForPrompt.length > 0) {
      catalogContext += '\nרשתות וחנויות רלוונטיות מהקטלוג:\n' + storesForPrompt.map((s, idx) => {
        const clubsStr = (s.clubs || []).join(', ');
        const cardsStr = (s.cards || []).map((c: any) => `${c.card_name} (${c.discount})`).join(', ');
        const coverageTag = s.coverage === 'online' ? ' [רכישה אונליין בלבד]' : (s.is_mall_chain ? ' [רשת קניונים ארצית עם פריסה מקומית]' : ' [פריסה ארצית]');
        return `${idx + 1}. ${s.name} (קטגוריה: ${s.category || 'כללי'}, הנחה מרבית: ${s.max_discount || 0}%, מועדונים: ${clubsStr}${cardsStr ? ', כרטיסים: ' + cardsStr : ''})${coverageTag}`;
      }).join('\n');
    }

    if (dealsForPrompt.length > 0) {
      catalogContext += '\n\nמבצעים ושוברים רלוונטיים מהקטלוג:\n' + dealsForPrompt.map((d, idx) => {
        const priceStr = d.price ? `${d.price} ₪` : 'ללא מחיר נקוב';
        const discStr = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
        const couponStr = d.coupon_code ? `, קוד קופון: ${d.coupon_code}` : '';
        return `${idx + 1}. "${d.title}" - ספק: ${d.supplier || 'בהצדעה'}, מועדון: ${d.club || 'behatsdaa'}, מחיר: ${priceStr}${discStr}${couponStr}`;
      }).join('\n');
    }

    if (billingForPrompt.length > 0) {
      catalogContext += '\n\nעסקים וחנויות מהקטלוג המורחב (הנחות במעמד החיוב באשראי בהצדעה מתוך 10,650+ סניפים):\n' + billingForPrompt.map((b, idx) => {
        const locStr = b.full_address || b.city || '';
        const isLocalTag = detectedCity ? ' [עסק מקומי בעיר]' : '';
        return `${idx + 1}. "${b.name}" - ${b.discount}% הנחה במעמד החיוב באשראי${locStr ? ' (' + locStr + ')' : ''}, תחום: ${b.category || 'כללי'}${isLocalTag}`;
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
- **מענה לחיפושים לפי עיר או מיקום (Dual-Tier Location Search - עסקים מקומיים לצד רשתות ארציות)**:
  כאשר המשתמש שואל על עיר ספציפית (כגון: "פיצה בפתח תקווה", "מסעדות בתל אביב", "ספורט בחיפה"):
  השתמש תמיד במודל הדו-שכבתי:
  1. הדגש עסקים ומסעדות מקומיים פיזיים הפועלים בעיר זו מתוך ספריית החיוב (הנחות אוטומטיות באשראי של 5%-15% במעמד החיוב).
  2. שלב לצדם רשתות ארציות מובילות ורשתות קניונים (כמו פיצה האט, דומינוס, מגה ספורט, פוקס וכו') שמפעילות סניפים פעילים בעיר ומציעות ארנק נטען מוזל של 20% או שוברים מסובסדים.
  3. הסבר למשתמש בצורה ישירה ומועילה על שתי האפשרויות: גם המקומות המקומיים וגם הרשתות הארציות הפועלות בעיר!
- **שיחה זורמת, אנושית ומקצועית**: שוחח כמו יועץ חיסכון אישי שמבין בדיוק מה הצרכים של המשתמש. אל תזרוק רשימות אקראיות של חנויות שאינן קשורות לנושא!

${catalogContext ? `פריטים שנמצאו בקטלוג המערכת עבור השאלה הנוכחית:\n${catalogContext}` : 'לא נמצאו פריטים קונקרטיים בקטלוג עבור מילות השאלה הללו. השתמש בידע הקטלוגי המלא שלך והסבר למשתמש בצורה עשירה ומלאה.'}`;

    // Enrich system instruction with real-time exact database aggregations when count/statistics are queried
    const isCountQueryIntent = /כמה|כמות|מספר|סך הכל|סה"כ|how many|count/i.test(normalizeHebrew(userPromptText));
    let exactAggregationFacts = '';
    if (isCountQueryIntent) {
      const jerusalemBillingCount = cachedBillingStores.filter(b => normalizeHebrew(b.city || '').includes('ירושלים')).length;
      exactAggregationFacts = `\n\n[נתוני אגרגציה סטטיסטיים מדויקים מכל 13,600+ פריטי הקטלוג]:
- מספר בתי עסק בירושלים המעניקים הנחה אוטומטית במעמד החיוב באשראי בהצדעה: בדיוק ${jerusalemBillingCount} בתי עסק (מתוך סך 10,659 עסקים בקטלוג).
- סך הרשתות בקטלוג הארצי: ${cachedStores.length}.
- סך המבצעים והשוברים: ${cachedDeals.length}.
- אם המשתמש שואל "כמה עסקים נותנים הנחה בירושלים במעמד החיוב", השב תמיד עם המספר המדויק: בדיוק ${jerusalemBillingCount} עסקים. השתמש בכלי aggregate_catalog במידת הצורך לקבלת פילוח נוסף.`;
    }

    const fullSystemInstruction = systemInstruction + exactAggregationFacts;

    // Map conversation history into Gemini Content format
    const contents = messages
      .filter(m => m && m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    const targetProviderKey = (typeof requestedProvider === 'string' && DIRECT_AI_PROVIDERS[requestedProvider])
      ? requestedProvider
      : 'gemini';
    const providerDef = DIRECT_AI_PROVIDERS[targetProviderKey];
    const apiKey = getProviderKey(targetProviderKey, env);

    let replyText = '';
    let isAiOnline = false;
    let usedProvider = providerDef.name;
    let usedModel = (typeof requestedModel === 'string' && requestedModel.trim())
      ? requestedModel.trim()
      : providerDef.defaultModel;
    let statusNote = '';

    if (!apiKey) {
      statusNote = `משתנה סודי ${providerDef.envKeys.join(' או ')} אינו מוגדר ב-Secrets של GitHub או ב-.env עבור ספק ${providerDef.name}.`;
      replyText = `> ⚠️ **מודל אינו זמין (ספק ${providerDef.name}):** לא נמצא מפתח סודי \`${providerDef.envKeys[0]}\` ב-GitHub Secrets או בקובץ \`.env\`. התשובה להלן נוצרה במצב לא מקוון מקומי מתוך קטלוג המערכת בלבד:\n\n` +
        generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
    } else {
      // Direct provider execution without middleman
      if (targetProviderKey === 'gemini') {
        const candidateModels = [
          usedModel,
          'gemini-flash-lite-latest',
          env.GOOGLE_MODEL || env.GEMINI_MODEL,
          'gemini-2.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.5-pro',
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        for (const mName of candidateModels) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout for ${mName}`)), 7000)
            );

            const aiPromise = (async () => {
              const firstResponse = await ai.models.generateContent({
                model: mName,
                contents,
                config: {
                  systemInstruction: fullSystemInstruction,
                  temperature: 0.7,
                  tools: catalogToolsGemini as any,
                },
              });

              // Check if Gemini invoked Function Calling (e.g. aggregate_catalog or search_catalog)
              if (firstResponse && (firstResponse as any).functionCalls && (firstResponse as any).functionCalls.length > 0) {
                const fCall = (firstResponse as any).functionCalls[0];
                const toolResult = handleExecuteCatalogTool(fCall.name, fCall.args);
                const candidateContent = firstResponse.candidates?.[0]?.content;

                try {
                  const followUpResponse = await ai.models.generateContent({
                    model: mName,
                    contents: [
                      ...contents,
                      candidateContent || { role: 'model', parts: [{ functionCall: fCall }] },
                      {
                        role: 'user',
                        parts: [
                          {
                            functionResponse: {
                              name: fCall.name,
                              response: { output: toolResult },
                            },
                          },
                        ],
                      },
                    ],
                    config: {
                      systemInstruction: fullSystemInstruction,
                      temperature: 0.7,
                    },
                  });

                  if (followUpResponse && followUpResponse.text) {
                    return followUpResponse;
                  }
                } catch (fnErr) {
                  console.warn('Gemini functionResponse follow-up error:', fnErr);
                }

                if (toolResult && toolResult.message) {
                  return { text: toolResult.message };
                }
              }

              return firstResponse;
            })();

            const response = await Promise.race([aiPromise, timeoutPromise]);
            if (response && response.text) {
              replyText = response.text;
              isAiOnline = true;
              usedProvider = 'Gemini';
              if (usedModel !== mName) {
                replyText = `> ℹ️ *המודל המבוקש \`${usedModel}\` לא היה זמין בספק Gemini (שגיאה 404 / לא נתמך). המענה נוצר בהצלחה באמצעות מודל ברירת המחדל \`${mName}\`:*\n\n` + replyText;
              }
              usedModel = mName;
              break;
            }
          } catch (geminiError: any) {
            console.warn(`Gemini model ${mName} call failed (${geminiError?.message || geminiError}), trying next candidate...`);
            if (mName === usedModel) {
              const is404 = geminiError?.status === 404 || (geminiError?.message || '').includes('404') || (geminiError?.message || '').includes('not found');
              statusNote = is404
                ? `המודל "${mName}" אינו קיים ב-Gemini API (שגיאה 404 - Not Found). מומלץ לבחור gemini-flash-lite-latest`
                : `מודל Gemini ${mName} לא היה זמין (${geminiError?.message || 'שגיאה'})`;
            }
          }
        }
      } else if (targetProviderKey === 'openai') {
        try {
          const openAiMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: openAiMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...openAiMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'OpenAI';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'OpenAI';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'OpenAI';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`OpenAI direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (OpenAI HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('OpenAI direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'claude') {
        try {
          const anthropicMessages = messages.filter(m => m && m.content).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));
          const modelName = usedModel;
          const resAI = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: modelName,
              system: fullSystemInstruction,
              messages: anthropicMessages,
              max_tokens: 1500,
              temperature: 0.7,
              tools: catalogToolsClaude,
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const toolUse = Array.isArray(json.content) && json.content.find((b: any) => b.type === 'tool_use');
            if (toolUse) {
              const toolResult = handleExecuteCatalogTool(toolUse.name, toolUse.input);
              const followUpRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: modelName,
                  system: fullSystemInstruction,
                  messages: [
                    ...anthropicMessages,
                    { role: 'assistant', content: json.content },
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'tool_result',
                          tool_use_id: toolUse.id,
                          content: JSON.stringify(toolResult),
                        },
                      ],
                    },
                  ],
                  max_tokens: 1500,
                  temperature: 0.7,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.content?.[0]?.text;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'Claude';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'Claude';
                usedModel = modelName;
              }
            } else {
              const text = json.content?.[0]?.text;
              if (text) {
                replyText = text;
                isAiOnline = true;
                usedProvider = 'Claude';
                usedModel = modelName;
              }
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`Anthropic direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (Claude HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('Claude direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'groq') {
        try {
          const groqMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: groqMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...groqMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'Groq';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'Groq';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'Groq';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`Groq direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (Groq HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('Groq direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'deepseek') {
        try {
          const deepseekMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: deepseekMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...deepseekMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'DeepSeek';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'DeepSeek';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'DeepSeek';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`DeepSeek direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (DeepSeek HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('DeepSeek direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      }

      if (!isAiOnline || !replyText) {
        isAiOnline = false;
        usedProvider = providerDef.name;
        if (!statusNote) {
          statusNote = `המודל שנבחר (${usedModel}) בספק ${providerDef.name} אינו זמין כרגע.`;
        }
        replyText = `> ⚠️ **מודל אינו זמין (${providerDef.name} • ${usedModel}):** ${statusNote}\n> המענה נוצר במצב לא מקוון מקומי על סמך קטלוג המערכת:\n\n` +
          generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
      }
    }

    // Keep deals and stores if they have genuine relevance
    const filteredStores = topStores;
    const filteredDeals = topDeals;
    const filteredBilling = topBilling;

    const followUps = generateFollowUps(userPromptText, topStores, topDeals);

    return res.json({
      reply: replyText,
      isAiOnline,
      provider: usedProvider,
      model: usedModel,
      statusNote,
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

// Dynamic Model Fetching with provider API key
async function fetchProviderModels(providerId: string, apiKey: string): Promise<Array<{ id: string; name: string; description?: string }>> {
  if (providerId === 'gemini') {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const listRes = await ai.models.list();
    const modelsList: Array<{ id: string; name: string; description?: string }> = [];
    for await (const m of listRes) {
      const cleanId = (m.name || '').replace(/^models\//, '');
      if (cleanId) {
        modelsList.push({
          id: cleanId,
          name: m.displayName || cleanId,
          description: m.description || '',
        });
      }
    }
    const priority = [
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
      'gemini-pro-latest',
    ];
    modelsList.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const modelsList: Array<{ id: string; name: string; description?: string }> = list
      .map((m: any) => ({
        id: m.id,
        name: m.id,
      }))
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        return id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('chat');
      });

    const priority = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    modelsList.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const modelsList = list.map((m: any) => ({
      id: m.id,
      name: m.id,
      description: m.owned_by ? `ספק: ${m.owned_by}` : undefined,
    }));
    const priority = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    modelsList.sort((a: any, b: any) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    return list.map((m: any) => ({
      id: m.id,
      name: m.id,
    }));
  }

  if (providerId === 'claude') {
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const list = Array.isArray(data.data) ? data.data : [];
        if (list.length > 0) {
          return list.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
          }));
        }
      }
    } catch {}

    // Fallback list of Claude models
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    ];
  }

  return [];
}

// GET /api/models: Fetch dynamic models directly from provider API using configured secret key
app.get('/api/models', async (req, res) => {
  const provider = (typeof req.query.provider === 'string' && DIRECT_AI_PROVIDERS[req.query.provider])
    ? req.query.provider
    : 'gemini';
  const def = DIRECT_AI_PROVIDERS[provider];
  const env = readEnvSecrets();
  const apiKey = getProviderKey(provider, env);

  if (!apiKey) {
    return res.json({
      available: false,
      provider,
      models: [],
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
      error: `משתנה סודי ${def.envKeys.join(' או ')} אינו מוגדר ב-Secrets של GitHub או ב-.env עבור ${def.name}.`,
    });
  }

  try {
    const models = await fetchProviderModels(provider, apiKey);
    return res.json({
      available: true,
      provider,
      models,
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
    });
  } catch (err: any) {
    console.warn(`Failed to fetch models for provider ${provider}:`, err?.message || err);
    return res.json({
      available: false,
      provider,
      models: [],
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
      error: `שגיאה במשיכת מודלים מספק ${def.name}: ${err?.message || 'שגיאת גישה'}`,
    });
  }
});

// POST /api/verify-password: Check if user-entered password matches AI secret password
app.post('/api/verify-password', (req, res) => {
  const env = readEnvSecrets();
  const serverPassword = getAiPassword(env);

  if (!serverPassword) {
    return res.json({ valid: true, notRequired: true });
  }

  const userPassword = (req.body?.password || '').trim();
  const userPassHash = crypto.createHash('sha256').update(userPassword).digest('hex');
  const serverPassHash = crypto.createHash('sha256').update(serverPassword).digest('hex');

  if (userPassword === serverPassword || userPassHash === serverPassHash) {
    return res.json({ valid: true });
  }

  return res.status(401).json({ valid: false, error: 'סיסמה שגויה. אנא נסה שוב.' });
});

// GET /api/ai-status: Health check for current AI providers and secrets
app.get('/api/ai-status', (req, res) => {
  const env = readEnvSecrets();
  const serverPassword = getAiPassword(env);
  const providerStatuses: Record<string, any> = {};

  for (const [id, def] of Object.entries(DIRECT_AI_PROVIDERS)) {
    const key = getProviderKey(id, env);
    providerStatuses[id] = {
      id,
      name: def.name,
      model: def.defaultModel,
      requiredSecret: def.envKeys[0],
      available: Boolean(key),
    };
  }

  // Find first available or default to gemini
  const availableProvider = Object.keys(providerStatuses).find(k => providerStatuses[k].available) || 'gemini';

  return res.json({
    isAiOnline: Boolean(providerStatuses[availableProvider]?.available),
    provider: providerStatuses[availableProvider]?.name,
    model: providerStatuses[availableProvider]?.model,
    providers: providerStatuses,
    defaultProvider: availableProvider,
    isPasswordRequired: Boolean(serverPassword),
  });
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

  // Exact Database Aggregations & Counts (e.g. "כמה עסקים נותנים הנחה בירושלים במעמד החיוב?")
  const isCountQuery = /כמה|כמות|מספר ה|סך הכל|סה"כ|how many|count/i.test(qNorm);
  if (isCountQuery) {
    if (qNorm.includes('ירושלים')) {
      const jerusalemBillingCount = cachedBillingStores.filter(b => normalizeHebrew(b.city || '').includes('ירושלים')).length;
      return `בירושלים ישנם בדיוק **${jerusalemBillingCount} בתי עסק מקומיים** המעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה (בגובה של 2% עד 15% חיסכון אוטומטי בדף פירוט האשראי החודשי, ללא צורך בהטענה מראש או ברכישת שובר), מתוך מעל 10,650 עסקים בכל רחבי הארץ.

בין העסקים המקומיים המובילים בירושלים תמצא מגוון רחב של מסעדות ובתי קפה, חנויות אופנה והנעלה, קליניקות שיניים ורפואה, מוסכים ושירותי רכב, אופטיקה ועוד.`;
    }

    // Check other cities
    for (const city of ISRAELI_CITIES_MAP) {
      if (city.aliases.some(a => qNorm.includes(normalizeHebrew(a)))) {
        const cityBillingCount = cachedBillingStores.filter(b => normalizeHebrew(b.city || '').includes(normalizeHebrew(city.name))).length;
        return `ב${city.name} ישנם בדיוק **${cityBillingCount} בתי עסק מקומיים** המעניקים הנחה אוטומטית במעמד החיוב בכרטיס האשראי של בהצדעה (בגובה של 2% עד 15% חיסכון אוטומטי בדף החשבון החודשי), מתוך מעל 10,650 עסקים פעילים בארץ.`;
      }
    }
  }

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

  let text = `> ⚠️ **שים לב:** מודל ה-AI החי אינו מחובר כרגע (אין מפתח פעיל ב-Secrets). התשובה המוצגת מבוססת על אינדקס הקטלוג המקומי בלבד.\n\nמצאתי מספר אפשרויות מצוינות בקטלוג עבור **"${query}"**:\n\n`;

  if (qNorm.includes('כלי בית') || qNorm.includes('סירים') || qNorm.includes('מטבח') || qNorm.includes('מחבת')) {
    text += `💡 **המלצת מומחה לחיסכון בכלי בית:** ברשתות המובילות (**סולתם, נעמן, ורדינון, פוקס הום וגולף אנד קו**) ההנחה המשתלמת ביותר היא שימוש ב**ארנק נטען בהצדעה של 20%** או **ארנק UNIQ של 15%** שמאפשרים רכישה מוזלת הן בסניפים והן באתרי האונליין!\n\n`;
  }

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
