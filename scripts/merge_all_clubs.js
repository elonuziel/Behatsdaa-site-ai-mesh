/**
 * Multi-Club Data Ingestion & Normalization Pipeline
 * 
 * Merges data across:
 * 1. Behatsdaa (בהצדעה) - master data from data/sources/behatsdaa/
 * 2. UNIQ (יוניק) - rechargeable benefits & scraped deals from data/sources/uniq/
 * 3. Mastercard Day (מאסטרקארד דיי) - 10th of month deals from data/sources/mastercard/
 * 
 * Outputs:
 * - Harmonized data/stores.json (with multi-club tags and payment options)
 * - Harmonized data/deals.json (with club tags, promo codes, and discount types)
 * - Enriched data/billing_stores.json (with cross-club perks)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const sourcesDir = path.join(dataDir, 'sources');

console.log('🔄 [Multi-Club Ingestion] Starting data harmonization...');

// Ensure source directories exist and archive initial Behatsdaa data if needed
const behatsdaaSourceDir = path.join(sourcesDir, 'behatsdaa');
if (!fs.existsSync(behatsdaaSourceDir)) {
  fs.mkdirSync(behatsdaaSourceDir, { recursive: true });
}

const behStoresSrc = path.join(behatsdaaSourceDir, 'stores.json');
const behDealsSrc = path.join(behatsdaaSourceDir, 'deals.json');

if (!fs.existsSync(behStoresSrc) && fs.existsSync(path.join(dataDir, 'stores.json'))) {
  fs.copyFileSync(path.join(dataDir, 'stores.json'), behStoresSrc);
  console.log('  📦 Archived clean original Behatsdaa stores to data/sources/behatsdaa/');
}
if (!fs.existsSync(behDealsSrc) && fs.existsSync(path.join(dataDir, 'deals.json'))) {
  fs.copyFileSync(path.join(dataDir, 'deals.json'), behDealsSrc);
  console.log('  📦 Archived clean original Behatsdaa deals to data/sources/behatsdaa/');
}

// 1. Load Datasets
const behStoresRaw = JSON.parse(fs.readFileSync(behStoresSrc, 'utf-8'));
const behDealsRaw = JSON.parse(fs.readFileSync(behDealsSrc, 'utf-8'));

let uniqRecBrands = [];
let uniqItemDeals = [];
let uniqBrandDiscounts = [];
let uniqBillingStage = [];

const uniqRecPath = path.join(sourcesDir, 'uniq', 'rechargeable_benefits.json');
if (fs.existsSync(uniqRecPath)) {
  const uniqRec = JSON.parse(fs.readFileSync(uniqRecPath, 'utf-8'));
  uniqRecBrands = uniqRec.brands || [];
}

const uniqScrapedPath = path.join(sourcesDir, 'uniq', 'scraped_benefits.json');
if (fs.existsSync(uniqScrapedPath)) {
  const uniqScraped = JSON.parse(fs.readFileSync(uniqScrapedPath, 'utf-8'));
  uniqItemDeals = uniqScraped.item_deals || [];
  uniqBrandDiscounts = uniqScraped.brand_discounts || [];
  uniqBillingStage = uniqScraped.billing_stage_discounts || [];
}

let mcDealsList = [];
const mcDealsPath = path.join(sourcesDir, 'mastercard', 'deals.json');
if (fs.existsSync(mcDealsPath)) {
  const mcRaw = JSON.parse(fs.readFileSync(mcDealsPath, 'utf-8'));
  mcDealsList = mcRaw.deals || [];
}

console.log(`  📊 Loaded feeds:`);
console.log(`     Behatsdaa: ${behStoresRaw.stores?.length || 0} stores, ${behDealsRaw.deals?.length || 0} deals`);
console.log(`     UNIQ: ${uniqRecBrands.length} rechargeable brands, ${uniqItemDeals.length + uniqBrandDiscounts.length} deals, ${uniqBillingStage.length} billing discounts`);
console.log(`     Mastercard Day: ${mcDealsList.length} deals`);

// 2. Normalization & Brand Lexicon
const BRAND_SYNONYMS = new Map([
  ['סופר פארם', 'superpharm'],
  ['סופר-פארם', 'superpharm'],
  ['super-pharm', 'superpharm'],
  ['super pharm', 'superpharm'],
  ['פוקס', 'fox'],
  ['fox', 'fox'],
  ['קבוצת פוקס', 'fox'],
  ['fox group', 'fox'],
  ['שופרסל', 'shufersal'],
  ['shufersal', 'shufersal'],
  ['שופרסל שלי', 'shufersal'],
  ['שופרסל דיל', 'shufersal'],
  ['שופרסל אונליין', 'shufersal'],
  ['קסטרו', 'castro'],
  ['castro', 'castro'],
  ['רנואר', 'renuar'],
  ['renuar', 'renuar'],
  ['סטימצקי', 'steimatzky'],
  ['steimatzky', 'steimatzky'],
  ['המשביר לצרכן', 'mashbir'],
  ['המשביר 365', 'mashbir'],
  ['mashbir', 'mashbir'],
  ['אייס', 'ace'],
  ['ace', 'ace'],
  ['אוטו דיפו', 'ace'],
  ['אוטו דיפו ו-ace', 'ace'],
  ['auto depot', 'ace'],
  ['שקם אלקטריק', 'shekem'],
  ['shekem electric', 'shekem'],
  ['shekem', 'shekem'],
  ['הום סנטר', 'homecenter'],
  ['home center', 'homecenter'],
  ['א.ל.מ.', 'alm'],
  ['א.ל.מ', 'alm'],
  ['א ל מ', 'alm'],
  ['alm', 'alm'],
  ['משלוחה', 'mishloha'],
  ['mishloha', 'mishloha'],
  ['וולט', 'wolt'],
  ['wolt', 'wolt'],
  ['תן ביס', '10bis'],
  ['10bis', '10bis'],
  ['דומינוס פיצה', 'dominos'],
  ['דומינוס', 'dominos'],
  ["דומינו'ס", 'dominos'],
  ["דומינו'ס פיצה", 'dominos'],
  ['dominos', 'dominos'],
  ["domino's pizza", 'dominos'],
  ['dominos pizza', 'dominos'],
  ['מקדונלדס', 'mcdonalds'],
  ["מקדונלד'ס", 'mcdonalds'],
  ['mcdonalds', 'mcdonalds'],
  ['קרביץ', 'kravitz'],
  ['kravitz', 'kravitz'],
  ['אופטיקנה', 'opticana'],
  ['opticana', 'opticana'],
  ['קרולינה למקה', 'lemke'],
  ['carolina lemke', 'lemke'],
  ['גולף', 'golf'],
  ['קבוצת גולף', 'golf'],
  ['golf', 'golf'],
  ['golf group', 'golf'],
  ['זארה', 'zara'],
  ['zara', 'zara'],
  ['קפה נטו', 'cafeneto'],
  ['cafeneto', 'cafeneto'],
  ['איל מקיאג', 'ilmakiage'],
  ["איל מקיאג'", 'ilmakiage'],
  ['il makiage', 'ilmakiage'],
  ['לונה פארק', 'lunapark'],
  ['luna park', 'lunapark'],
  ['איי גאמפ', 'ijump'],
  ['איי ג\'אמפ', 'ijump'],
  ['ijump', 'ijump'],
  ['עמינח', 'aminach'],
  ['עמינח סנטר', 'aminach'],
  ['ללין', 'laline'],
  ['laline', 'laline'],
  ['שילב', 'shilav'],
  ['shilav', 'shilav'],
  ['אמריקן איגל', 'americaneagle'],
  ['american eagle', 'americaneagle'],
  ['ארי', 'aerie'],
  ['aerie', 'aerie'],
  ['הום סטייל', 'homestyle'],
  ['home style', 'homestyle'],
  ['לנובו', 'lenovo'],
  ['lenovo', 'lenovo'],
  ['סמסונג', 'samsung'],
  ['samsung', 'samsung'],
  ['איידיגיטל', 'idigital'],
  ['idigital', 'idigital'],
  ['i digital', 'idigital'],
  ['ksp', 'ksp'],
  ['באג', 'bug'],
  ['bug', 'bug'],
  ['הולמס פלייס', 'holmesplace'],
  ['holmes place', 'holmesplace'],
  ['ארומה', 'aroma'],
  ['aroma', 'aroma'],
  ['גולדה', 'golda'],
  ['golda', 'golda'],
  ['ריבר', 'rebar'],
  ['rebar', 'rebar'],
  ['ורדינון', 'vardinon'],
  ['vardinon', 'vardinon'],
  ['נעמן', 'naaman'],
  ['naaman', 'naaman'],
  ['מגה בעיר', 'mega'],
  ['mega', 'mega'],
  ['טיב טעם', 'tivtaam'],
  ['tiv taam', 'tivtaam'],
  ['עולם הקולנוע והחשמל', 'cwc'],
  ['עולם הקולנוע', 'cwc'],
  ['cwc', 'cwc'],
  ['לי קופר', 'leecooper'],
  ['lee cooper', 'leecooper'],
  ['גאס', 'guess'],
  ['גס', 'guess'],
  ['guess', 'guess'],
  ['סוויטוויט', 'sweetweet'],
  ['sweetweet', 'sweetweet'],
  ['רשת מלונות דן', 'danhotels'],
  ['מלונות דן', 'danhotels'],
  ['dan hotels', 'danhotels'],
  ['ישרוטל', 'isrotel'],
  ['isrotel', 'isrotel'],
  ['פתאל', 'fattal'],
  ['מלונות פתאל', 'fattal'],
  ['fattal', 'fattal'],
  ['אדידס', 'adidas'],
  ['adidas', 'adidas'],
  ['פוט לוקר', 'footlocker'],
  ['foot locker', 'footlocker'],
  ['פקטורי 54', 'factory54'],
  ['factory 54', 'factory54'],
  ['מגה ספורט', 'megasport'],
  ['mega sport', 'megasport'],
  ['פולגת', 'polgat'],
  ['polgat', 'polgat'],
  ['אינטימה', 'intima'],
  ['intima', 'intima'],
  ['כיתן', 'kitan'],
  ['kitan', 'kitan'],
  ['אייץ ואנד או', 'hno'],
  ['h&o', 'hno'],
  ['h & o', 'hno'],
  ['סולתם', 'soltam'],
  ['soltam', 'soltam'],
  ['נאוטיקה', 'nautica'],
  ['nautica', 'nautica'],
  ['טימברלנד', 'timberland'],
  ['timberland', 'timberland'],
  ['אלדו', 'aldo'],
  ['aldo', 'aldo'],
  ['קרליין', 'careline'],
  ['careline', 'careline'],
  ['מיננה', 'minene'],
  ['minene', 'minene'],
  ['עצמלה', 'etzmaleh'],
  ['etzmaleh', 'etzmaleh'],
  ['הולנדיה', 'hollandia'],
  ['hollandia', 'hollandia'],
  ['אייראלו', 'airalo'],
  ['airalo', 'airalo']
]);

const NORMALIZED_SYNONYMS = new Map();
for (const [k, v] of BRAND_SYNONYMS.entries()) {
  const normK = k.toLowerCase().trim()
    .replace(/[\(\)\[\]\"\'\-_–\.,\/]/g, ' ')
    .replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ')
    .replace(/\s+/g, ' ').trim();
  NORMALIZED_SYNONYMS.set(normK, v);
}

function normalizeBrandKey(name) {
  if (!name) return '';
  let s = String(name).toLowerCase().trim();
  s = s.replace(/\b(בע\"מ|בעמ|בע'מ|ltd|ישראל|israel|online|אונליין|סניפים|סניפי|רשת|קבוצת|חנות|אתר|shop|store)\b/gi, ' ');
  s = s.replace(/['"״׳.]/g, '');
  s = s.replace(/[\(\)\[\]\-_–\.,\/]/g, ' ');
  s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
  s = s.replace(/\s+/g, ' ').trim();

  // Check synonym map
  if (NORMALIZED_SYNONYMS.has(s)) {
    return NORMALIZED_SYNONYMS.get(s);
  }
  for (const [synKey, canonical] of NORMALIZED_SYNONYMS.entries()) {
    if (s === synKey || (s.length >= 4 && (s.includes(synKey) || synKey.includes(s)))) {
      return canonical;
    }
  }

  // Fallback to alphanumeric key
  return s.replace(/[^a-z0-9\u0590-\u05fe]/g, '');
}

function parseDiscountRate(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return parseFloat(match[1]);
  return 0;
}

// 3. Process Stores
console.log('⚡ Processing and unifying stores...');

const unifiedStores = [];
const storeBrandKeyMap = new Map();
const storeIdMap = new Map();

// Helper to create slug
function createSlug(name, id) {
  if (!name) return `item-${id}`;
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[\s/\\_–-]+/g, '-')
    .replace(/[^\u0590-\u05FFa-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
  return clean ? `${clean}-${id}` : `store-${id}`;
}

// Ingest Behatsdaa Stores
for (const s of (behStoresRaw.stores || [])) {
  const brandKey = normalizeBrandKey(s.name);
  const paymentOptions = [];

  // Parse existing card discounts
  if (Array.isArray(s.discounts) && s.discounts.length > 0) {
    for (const d of s.discounts) {
      paymentOptions.push({
        club: 'behatsdaa',
        type: 'loaded_card',
        rate: Number(d.discount_rate || 0),
        rateType: 'percent',
        label: `${d.card_name} (${d.discount_rate}%)`,
        description: `טעינת ${d.card_name} בהנחה של ${d.discount_rate}%`,
        terms: s.conditions || ''
      });
    }
  } else if (s.max_discount) {
    paymentOptions.push({
      club: 'behatsdaa',
      type: 'loaded_card',
      rate: Number(s.max_discount),
      rateType: 'percent',
      label: `כרטיס נטען בהצדעה (${s.max_discount}%)`,
      description: `הנחה של עד ${s.max_discount}% ברשת זו`,
      terms: s.conditions || ''
    });
  }

  const unified = {
    id: s.id,
    name: s.name,
    slug: s.slug || createSlug(s.name, s.id),
    category: s.category || 'כללי',
    clubs: ['behatsdaa'],
    max_discount: Number(s.max_discount || 0),
    logo: s.logo || null,
    website: s.website || null,
    conditions: s.conditions || '',
    cards: s.cards || [],
    discounts: s.discounts || [],
    payment_options: paymentOptions,
    _brandKey: brandKey
  };

  unifiedStores.push(unified);
  storeIdMap.set(unified.id, unified);
  if (brandKey) {
    let list = storeBrandKeyMap.get(brandKey);
    if (!list) {
      list = [];
      storeBrandKeyMap.set(brandKey, list);
    }
    list.push(unified);
  }
}

function getStoresByBrandKey(key) {
  return storeBrandKeyMap.get(key) || [];
}

// Ingest UNIQ Rechargeable Brands into Stores
let uniqBrandsMerged = 0;
let uniqBrandsCreated = 0;

for (const b of uniqRecBrands) {
  const rate = parseDiscountRate(b.discount) || 15;
  const subBrands = b.brands && b.brands.length > 0 ? b.brands : [b.name];
  
  const option = {
    club: 'uniq',
    type: 'loaded_card',
    rate: rate,
    rateType: 'percent',
    label: `כרטיס נטען UNIQ (${rate}%)`,
    description: b.discount || `${rate}% הנחה בטעינה`,
    terms: (b.restrictions || []).join(' | ') || b.notes || ''
  };

  // Find all stores matching any sub-brand or group name
  const matchedStores = new Set();
  for (const sb of subBrands) {
    const key = normalizeBrandKey(sb);
    for (const s of getStoresByBrandKey(key)) {
      matchedStores.add(s);
    }
  }
  const groupKey = normalizeBrandKey(b.name);
  for (const s of getStoresByBrandKey(groupKey)) {
    matchedStores.add(s);
  }

  if (matchedStores.size > 0) {
    for (const matchedStore of matchedStores) {
      if (!matchedStore.clubs.includes('uniq')) {
        matchedStore.clubs.push('uniq');
      }
      if (!matchedStore.payment_options.some(o => o.club === 'uniq' && o.type === 'loaded_card')) {
        matchedStore.payment_options.push(option);
      }
      matchedStore.max_discount = Math.max(matchedStore.max_discount, rate);
      uniqBrandsMerged++;
    }
  } else {
    // Create new store entry for this UNIQ brand
    const storeId = `uniq-${b.id}`;
    const newStore = {
      id: storeId,
      name: b.name,
      slug: createSlug(b.name, storeId),
      category: b.category || 'כללי',
      clubs: ['uniq'],
      max_discount: rate,
      logo: null,
      website: null,
      conditions: (b.restrictions || []).join(' | '),
      cards: ['כרטיס נטען UNIQ'],
      discounts: [{ card_name: 'כרטיס נטען UNIQ', discount_rate: rate }],
      payment_options: [option],
      _brandKey: groupKey
    };
    unifiedStores.push(newStore);
    storeIdMap.set(storeId, newStore);
    if (groupKey) {
      let list = storeBrandKeyMap.get(groupKey);
      if (!list) { list = []; storeBrandKeyMap.set(groupKey, list); }
      list.push(newStore);
    }
    uniqBrandsCreated++;
  }
}

// Ingest UNIQ Billing Stage Discounts into Stores
let uniqBillingMerged = 0;
for (const b of uniqBillingStage) {
  const rate = parseDiscountRate(b.discount_rate || b.discount) || 5;
  const brandKey = normalizeBrandKey(b.name);
  const matchedStores = getStoresByBrandKey(brandKey);

  const option = {
    club: 'uniq',
    type: 'billing_discount',
    rate: rate,
    rateType: 'percent',
    label: `הנחה במעמד החיוב UNIQ (${rate}%)`,
    description: b.discount || `${rate}% במעמד החיוב למשלמים בכרטיס UNIQ`,
    terms: b.terms || (b.restrictions || []).join(' | ') || '',
    url: b.direct_url || null
  };

  for (const matchedStore of matchedStores) {
    if (!matchedStore.clubs.includes('uniq')) matchedStore.clubs.push('uniq');
    matchedStore.payment_options.push(option);
    matchedStore.max_discount = Math.max(matchedStore.max_discount, rate);
    uniqBillingMerged++;
  }
}

// Ingest Mastercard Day Deals into Stores
let mcDealsMerged = 0;
let mcStoresCreated = 0;

for (const d of mcDealsList) {
  const brandKey = normalizeBrandKey(d.brand);
  const matchedStores = getStoresByBrandKey(brandKey);

  const rate = Number(d.discount_numeric || 0);
  const isPercent = d.discount_type === 'percent' || /percent/i.test(d.discount_type || '');
  const label = d.coupon ? `קופון Mastercard Day: ${d.coupon}` : 'הטבת Mastercard Day';

  const option = {
    club: 'mastercard',
    type: 'promo_code',
    rate: rate,
    rateType: isPercent ? 'percent' : 'fixed',
    label: label,
    description: `${d.discount || ''} ${d.min_spend ? '(מינימום קנייה ' + d.min_spend + ')' : ''}`.trim(),
    terms: d.description || (d.terms_bullets || []).join(' | ') || '',
    code: d.coupon || 'MASTERCARDAY',
    url: d.url || null
  };

  let storeId = null;
  if (matchedStores.length > 0) {
    for (const matchedStore of matchedStores) {
      if (!matchedStore.clubs.includes('mastercard')) matchedStore.clubs.push('mastercard');
      matchedStore.payment_options.push(option);
      if (isPercent) {
        matchedStore.max_discount = Math.max(matchedStore.max_discount, rate);
      }
      if (!storeId) storeId = matchedStore.id;
      mcDealsMerged++;
    }
  } else {
    // Create new store entry for this brand if not present
    storeId = `mc-${brandKey || Math.random().toString(36).slice(2, 8)}`;
    if (!storeIdMap.has(storeId)) {
      const newStore = {
        id: storeId,
        name: d.brand,
        slug: createSlug(d.brand, storeId),
        category: d.category || 'כללי',
        clubs: ['mastercard'],
        max_discount: isPercent ? rate : 0,
        logo: d.image || null,
        website: d.url || null,
        conditions: (d.terms_bullets || []).join(' | '),
        cards: ['Mastercard'],
        discounts: [],
        payment_options: [option],
        _brandKey: brandKey
      };
      unifiedStores.push(newStore);
      storeIdMap.set(storeId, newStore);
      if (brandKey) {
        let list = storeBrandKeyMap.get(brandKey);
        if (!list) { list = []; storeBrandKeyMap.set(brandKey, list); }
        list.push(newStore);
      }
      mcStoresCreated++;
    }
  }
  d._assignedStoreId = storeId;
}

console.log(`  🏬 Stores summary:`);
console.log(`     Total unified stores: ${unifiedStores.length}`);
console.log(`     UNIQ merged to stores: ${uniqBrandsMerged}, created: ${uniqBrandsCreated}, billing merged: ${uniqBillingMerged}`);
console.log(`     Mastercard merged to stores: ${mcDealsMerged}, created: ${mcStoresCreated}`);

// 4. Process Deals
console.log('⚡ Processing and unifying deals...');

const unifiedDeals = [];

// Ingest Behatsdaa Deals
for (const d of (behDealsRaw.deals || [])) {
  unifiedDeals.push({
    id: String(d.id),
    title: d.title,
    slug: d.slug || createSlug(d.title, d.id),
    club: 'behatsdaa',
    supplier: d.supplier || '',
    category: d.category || 'כללי',
    price: d.price ?? null,
    original_price: d.original_price ?? null,
    discount_percent: Number(d.discount_percent || 0),
    discount_type: 'percent',
    coupon_code: null,
    validity: d.expiration_date || null,
    min_spend: null,
    image: d.image || null,
    url: d.url || null,
    description: d.description || '',
    terms_of_use: d.terms_of_use || '',
    tags: Array.isArray(d.tags) ? d.tags : [],
    locations: Array.isArray(d.locations) ? d.locations.join(', ') : (d.locations || ''),
    matched_store_id: d.matched_store_id || null,
    matched_store_name: d.matched_store_name || null
  });
}

// Ingest UNIQ Item Deals
for (const d of uniqItemDeals) {
  const discPercent = parseDiscountRate(d.discount);
  unifiedDeals.push({
    id: `uniq-${d.id}`,
    title: d.name,
    slug: createSlug(d.name, `uniq-${d.id}`),
    club: 'uniq',
    supplier: d.name,
    category: d.category || 'כללי',
    price: d.price ?? null,
    original_price: d.original_price ?? null,
    discount_percent: discPercent,
    discount_type: 'percent',
    coupon_code: null,
    validity: null,
    min_spend: null,
    image: d.image_url || null,
    url: d.direct_url || null,
    description: d.terms || '',
    terms_of_use: d.terms || '',
    tags: d.tags || ['UNIQ'],
    locations: 'כל הארץ',
    matched_store_id: null,
    matched_store_name: null
  });
}

// Ingest UNIQ Brand Discounts
for (const d of uniqBrandDiscounts) {
  const discPercent = parseDiscountRate(d.discount);
  unifiedDeals.push({
    id: `uniq-${d.id}`,
    title: d.name,
    slug: createSlug(d.name, `uniq-${d.id}`),
    club: 'uniq',
    supplier: d.name,
    category: d.category || 'כללי',
    price: d.price ?? null,
    original_price: d.original_price ?? null,
    discount_percent: discPercent,
    discount_type: 'percent',
    coupon_code: null,
    validity: null,
    min_spend: null,
    image: d.image_url || null,
    url: d.direct_url || null,
    description: d.terms || '',
    terms_of_use: d.terms || '',
    tags: d.tags || ['UNIQ', 'שובר'],
    locations: 'כל הארץ',
    matched_store_id: null,
    matched_store_name: null
  });
}

// Ingest Mastercard Day Deals
for (const d of mcDealsList) {
  const isPercent = d.discount_type === 'percent' || /percent/i.test(d.discount_type || '');
  const extraTags = [];
  const bLow = (d.brand || '').toLowerCase();
  const tLow = (d.title || '').toLowerCase();
  const cLow = (d.category || '').toLowerCase();

  if (bLow.includes('voye') || bLow.includes('airalo') || tLow.includes('גלישה') || tLow.includes('אינטרנט')) {
    extraTags.push('eSIM', 'איסים', 'סים', 'חבילות גלישה', 'גלישה', 'אינטרנט', 'חו״ל', 'חו ל', 'טיסה', 'תיירות', 'סלולר');
  }
  if (bLow.includes('booking') || bLow.includes('gett') || cLow.includes('תיירות')) {
    extraTags.push('תיירות', 'חו״ל', 'נופש', 'חופשה', 'טיסה');
    if (bLow.includes('booking')) extraTags.push('מלון', 'מלונות', 'לינה', 'אכסניה');
    if (bLow.includes('gett')) extraTags.push('מוניות', 'נסיעות', 'תחבורה');
  }
  if (cLow.includes('קולינריה') || cLow.includes('מסעד') || tLow.includes('פיצה') || tLow.includes('גלידה') || tLow.includes('משקה')) {
    extraTags.push('אוכל', 'מסעדות', 'מזון', 'קולינריה');
    if (tLow.includes('פיצה') || bLow.includes('דומינו')) extraTags.push('פיצה', 'דומינוס');
    if (tLow.includes('גלידה') || bLow.includes('גולדה') || bLow.includes('golda')) extraTags.push('גלידה', 'גולדה');
    if (bLow.includes('מקדונלד')) extraTags.push('המבורגר', 'מקדונלדס');
  }
  if (cLow.includes('אופנה') || tLow.includes('נעלי') || tLow.includes('בגדים')) {
    extraTags.push('אופנה', 'בגדים', 'נעליים', 'הלבשה');
  }
  if (cLow.includes('חשמל') || tLow.includes('חשמל') || tLow.includes('מחשב')) {
    extraTags.push('חשמל', 'טכנולוגיה', 'אלקטרוניקה', 'מחשבים');
  }

  unifiedDeals.push({
    id: `mc-${d.id}`,
    title: d.title,
    slug: createSlug(d.title, `mc-${d.id}`),
    club: 'mastercard',
    supplier: d.brand,
    category: d.category || 'כללי',
    price: null,
    original_price: null,
    discount_percent: isPercent ? Number(d.discount_numeric || 0) : 0,
    discount_type: isPercent ? 'percent' : 'fixed',
    discount_value: Number(d.discount_numeric || 0),
    discount_display: d.discount,
    coupon_code: d.coupon || 'MASTERCARDAY',
    validity: d.validity || '10 בחודש בלבד',
    min_spend: d.min_spend_numeric || null,
    min_spend_display: d.min_spend || null,
    image: d.image || null,
    url: d.url || null,
    description: d.description || '',
    terms_of_use: d.description || '',
    tags: Array.from(new Set(['Mastercard Day', '10 בחודש', d.coupon, ...extraTags].filter(Boolean))),
    locations: (d.terms_bullets || []).join(' | '),
    matched_store_id: d._assignedStoreId || null,
    matched_store_name: d.brand
  });
}

console.log(`  🎁 Total unified deals: ${unifiedDeals.length}`);

// Clean internal keys before writing
unifiedStores.forEach(s => {
  delete s._brandKey;
});

// 5. Write Harmonized Master Files
const updatedStoresJson = JSON.stringify({
  metadata: {
    last_updated: new Date().toISOString(),
    total_stores: unifiedStores.length,
    clubs: ['behatsdaa', 'uniq', 'mastercard']
  },
  stores: unifiedStores
}, null, 2);

const updatedDealsJson = JSON.stringify({
  metadata: {
    last_updated: new Date().toISOString(),
    total_deals: unifiedDeals.length,
    clubs: ['behatsdaa', 'uniq', 'mastercard']
  },
  deals: unifiedDeals
}, null, 2);

fs.writeFileSync(path.join(dataDir, 'stores.json'), updatedStoresJson, 'utf-8');
fs.writeFileSync(path.join(dataDir, 'deals.json'), updatedDealsJson, 'utf-8');

console.log('✅ Successfully wrote merged data/stores.json and data/deals.json!');
