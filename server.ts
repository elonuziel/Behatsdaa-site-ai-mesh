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

const HEBREW_STOP_WORDS = new Set([
  'איפה', 'הכי', 'משתלם', 'יש', 'של', 'על', 'את', 'מה', 'איזה', 'אילו', 'האם',
  'כדאי', 'אפשר', 'רוצה', 'מחפש', 'הנחה', 'הנחות', 'מבצע', 'מבצעים', 'מועדון',
  'מועדונים', 'חנות', 'רשת', 'חבר', 'חברי', 'למצוא', 'לקנות', 'באיזה', 'כמה',
  'טוב', 'טובה', 'טובים', 'שלום', 'היי', 'תודה', 'בבקשה', 'ספר', 'לי', 'בשבילי'
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
    'קופון', 'קופונים', 'שובר', 'שוברים'
  ];

  for (const word of commercialKeywords) {
    if (qNorm.includes(word)) return false;
  }

  // Conversational or meta questions
  const metaPhrases = [
    'איך האתר עובד', 'איך משתמשים', 'מה האתר', 'הסבר לי על', 'מי אתה', 'מה אתה', 'האם אתה', 'באמת ai',
    'איך לחסוך', 'מה זה ארנק נטען', 'מה ההבדל בין', 'הנחה במעמד החיוב', 'איך מטעינים', 'איך ממשים',
    'שלום', 'היי', 'בוקר טוב', 'ערב טוב', 'צהריים טובים', 'תודה', 'מי יצר', 'מה היכולות', 'גולש ומבין'
  ];

  return metaPhrases.some(phrase => qNorm.includes(phrase));
}

// Find relevant stores & deals from query across all 10,000+ businesses
function findRelevantCatalog(query: string, activeClubs?: string[]) {
  // If the query is purely a meta question, greeting, or conceptual explanation, don't force random store cards
  if (isPurelyConversationalOrInformational(query)) {
    return {
      topStores: [],
      topDeals: [],
      topBilling: [],
    };
  }

  const qNorm = normalizeHebrew(query);
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

  // 1. Filter primary club stores
  for (const s of cachedStores) {
    if (activeClubs && activeClubs.length > 0) {
      const hasClub = (s.clubs || []).some(c => activeClubs.includes(c));
      if (!hasClub) continue;
    }

    const nameNorm = normalizeHebrew(s.name || '');
    const catNorm = normalizeHebrew(s.category || '');
    const condNorm = normalizeHebrew(s.conditions || '');
    const cardsNorm = normalizeHebrew(
      (s.cards || []).map((c: any) => typeof c === 'string' ? c : c.card_name || '').join(' ')
    );

    let score = 0;
    if (nameNorm.includes(qNorm)) score += 60;
    if (catNorm.includes(qNorm)) score += 25;

    for (const w of expandedWords) {
      if (nameNorm.includes(w)) score += 18;
      if (catNorm.includes(w)) score += 10;
      if (cardsNorm.includes(w)) score += 6;
      if (condNorm.includes(w)) score += 3;
    }

    if (score > 0) {
      score += (s.max_discount || 0) * 0.5;
      matchedStores.push({ store: s, score });
    }
  }

  // 2. Filter deals & vouchers
  for (const d of cachedDeals) {
    if (activeClubs && activeClubs.length > 0) {
      if (d.club && !activeClubs.includes(d.club)) continue;
    }

    const titleNorm = normalizeHebrew(d.title || '');
    const suppNorm = normalizeHebrew(d.supplier || '');
    const catNorm = normalizeHebrew(d.category || '');
    const descNorm = normalizeHebrew(`${d.description || ''} ${d.terms_of_use || ''}`);
    const tagsNorm = normalizeHebrew((d.tags || []).join(' '));

    let score = 0;
    if (titleNorm.includes(qNorm)) score += 50;
    if (suppNorm.includes(qNorm)) score += 35;
    if (catNorm.includes(qNorm)) score += 18;

    for (const w of expandedWords) {
      if (titleNorm.includes(w)) score += 14;
      if (suppNorm.includes(w)) score += 12;
      if (catNorm.includes(w)) score += 8;
      if (tagsNorm.includes(w)) score += 5;
      if (descNorm.includes(w)) score += 3;
    }

    if (score > 0) {
      score += (d.discount_percent || 0) * 0.5;
      matchedDeals.push({ deal: d, score });
    }
  }

  // 3. Filter 10,000+ billing stores directory
  const matchedBilling: { store: BillingStoreItem; score: number }[] = [];
  for (const b of cachedBillingStores) {
    const nameNorm = normalizeHebrew(b.name || '');
    const catNorm = normalizeHebrew(b.category || '');
    const cityNorm = normalizeHebrew(b.city || '');
    const addrNorm = normalizeHebrew(b.full_address || b.address || '');
    const descNorm = normalizeHebrew(b.description || '');

    let score = 0;
    if (nameNorm.includes(qNorm)) score += 60;
    if (catNorm.includes(qNorm)) score += 30;
    if (cityNorm && cityNorm.includes(qNorm)) score += 35;

    for (const w of expandedWords) {
      if (nameNorm.includes(w)) score += 20;
      if (cityNorm && cityNorm.includes(w)) score += 15;
      if (catNorm.includes(w)) score += 10;
      if (addrNorm.includes(w)) score += 8;
      if (descNorm.includes(w)) score += 5;
    }

    if (score > 0) {
      score += (b.discount || 0) * 0.8;
      matchedBilling.push({ store: b, score });
    }
  }

  matchedStores.sort((a, b) => b.score - a.score);
  matchedDeals.sort((a, b) => b.score - a.score);
  matchedBilling.sort((a, b) => b.score - a.score);

  return {
    topStores: matchedStores.slice(0, 8).map(m => m.store),
    topDeals: matchedDeals.slice(0, 8).map(m => m.deal),
    topBilling: matchedBilling.slice(0, 12).map(m => m.store),
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
    const { messages, activeClubs, model = 'gemini-3.8-flash' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userPromptText = latestUserMessage ? latestUserMessage.content : '';

    // Search catalog for grounded knowledge
    const { topStores, topDeals, topBilling } = findRelevantCatalog(userPromptText, activeClubs);

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
אתה מודל בינה מלאכותית מודרני, חד וחכם המחובר ישירות לקטלוג המועדונים וההטבות של בהצדעה, UNIQ ו-Mastercard Day.
המשתמש יכול לשאול אותך **כל שאלה שבעולם** הקשורה לאתר, למועדונים, להטבות, לחיסכון, להשוואות, או המלצות צרכניות אישיות.

מידע מקיף על הפורטל והמועדונים:
1. מועדון בהצדעה (משרתי מילואים פעילים ולוחמים משוחררים):
   - **ארנק רשתות / כרטיס נטען בהצדעה**: הנחה של 20% (ולכרטיסים מסוימים 15%) ברשתות מובילות (מגה ספורט, פוקס הום, שילב, קולומביה, סטימצקי, ורדינון, נעמן, קסטרו ועוד). כרטיס אשראי "פייטר" מעניק הנחות ייעודיות נוספות.
   - **הנחה אוטומטית במעמד החיוב (הנחה באשראי)**: למעלה מ-10,650 בתי עסק וסניפים בכל עיר בישראל שבהם משלמים בכרטיס האשראי של בהצדעה ומקבלים הנחה אוטומטית בחשבון (2%-15%) בלי לקנות שום שובר מראש (רופאי שיניים, מוסכים, מסעדות, מאפיות, בוטיקים, חנויות ציוד).
   - **שוברים ומבצעים מסובסדים**: כרטיסי קולנוע (סינמה סיטי ב-33 ₪, יס פלאנט), ארוחות מסובסדות (מקדונלד'ס, בורגרים, פיצה האט, וולט, משלוחה), מלונות וספא (ישרוטל, פתאל, דן, הרברט סמואל), פארקים (ימית 2000, לונה פארק), מחשבים ומוצרי חשמל.

2. מועדון UNIQ (סטודנטים ובוגרים אקדמאים עם כרטיס MAX UNIQ / MAX ACADEMIC):
   - **כרטיס נטען UNIQ 15%**: טעינה דיגיטלית ל-31 רשתות מובילות (טרמינל X, פוקס, מנגו, ללין, מגה ספורט, פוט לוקר, אמריקן איגל ועוד).
   - **הנחות במעמד החיוב**: הנחה אוטומטית בעסקים לסטודנטים.
   - **מבצעים וקופונים ייחודיים**: אטרקציות, קולנוע, תרבות וקופונים לחופשות.

3. מועדון Mastercard Day:
   - בכל 10 בחודש (Mastercard Day) כל מחזיקי כרטיס אשראי מאסטרקארד זכאים להטבות וקודי קופון (כמו MASTERCARDAY, MASTERCARDAY10) באתרים מובילים כמו Terminal X (50 ₪ הנחה מעל 250 ₪), קרליין, סוויטוויט, מיננה, לנובו, לאסטפרייס ועוד.

4. מאפייני האתר ואופן השימוש:
   - "מגה חיפוש": חיפוש אינטגרטיבי ביותר מ-10,000 סניפים, 1,041 רשתות ו-2,670 שוברים.
   - "תצוגה נקייה" (Clean View): מצב ממוקד וטבלאי שמסתיר את הרשימה המלאה כברירת מחדל כדי להתמקד בחיפוש מהיר.
   - "יועץ חיסכון": חישוב מדויק מה משתלם יותר: טעינת ארנק נטען, רכישת שובר, תשלום באשראי המועדון, או שימוש בקופון ב-10 לחודש.
   - שמירת מועדפים מקומית בדפדפן.

${catalogContext ? `פריטים שנמצאו בקטלוג המערכת עבור השאלה הנוכחית:\n${catalogContext}` : 'לא נמצאו פריטים קונקרטיים בקטלוג עבור מילות השאלה הללו (או שמדובר בשאלה כללית/קונספטואלית). השתמש בידע שלך והסבר למשתמש בצורה עשירה ומלאה.'}

הנחיות קריטיות לעיבוד התשובה:
- **אותנטיות ובינה מלאכותית אמיתית**: אל תישמע כמו בוט או תבנית אוטומטית שחוזרת על עצמה! אתה מבין עברית באופן מושלם, קורא את ההקשר ומגיב כיועץ אנושי, חם, חכם, שנון ומקצועי.
- **מענה לכל שאלה**: אם המשתמש שואל "מי אתה?", "האם אתה באמת AI?", "איך האתר עובד?", "מה ההבדל בין כרטיס נטען למעמד החיוב?", "כמה אני אחסוך?", או "איפה לקנות מתנה לחג?" – ענה באופן ישיר, מפורט ומדויק על השאלה שנשאלה, בלי לדחוף רשימת חנויות לא רלוונטית!
- **המלצות חכמות**: כשמבקשים המלצה (למשל על נעלי ספורט או אוכל), הסבר **באיזו שיטה הכי כדאי לשלם** (לדוגמה: "אם אתה בהצדעה, מומלץ להטעין את הארנק הנטען ב-20% למגה ספורט; אם אתה ב-UNIQ יש 15% בטרמינל X; וב-10 לחודש כדאי לבדוק קופון במאסטרקארד דיי").
- **שפה ועיצוב**: עברית רהוטה וזורמת. השתמש בבולטים ובהדגשות **bold** רק במקומות שמוסיפים בהירות.`;

    // Map conversation history into Gemini Content format
    const contents = messages
      .filter(m => m && m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    let replyText = '';
    const activeKey = getGeminiApiKey();

    if (activeKey && !activeKey.startsWith('MY_')) {
      try {
        const ai = getGeminiClient();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timed out after 20 seconds')), 20000)
        );

        const aiPromise = ai.models.generateContent({
          model: model || 'gemini-3.8-flash',
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
        replyText = response.text || '';
      } catch (geminiError: any) {
        console.error('Gemini API call failed, using smart catalog fallback:', geminiError?.message || geminiError);
        replyText = generateFallbackResponse(userPromptText, topStores, topDeals, topBilling);
      }
    } else {
      replyText = generateFallbackResponse(userPromptText, topStores, topDeals, topBilling);
    }

    const followUps = generateFollowUps(userPromptText, topStores, topDeals);

    return res.json({
      reply: replyText,
      recommendedStores: topStores.map(s => ({
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
      recommendedDeals: topDeals.map(d => ({
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
      recommendedBilling: topBilling.map(b => ({
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
  billingStores: BillingStoreItem[] = []
): string {
  const qNorm = normalizeHebrew(query);

  if (qNorm.includes('מי אתה') || qNorm.includes('מה אתה') || qNorm.includes('ai') || qNorm.includes('בינה מלאכותית') || qNorm.includes('אמיתי') || qNorm.includes('רובוט') || qNorm.includes('גולש ומבין')) {
    return `שלום! אני סייר ה-AI החכם של פורטל **"ההטבות שלי"**, מבוסס מודל Gemini של גוגל.

אני מחובר ישירות לקטלוג המלא של שלושת מועדוני הצרכנות המובילים:
1. **בהצדעה** – משרתי מילואים ולוחמים (ארנק נטען של 20%, מעל 10,650 בתי עסק בהנחה במעמד החיוב, ושוברים מסובסדים).
2. **UNIQ** – סטודנטים ובוגרים אקדמאים (כרטיס נטען 15% ל-31 רשתות מובילות, הטבות קולנוע וסבסודים).
3. **Mastercard Day** – כל מחזיקי מאסטרקארד בכל 10 בחודש (קופונים בלעדיים לאתרים כמו Terminal X ועוד).

אני כאן כדי לענות על כל שאלה: להשוות מחירים, לבדוק באיזה מועדון תקבל את ההנחה הגבוהה ביותר, להמליץ על שוברים, ולמצוא חנויות וסניפים בכל עיר בישראל. שאל אותי כל דבר!`;
  }

  if (qNorm.includes('איך האתר עובד') || qNorm.includes('איך משתמשים') || qNorm.includes('הסבר על האתר') || qNorm.includes('מה האתר')) {
    return `פורטל **"ההטבות שלי"** הוא מנוע חיפוש והשוואה חכם המרכז את כל ההטבות של בהצדעה, UNIQ ו-Mastercard Day במקום אחד!

איך מפיקים מהאתר את המקסימום:
* 🔍 **מגה חיפוש**: חפש כל מוצר, רשת (כמו מגה ספורט, קולומביה), עיר (כמו תל אביב, חיפה) או קטגוריה, ותקבל תוצאות מכל המועדונים יחד.
* 💳 **השוואת שיטות תשלום**: גלה האם שווה להטעין כרטיס נטען מראש, לקנות שובר מוזל, או לשלם באשראי המועדון להנחה אוטומטית במעמד החיוב.
* ⚡ **תצוגה נקייה vs מורחבת**: כפתור "תצוגה נקייה" בראש הדף מאפשר מצב טבלאי מהיר וממוקד לחיפוש מיידי.
* 🤖 **סייר AI**: שאל אותי בכל רגע שאלות חופשיות וקבל המלצות מדויקות.`;
  }

  if (qNorm.includes('הבדל') || qNorm.includes('מעמד החיוב') || qNorm.includes('ארנק נטען') || qNorm.includes('איך מטעינים')) {
    return `שאלה מצוינת! ישנם 3 אפיקי חיסכון עיקריים שכדאי להכיר:

1. 👛 **ארנק רשתות / כרטיס נטען (עד 20% הנחה)**:
   מטעינים מראש סכום כסף דיגיטלי באתר המועדון (משלמים למשל 80 ₪ ומקבלים 100 ₪ למימוש). תקף ברשתות האופנה, הספורט והבית הגדולות (מגה ספורט, שילב, פוקס הום, ורדינון ועוד). מציגים את הקוד בקופה.

2. 💳 **הנחה במעמד החיוב (2%-15% אוטומטית)**:
   השיטה הפשוטה ביותר: לא קונים שום דבר מראש! פשוט משלמים בבית העסק עם כרטיס האשראי של המועדון (בהצדעה/UNIQ), ובדף החשבון בסוף החודש יורד אחוז ההנחה באופן שקט ואוטומטי. זה תקף ביותר מ-**10,650 עסקים מקומיים** ברחבי הארץ (מסעדות, מוסכים, רופאי שיניים, מאפיות ועוד).

3. 🎟️ **שוברים ומבצעים מסובסדים**:
   רכישת כרטיס מוגדר מראש במחיר מוזל (למשל כרטיס לסינמה סיטי ב-33 ₪ במקום 47 ₪, ארוחה במקדונלד'ס, או לינה במלונות).`;
  }

  if (stores.length === 0 && deals.length === 0 && billingStores.length === 0) {
    return `לא מצאתי תוצאות ספציפיות בקטלוג עבור **"${query}"**.
אפשר לחפש רשתות (מגה ספורט, פוקס, טרמינל X, קולומביה), תחומים (נעליים, פיצה, מלונות, מוסכים, שיניים), או ערים ברחבי הארץ. לחלופין, שאל אותי כל שאלה כללית על המועדונים והשימוש בהם!`;
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
      text += `* **${d.title}** ${priceText}${discText} דרך מועדון ${d.club === 'behatsdaa' ? 'בהצדעה' : d.club || 'בהצדעה'}.\n`;
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
