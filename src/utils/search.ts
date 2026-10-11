import MiniSearch, { type SearchOptions } from 'minisearch';

export function normalizeHebrew(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[״"]/g, '')
    .replace(/['׳]/g, '')
    .replace(/[-\s_]+/g, ' ')
    .trim()
    .toLowerCase();
}

let storesMiniSearch: MiniSearch<any> | null = null;
let dealsMiniSearch: MiniSearch<any> | null = null;
let billingMiniSearch: MiniSearch<any> | null = null;
let searchLexicon: any = null;

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

export function buildSmartQuery(query: string): any {
  if (!searchLexicon) return query;
  const terms = query.toLowerCase().split(/\s+/);
  const expandedTerms = new Set<string>();

  terms.forEach(term => {
    expandedTerms.add(term);

    if (searchLexicon.transliterations && searchLexicon.transliterations[term]) {
      expandedTerms.add(searchLexicon.transliterations[term]);
    }

    if (searchLexicon.synonyms && searchLexicon.synonyms[term]) {
      searchLexicon.synonyms[term].forEach((syn: string) => expandedTerms.add(syn));
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
      query,
      ...additionalTerms.map(t => ({ queries: [t], boost: 0.5 }))
    ]
  };
}

function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeHebrew(text);
  const terms = normalized.split(/\s+/).filter(t => t.length > 0);
  const tokens = new Set<string>();

  terms.forEach(term => {
    tokens.add(term);

    if (term.length >= 4 && /^[והבלכמש]/.test(term)) {
      tokens.add(term.slice(1));
    }
    if (term.length >= 5 && /^ו[הבלכמש]/.test(term)) {
      tokens.add(term.slice(2));
    }
  });

  return Array.from(tokens);
}

function createMiniSearchInstance(fields: string[], boost: Record<string, number> = {}): MiniSearch<any> {
  return new MiniSearch({
    fields,
    storeFields: ['id'],
    tokenize,
    processTerm: (term: string) => normalizeHebrew(term),
    searchOptions: {
      boost,
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    }
  });
}

export function initStoresSearch(stores: any[]): MiniSearch<any> {
  storesMiniSearch = createMiniSearchInstance(
    ['name', 'category', 'cards', 'description'],
    { name: 3, category: 1.5, cards: 2, description: 0.5 }
  );

  const docs = stores.map(s => {
    let cardNames = '';
    if (Array.isArray(s.cards)) {
      cardNames = s.cards.map((c: any) => (typeof c === 'string' ? c : c?.card_name || '')).join(' ');
    }
    return {
      id: s.id,
      name: s.name || '',
      category: s.category || '',
      cards: cardNames,
      description: s.description || s.conditions || ''
    };
  });

  storesMiniSearch.addAll(docs);
  return storesMiniSearch;
}

export function searchStores(query: string, _options: any = {}): Map<any, number> {
  const resultMap = new Map<any, number>();
  if (!storesMiniSearch || !query.trim()) return resultMap;

  const results = storesMiniSearch.search(query);
  results.forEach(r => resultMap.set(r.id, r.score));
  return resultMap;
}

export function suggestStores(query: string, options: any = {}): any[] {
  if (!storesMiniSearch || !query.trim()) return [];
  const searchOpts: SearchOptions = {
    prefix: true,
    fuzzy: 0.2
  };
  if (options.fields) {
    searchOpts.fields = options.fields;
  }
  return storesMiniSearch.autoSuggest(query, searchOpts);
}

export function initDealsSearch(deals: any[]): MiniSearch<any> {
  dealsMiniSearch = createMiniSearchInstance(
    ['title', 'supplier', 'category', 'tags', 'description'],
    { title: 3, supplier: 2.5, tags: 2, category: 1.5, description: 0.5 }
  );

  const docs = deals.map(d => ({
    id: d.id,
    title: d.title || '',
    supplier: d.supplier || '',
    category: d.category || '',
    tags: Array.isArray(d.tags) ? d.tags.join(' ') : (d.tags || ''),
    description: d.description || d.terms_of_use || ''
  }));

  dealsMiniSearch.addAll(docs);
  return dealsMiniSearch;
}

export function searchDeals(query: string, _options: any = {}): Map<any, number> {
  const resultMap = new Map<any, number>();
  if (!dealsMiniSearch || !query.trim()) return resultMap;

  const results = dealsMiniSearch.search(query);
  results.forEach(r => resultMap.set(r.id, r.score));
  return resultMap;
}

export function suggestDeals(query: string, options: any = {}): any[] {
  if (!dealsMiniSearch || !query.trim()) return [];
  const searchOpts: SearchOptions = {
    prefix: true,
    fuzzy: 0.2
  };
  if (options.fields) {
    searchOpts.fields = options.fields;
  }
  return dealsMiniSearch.autoSuggest(query, searchOpts);
}

export function initBillingSearch(billingStores: any[]): MiniSearch<any> {
  billingMiniSearch = createMiniSearchInstance(
    ['name', 'category', 'city', 'address', 'description'],
    { name: 3, category: 2, city: 1.5, address: 1, description: 0.5 }
  );

  const docs = billingStores.map(b => ({
    id: b.id,
    name: b.name || '',
    category: b.category || '',
    city: b.city || '',
    address: b.full_address || b.address || '',
    description: b.description || ''
  }));

  billingMiniSearch.addAll(docs);
  return billingMiniSearch;
}

export function searchBilling(query: string, _options: any = {}): Map<any, number> {
  const resultMap = new Map<any, number>();
  if (!billingMiniSearch || !query.trim()) return resultMap;

  const results = billingMiniSearch.search(query);
  results.forEach(r => resultMap.set(r.id, r.score));
  return resultMap;
}

export function suggestBilling(query: string, options: any = {}): any[] {
  if (!billingMiniSearch || !query.trim()) return [];
  const searchOpts: SearchOptions = {
    prefix: true,
    fuzzy: 0.2
  };
  if (options.fields) {
    searchOpts.fields = options.fields;
  }
  return billingMiniSearch.autoSuggest(query, searchOpts);
}
