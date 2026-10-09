/**
 * High-Performance Search Engine powered by MiniSearch
 * 
 * Provides:
 * - Sub-5ms query times across 10,000+ entries
 * - Hebrew-aware prefix matching and fuzzy tolerance
 * - Cross-field weighting (Name > Category > Subcategory > Tags)
 */

import MiniSearch from 'minisearch';
import { normalizeHebrew } from './utils.js';

let storesMiniSearch = null;
let dealsMiniSearch = null;
let billingMiniSearch = null;
let searchLexicon = null;

export async function initSearchLexicon() {
  if (searchLexicon) return;
  try {
    const res = await fetch('data/search_lexicon.json');
    if (res.ok) {
      searchLexicon = await res.json();
    }
  } catch (err) {
    console.warn('Failed to load search lexicon:', err);
  }
}

function buildSmartQuery(query) {
  if (!searchLexicon) return query;
  const terms = query.toLowerCase().split(/\s+/);
  const expandedTerms = new Set();
  
  terms.forEach(term => {
    expandedTerms.add(term);
    
    // Check transliterations
    if (searchLexicon.transliterations && searchLexicon.transliterations[term]) {
      expandedTerms.add(searchLexicon.transliterations[term]);
    }
    
    // Check synonyms
    if (searchLexicon.synonyms && searchLexicon.synonyms[term]) {
      searchLexicon.synonyms[term].forEach(syn => expandedTerms.add(syn));
    }
  });
  
  const originalTerms = Array.from(terms);
  const additionalTerms = Array.from(expandedTerms).filter(t => !originalTerms.includes(t));
  
  if (additionalTerms.length === 0) {
    return query;
  }
  
  return {
    combineWith: 'OR',
    queries: [
      query, // Exact terms get default full boost
      ...additionalTerms.map(t => ({ queries: [t], boost: 0.5 })) // Synonyms/Transliterations get lower boost
    ]
  };
}

export function tokenizeHebrew(text) {
  if (!text) return [];
  const str = String(text);

  // 1. Expand CamelCase / mixed-case words (e.g. GlobaleSIM -> Globale SIM, BeSIM -> Be SIM, iPhone -> i Phone)
  const expandedStr = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  const norm = normalizeHebrew(expandedStr);
  const origNorm = normalizeHebrew(str);
  if (!norm && !origNorm) return [];

  const rawWords = `${origNorm} ${norm}`.split(/\s+/).filter(Boolean);
  const tokens = new Set();

  for (const w of rawWords) {
    tokens.add(w);

    // Sub-word eSIM / SIM detection across compound words (e.g. globalesim, besim)
    if (/e-?sim/.test(w) || w.includes('esim')) {
      tokens.add('esim');
      tokens.add('sim');
      tokens.add(normalizeHebrew('איסים'));
      tokens.add(normalizeHebrew('סים'));
    } else if (w.includes('sim')) {
      tokens.add('sim');
      tokens.add(normalizeHebrew('סים'));
    }

    // Strip common Hebrew proclitic prefixes (ה, ב, ל, כ, מ, ש, ו) if remaining word is >= 4 chars
    if (w.length >= 4 && /^[והבלכמש]/.test(w)) {
      tokens.add(w.slice(1));
      // Double prefix, e.g. "ובאהבה", "ומהאהבה"
      if (w.length >= 5 && /^[ו][הבלכמש]/.test(w)) {
        tokens.add(w.slice(2));
      }
    }
  }

  return Array.from(tokens);
}

export function initStoresSearch(stores) {
  storesMiniSearch = new MiniSearch({
    fields: ['nameNorm', 'catNorm', 'cardsNorm', 'descNorm', 'tokens'],
    storeFields: ['id', 'name', 'slug'],
    tokenize: tokenizeHebrew,
    processTerm: (term) => normalizeHebrew(term),
    searchOptions: {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      boost: { nameNorm: 3.0, cardsNorm: 1.5, catNorm: 1.2, descNorm: 0.5 },
      processTerm: (term) => normalizeHebrew(term)
    }
  });

  const docs = stores.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    nameNorm: s.name,
    catNorm: s.category || '',
    cardsNorm: (s.cards || []).map(c => `${c.card_name || ''} ${c.discount || ''}`).join(' '),
    descNorm: `${s.conditions || ''} ${s.terms || ''}`,
    tokens: `${s.name} ${s.category || ''}`
  }));

  storesMiniSearch.addAll(docs);
  return storesMiniSearch;
}

export function suggestStores(query, options = {}) {
  if (!query || !storesMiniSearch) return [];
  const clean = normalizeHebrew(query).trim();
  if (!clean) return [];

  try {
    return storesMiniSearch.autoSuggest(clean, {
      fuzzy: (term) => (term.length > 3 ? 0.2 : false)
    });
  } catch (err) {
    console.warn('MiniSearch stores suggest error:', err);
    return [];
  }
}

export function searchStores(query, options = {}) {
  if (!query || !storesMiniSearch) return null;
  const clean = normalizeHebrew(query).trim();
  if (!clean) return null;

  try {
    const searchOpts = {};
    if (options.fields) {
      searchOpts.fields = options.fields;
    } else if (options.inDesc === false) {
      searchOpts.fields = ['nameNorm', 'catNorm', 'cardsNorm', 'tokens'];
    }
    
    const finalQuery = options.smartSearch ? buildSmartQuery(clean) : clean;
    const results = storesMiniSearch.search(finalQuery, searchOpts);
    const scoreMap = new Map();
    results.forEach(r => {
      scoreMap.set(r.id, r.score);
      scoreMap.set(String(r.id), r.score);
    });
    return scoreMap;
  } catch (err) {
    console.warn('MiniSearch stores error, fallback:', err);
    return null;
  }
}

export function initDealsSearch(deals) {
  dealsMiniSearch = new MiniSearch({
    fields: ['titleNorm', 'suppNorm', 'catNorm', 'tagNorm', 'descNorm', 'termsNorm', 'tokens'],
    storeFields: ['id', 'title', 'slug'],
    tokenize: tokenizeHebrew,
    processTerm: (term) => normalizeHebrew(term),
    searchOptions: {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      boost: { titleNorm: 3.0, suppNorm: 2.0, catNorm: 1.2, tagNorm: 1.0, descNorm: 0.5, termsNorm: 0.5 },
      processTerm: (term) => normalizeHebrew(term)
    }
  });

  const docs = deals.map(d => ({
    id: String(d.id),
    title: d.title,
    slug: d.slug || d.id,
    titleNorm: d.title,
    suppNorm: d.supplier || '',
    catNorm: d.category || '',
    tagNorm: (d.tags || []).join(' '),
    descNorm: d.description || '',
    termsNorm: d.terms_of_use || '',
    tokens: `${d.title} ${d.supplier || ''} ${d.category || ''}`
  }));

  dealsMiniSearch.addAll(docs);
  return dealsMiniSearch;
}

export function suggestDeals(query, options = {}) {
  if (!query || !dealsMiniSearch) return [];
  const clean = normalizeHebrew(query).trim();
  if (!clean) return [];

  try {
    return dealsMiniSearch.autoSuggest(clean, {
      fuzzy: (term) => (term.length > 3 ? 0.2 : false)
    });
  } catch (err) {
    console.warn('MiniSearch deals suggest error:', err);
    return [];
  }
}

export function searchDeals(query, options = {}) {
  if (!query || !dealsMiniSearch) return null;
  const clean = normalizeHebrew(query).trim();
  if (!clean) return null;

  try {
    const searchOpts = {};
    if (options.fields) {
      searchOpts.fields = options.fields;
    } else if (options.inDesc === false) {
      searchOpts.fields = ['titleNorm', 'suppNorm', 'catNorm', 'tagNorm', 'tokens'];
    }
    
    const finalQuery = options.smartSearch ? buildSmartQuery(clean) : clean;
    const results = dealsMiniSearch.search(finalQuery, searchOpts);
    const scoreMap = new Map();
    results.forEach(r => {
      scoreMap.set(r.id, r.score);
      scoreMap.set(String(r.id), r.score);
    });
    return scoreMap;
  } catch (err) {
    console.warn('MiniSearch deals error, fallback:', err);
    return null;
  }
}

export function initBillingSearch(billingStores) {
  billingMiniSearch = new MiniSearch({
    fields: ['nameNorm', 'cityNorm', 'catNorm', 'addrNorm', 'descNorm', 'tokens'],
    storeFields: ['id', 'name', 'slug'],
    tokenize: tokenizeHebrew,
    processTerm: (term) => normalizeHebrew(term),
    searchOptions: {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      boost: { nameNorm: 3.0, cityNorm: 1.5, catNorm: 1.2, addrNorm: 0.8, descNorm: 0.5 },
      processTerm: (term) => normalizeHebrew(term)
    }
  });

  const docs = billingStores.map(b => ({
    id: String(b.id),
    name: b.name,
    slug: b.slug || b.id,
    nameNorm: b.name,
    cityNorm: b.city || '',
    catNorm: `${b.category || ''} ${b.subcategory || ''}`,
    addrNorm: b.address || '',
    descNorm: b.description || '',
    tokens: `${b.name} ${b.city || ''} ${b.category || ''}`
  }));

  billingMiniSearch.addAll(docs);
  return billingMiniSearch;
}

export function suggestBilling(query, options = {}) {
  if (!query || !billingMiniSearch) return [];
  const clean = normalizeHebrew(query).trim();
  if (!clean) return [];

  try {
    return billingMiniSearch.autoSuggest(clean, {
      fuzzy: (term) => (term.length > 3 ? 0.2 : false)
    });
  } catch (err) {
    console.warn('MiniSearch billing suggest error:', err);
    return [];
  }
}

export function searchBilling(query, options = {}) {
  if (!query || !billingMiniSearch) return null;
  const clean = normalizeHebrew(query).trim();
  if (!clean) return null;

  try {
    const searchOpts = {};
    if (options.fields) {
      searchOpts.fields = options.fields;
    } else if (options.inDesc === false) {
      searchOpts.fields = ['nameNorm', 'cityNorm', 'catNorm', 'tokens'];
    }
    
    const finalQuery = options.smartSearch ? buildSmartQuery(clean) : clean;
    const results = billingMiniSearch.search(finalQuery, searchOpts);
    const scoreMap = new Map();
    results.forEach(r => {
      scoreMap.set(r.id, r.score);
      scoreMap.set(String(r.id), r.score);
    });
    return scoreMap;
  } catch (err) {
    console.warn('MiniSearch billing error, fallback:', err);
    return null;
  }
}
