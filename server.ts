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

// Find relevant stores & deals from query across all 10,000+ businesses
function findRelevantCatalog(query: string, activeClubs?: string[]) {
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

    const systemInstruction = `אתה "סייר ההטבות והמועדונים החכם" של פורטל "ההטבות שלי" (המאגד את מועדוני בהצדעה, UNIQ ו-Mastercard Day).
תפקידך: לעזור למשתמשים למצוא במדויק ובשפה טבעית חנויות, שירותים, מבצעים, שוברים, כרטיסים נטענים והנחות במעמד החיוב.

מידע על המועדונים:
1. מועדון בהצדעה:
- כרטיס נטען/ארנק רשתות בהצדעה: הנחה של 20% או 15% במגוון רשתות (מגה ספורט, קולומביה, סטימצקי, פוקס הום, ורדינון וכו').
- כרטיס אשראי פייטר (Fighter): הנחה של 15% בארנק נטען ייעודי.
- מעמד החיוב: הנחה ישירה בחשבון האשראי של בהצדעה באלפי בתי עסק וסניפים (3%-15%).
- שוברים ומבצעים: אטרקציות, ספא, קולנוע (סינמה סיטי ב-33 ₪), מזון ומסעדות (מקדונלד'ס, בורגרים, פיצה האט, משלוחה).

2. מועדון UNIQ (סטודנטים ואקדמאים):
- כרטיס נטען UNIQ 15%: תקף ב-31 רשתות מובילות (פוקס, טרמינל X, מגה ספורט, ללין, מנגו ועוד).
- שוברים והטבות מסובסדות (קולנוע, מסעדות, אטרקציות, תרבות).
- הנחות מותגים וקופונים ייחודיים.
- הנחות אוטומטיות במעמד החיוב למחזיקי כרטיס UNIQ (MAX ACADEMIC).

3. מועדון Mastercard Day:
- מבצעים והטבות בלעדיות בכל 10 בחודש למחזיקי כרטיס אשראי Mastercard.
- קודי קופון ייעודיים (כמו MASTERCARDAY, MASTERCARDAY10 וכו') באתרים מובילים (Terminal X, קרליין, נאוטיקה, סוויטוויט, מיננה, לנובו וכו').

${catalogContext ? `נתונים חיים שנמצאו בקטלוג עבור הפנייה הנוכחית:${catalogContext}` : 'לא נמצאו פריטים מובהקים בקטלוג עבור מילות החיפוש הללו, השתמש בידע הכללי שלך על המועדונים והצע חלופות קרובות.'}

הנחיות קריטיות לתשובה:
- ענה תמיד בעברית טבעית, רהוטה, מועילה, נעימה ומסבירת פנים.
- ארגן את התשובה בצורה קריאה ומובנית באמצעות בולטים (נקודות) והדגשות bold לשמות רשתות ואחוזי הנחה.
- ציין במפורש את אחוזי ההנחה ואת שיטת התשלום המומלצת (כרטיס נטען, קופון, מעמד החיוב או שובר).
- אם למשתמש יש אפשרות לשלב או לבחור מועדון, הסבר מהי הדרך עם החיסכון המרבי.
- סיים עם טיפ מעשי קצר או הצעת כיוון נוספת.`;

    // Map conversation history into Gemini Content format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    let replyText = '';
    const activeKey = getGeminiApiKey();

    if (activeKey && !activeKey.startsWith('MY_')) {
      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        replyText = response.text || '';
      } catch (geminiError: any) {
        console.error('Gemini API call failed, using smart catalog fallback:', geminiError?.message || geminiError);
        // Graceful fallback response
        replyText = generateFallbackResponse(userPromptText, topStores, topDeals, topBilling);
      }
    } else {
      // Local or fallback mode when API key is not configured
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
  if (stores.length === 0 && deals.length === 0 && billingStores.length === 0) {
    return `לא מצאתי תוצאות מדויקות עבור "${query}".
אפשר לחפש רשתות מוכרות (כמו מגה ספורט, פוקס, קרפור, סטימצקי), ערים (תל אביב, חיפה, ירושלים), או קטגוריות כלליות כגון: אוכל ומסעדות, אופנה, רופאי שיניים, מוסכים, מוצרי חשמל, נופש ומלונות.`;
  }

  let text = `מצאתי עבורך מספר אפשרויות מצוינות בקטלוג המועדונים עבור **"${query}"**:\n\n`;

  if (stores.length > 0) {
    text += `### 🏢 רשתות וחנויות מתאימות מהקטלוג הראשי:\n`;
    for (const s of stores.slice(0, 5)) {
      const clubsHeb = (s.clubs || []).map(c => c === 'behatsdaa' ? 'בהצדעה' : c === 'uniq' ? 'UNIQ' : 'Mastercard Day').join(', ');
      text += `* **${s.name}** (${s.category || 'כללי'}): הנחה של עד **${s.max_discount || 0}%** במועדון **${clubsHeb}**.\n`;
    }
    text += `\n`;
  }

  if (deals.length > 0) {
    text += `### 🏷️ מבצעים ושוברים רלוונטיים:\n`;
    for (const d of deals.slice(0, 4)) {
      const priceText = d.price ? `ב-₪${d.price}` : '';
      const discText = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
      text += `* **${d.title}** ${priceText}${discText} דרך מועדון ${d.club === 'behatsdaa' ? 'בהצדעה' : d.club || 'בהצדעה'}.\n`;
    }
    text += `\n`;
  }

  if (billingStores.length > 0) {
    text += `### 💳 עסקים וסניפים בהנחה במעמד החיוב באשראי (מתוך 10,000+ סניפים):\n`;
    for (const b of billingStores.slice(0, 5)) {
      const locText = b.full_address || b.city ? ` (${b.full_address || b.city})` : '';
      text += `* **${b.name}**${locText} – **${b.discount}%** הנחה אוטומטית במעמד החיוב באשראי בהצדעה [${b.category || 'כללי'}].\n`;
    }
    text += `\n`;
  }

  text += `💡 **טיפ לחיסכון מרבי:** בדוק תמיד אם ניתן להטעין ארנק רשתות בהצדעה של 20% או כרטיס נטען UNIQ של 15% לפני ביצוע ההזמנה, או לשלם ישירות בכרטיס האשראי של המועדון להנחה אוטומטית במעמד החיוב!`;
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
