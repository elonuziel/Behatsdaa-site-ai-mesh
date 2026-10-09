import { useState, useEffect, useMemo, useRef } from 'react';
import MiniSearch from 'minisearch';
import { UnifiedStore } from '../types/store';
import { UnifiedDeal } from '../types/deal';
import { ClubId } from '../types/club';
import { SortOption } from '../context/SearchContext';
import rawLexicon from '../data/search_lexicon.json';

export function normalizeHebrew(text: string | null | undefined): string {
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

/**
 * Hebrew-aware tokenizer:
 * 1. Expands camelCase words (e.g. GlobaleSIM -> Globale SIM)
 * 2. Normalizes final Hebrew letters
 * 3. Detects subwords like eSIM / SIM
 * 4. Strips common Hebrew proclitic prefixes (ה, ב, ל, כ, מ, ש, ו)
 */
export function tokenizeHebrew(text: string | null | undefined): string[] {
  if (!text) return [];
  const str = String(text);

  const expandedStr = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  const norm = normalizeHebrew(expandedStr);
  const origNorm = normalizeHebrew(str);
  if (!norm && !origNorm) return [];

  const rawWords = `${origNorm} ${norm}`.split(/\s+/).filter(Boolean);
  const tokens = new Set<string>();

  for (const w of rawWords) {
    tokens.add(w);

    // Sub-word eSIM / SIM detection across compound words
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
      if (w.length >= 5 && /^[ו][הבלכמש]/.test(w)) {
        tokens.add(w.slice(2));
      }
    }
  }

  return Array.from(tokens);
}

// Global bidirectional lexicon index
const directSynonyms = new Map<string, Set<string>>();
const transliterationsMap = new Map<string, Set<string>>();
const vocabularyList = new Set<string>();

function buildLexiconIndex() {
  if (directSynonyms.size > 0) return;

  const lexicon = rawLexicon as {
    transliterations?: Record<string, string[] | string>;
    synonyms?: Record<string, string[]>;
    brand_aliases?: Record<string, string[]>;
  };

  // 1. Synonyms (Bidirectional mapping)
  if (lexicon.synonyms) {
    for (const [key, synList] of Object.entries(lexicon.synonyms)) {
      const normKey = normalizeHebrew(key);
      const allCluster = new Set<string>();
      if (normKey) {
        allCluster.add(normKey);
        vocabularyList.add(normKey);
      }

      for (const syn of synList) {
        const normSyn = normalizeHebrew(syn);
        if (normSyn) {
          allCluster.add(normSyn);
          vocabularyList.add(normSyn);
        }
      }

      for (const word of allCluster) {
        if (!directSynonyms.has(word)) {
          directSynonyms.set(word, new Set());
        }
        const existing = directSynonyms.get(word)!;
        for (const target of allCluster) {
          if (target !== word) {
            existing.add(target);
          }
        }
      }
    }
  }

  // 2. Transliterations (English <-> Hebrew)
  if (lexicon.transliterations) {
    for (const [enKey, val] of Object.entries(lexicon.transliterations)) {
      const normEn = enKey.toLowerCase().trim();
      const targets = Array.isArray(val) ? val : [val];

      const cluster = new Set<string>();
      cluster.add(normEn);
      vocabularyList.add(normEn);
      for (const t of targets) {
        const normT = normalizeHebrew(t);
        if (normT) {
          cluster.add(normT);
          vocabularyList.add(normT);
        }
        const lowT = t.toLowerCase().trim();
        cluster.add(lowT);
        vocabularyList.add(lowT);
      }

      for (const word of cluster) {
        if (!transliterationsMap.has(word)) {
          transliterationsMap.set(word, new Set());
        }
        const existing = transliterationsMap.get(word)!;
        for (const target of cluster) {
          if (target !== word) {
            existing.add(target);
          }
        }
      }
    }
  }

  // 3. Brand Aliases
  if (lexicon.brand_aliases) {
    for (const [canonical, aliases] of Object.entries(lexicon.brand_aliases)) {
      const normC = normalizeHebrew(canonical);
      const cluster = new Set<string>();
      if (normC) {
        cluster.add(normC);
        vocabularyList.add(normC);
      }
      cluster.add(canonical.toLowerCase().trim());
      vocabularyList.add(canonical.toLowerCase().trim());
      for (const a of aliases) {
        const normA = normalizeHebrew(a);
        if (normA) {
          cluster.add(normA);
          vocabularyList.add(normA);
        }
        cluster.add(a.toLowerCase().trim());
        vocabularyList.add(a.toLowerCase().trim());
      }
      for (const word of cluster) {
        if (!directSynonyms.has(word)) {
          directSynonyms.set(word, new Set());
        }
        const existing = directSynonyms.get(word)!;
        for (const target of cluster) {
          if (target !== word) {
            existing.add(target);
          }
        }
      }
    }
  }
}

buildLexiconIndex();

export function stripHebrewPrefixes(term: string): string[] {
  const norm = normalizeHebrew(term);
  if (!norm || norm.length < 3) return [];
  const results = new Set<string>();

  // Triple prefixes: וכש, ומש, ולכ
  if (norm.length >= 6 && /^ו[כמש][שכ]/.test(norm)) {
    results.add(norm.slice(3));
  }

  // Double prefixes: וב, ול, וכ, ומ, וש, וה, מה, כש, לכ
  if (norm.length >= 5 && /^(?:ו[הבלכמש]|מה|כש|לכ)/.test(norm)) {
    results.add(norm.slice(2));
  }

  // Single prefixes: ה, ב, ל, כ, מ, ש, ו
  if (norm.length >= 4 && /^[והבלכמש]/.test(norm)) {
    results.add(norm.slice(1));
  }

  return Array.from(results).filter(w => w.length >= 2);
}

export function expandSmartTerms(query: string): string[] {
  const clean = normalizeHebrew(query).trim();
  if (!clean) return [];

  const rawTerms = clean.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();

  rawTerms.forEach(term => {
    expanded.add(term);

    // Direct and reverse synonyms
    const syns = directSynonyms.get(term);
    if (syns) {
      syns.forEach(s => expanded.add(s));
    }

    // Transliterations
    const trans = transliterationsMap.get(term) || transliterationsMap.get(term.toLowerCase());
    if (trans) {
      trans.forEach(t => expanded.add(t));
    }

    // Deep prefix stripping: add root words and their synonyms
    const strippedCandidates = stripHebrewPrefixes(term);
    for (const stripped of strippedCandidates) {
      expanded.add(stripped);

      const strippedSyns = directSynonyms.get(stripped);
      if (strippedSyns) {
        strippedSyns.forEach(s => expanded.add(s));
      }
      const strippedTrans = transliterationsMap.get(stripped) || transliterationsMap.get(stripped.toLowerCase());
      if (strippedTrans) {
        strippedTrans.forEach(t => expanded.add(t));
      }
    }
  });

  const originalSet = new Set(rawTerms);
  return Array.from(expanded).filter(t => !originalSet.has(t));
}

// Levenshtein distance for fuzzy / "Did you mean?" suggestions
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[a.length][b.length];
}

export function findDidYouMean(query: string, customVocab?: Set<string>): string[] {
  const clean = normalizeHebrew(query).trim();
  if (!clean || clean.length < 2) return [];

  const vocab = customVocab || vocabularyList;
  const suggestions: { word: string; dist: number }[] = [];

  for (const word of vocab) {
    if (word === clean) continue;
    // Prefix match
    if (word.startsWith(clean) && word.length <= clean.length + 4) {
      suggestions.push({ word, dist: word.length - clean.length });
      continue;
    }
    const dist = levenshteinDistance(clean, word);
    const maxAllowedDist = clean.length <= 3 ? 1 : clean.length <= 6 ? 2 : 3;
    if (dist <= maxAllowedDist) {
      suggestions.push({ word, dist });
    }
  }

  suggestions.sort((a, b) => a.dist - b.dist);
  return suggestions.slice(0, 3).map(s => s.word);
}

export function getStoreActiveDiscount(store: UnifiedStore, activeClubs: Set<ClubId>): number {
  if (Array.isArray(store.payment_options) && store.payment_options.length > 0) {
    let max = 0;
    for (const opt of store.payment_options) {
      if (activeClubs.has(opt.club) && opt.rateType === 'percent' && opt.rate > max) {
        max = opt.rate;
      }
    }
    if (max > 0) return max;
  }
  const clubs = store.clubs || ['behatsdaa'];
  if (clubs.some(c => activeClubs.has(c))) {
    return store.max_discount || 0;
  }
  return 0;
}

export function useMiniSearch(
  query: string,
  activeClubs: Set<ClubId>,
  sortBy: SortOption,
  selectedCategory: string = 'all',
  showFavoritesOnly: boolean = false,
  isFavorite?: (type: 'store' | 'deal', id: string) => boolean,
  options?: {
    smartSearch?: boolean;
    fuzzySearch?: boolean;
    searchInDesc?: boolean;
  }
) {
  const [stores, setStores] = useState<UnifiedStore[]>([]);
  const [deals, setDeals] = useState<UnifiedDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const miniSearchRef = useRef<MiniSearch | null>(null);

  const smartSearch = options?.smartSearch ?? true;
  const fuzzySearch = options?.fuzzySearch ?? true;
  const searchInDesc = options?.searchInDesc ?? false;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const base = import.meta.env.BASE_URL || '/';
    const storesUrl = `${base}data/stores.json`.replace('//', '/');
    const dealsUrl = `${base}data/deals.json`.replace('//', '/');

    Promise.all([
      fetch(storesUrl).then(res => {
        if (!res.ok) throw new Error(`Stores error: ${res.status}`);
        return res.json();
      }),
      fetch(dealsUrl).then(res => {
        if (!res.ok) throw new Error(`Deals error: ${res.status}`);
        return res.json();
      })
    ])
      .then(([storesJson, dealsJson]) => {
        if (!isMounted) return;

        const rawStores: UnifiedStore[] = storesJson.stores || [];
        const rawDeals: UnifiedDeal[] = dealsJson.deals || [];

        setStores(rawStores);
        setDeals(rawDeals);

        // Build dynamic vocabulary for Did-You-Mean
        rawStores.forEach(s => {
          if (s.name) vocabularyList.add(normalizeHebrew(s.name));
          if (s.category) vocabularyList.add(normalizeHebrew(s.category));
          (s.billing_branches || []).forEach(b => {
            if (b.city) vocabularyList.add(normalizeHebrew(b.city));
          });
        });
        rawDeals.forEach(d => {
          if (d.supplier) vocabularyList.add(normalizeHebrew(d.supplier));
          if (d.category) vocabularyList.add(normalizeHebrew(d.category));
        });

        // Build high-performance MiniSearch instance with full fields
        const ms = new MiniSearch({
          fields: ['nameNorm', 'catNorm', 'cardsNorm', 'branchesNorm', 'suppNorm', 'tagsNorm', 'descNorm', 'tokens'],
          storeFields: ['id', 'type', 'originalId'],
          tokenize: tokenizeHebrew,
          processTerm: (term) => normalizeHebrew(term),
          searchOptions: {
            prefix: true,
            fuzzy: (term) => (term.length > 3 ? 0.2 : false),
            boost: { nameNorm: 3.5, suppNorm: 3.0, catNorm: 2.0, cardsNorm: 1.8, branchesNorm: 1.5, tagsNorm: 1.3, tokens: 1.0, descNorm: 0.6 },
            processTerm: (term) => normalizeHebrew(term)
          }
        });

        // Add stores to index
        const storeDocs = rawStores.map(s => {
          const cardsStr = (s.cards || []).map(c => typeof c === 'string' ? c : `${c.card_name || ''} ${c.discount || ''} ${c.notes || ''}`).join(' ');
          const paymentOptionsStr = (s.payment_options || []).map(p => `${p.label} ${p.description} ${p.terms || ''}`).join(' ');
          const branchesStr = (s.billing_branches || []).map(b => `${b.name} ${b.city || ''} ${b.address || ''}`).join(' ');
          const descStr = `${s.conditions || ''} ${paymentOptionsStr} ${branchesStr}`;
          return {
            id: `store_${s.id}`,
            originalId: String(s.id),
            nameNorm: normalizeHebrew(s.name),
            catNorm: normalizeHebrew(s.category),
            cardsNorm: normalizeHebrew(cardsStr),
            branchesNorm: normalizeHebrew(branchesStr),
            suppNorm: '',
            tagsNorm: '',
            descNorm: normalizeHebrew(descStr),
            tokens: `${s.name} ${s.category || ''} ${branchesStr}`,
            type: 'store'
          };
        });

        // Add deals to index
        const dealDocs = rawDeals.map(d => {
          const tagsStr = (d.tags || []).join(' ');
          const linkedStoreName = d.linked_store?.name || d.linkedStore?.name || '';
          const descStr = `${d.description || ''} ${d.terms_of_use || ''} ${d.locations || ''} ${d.coupon_code || ''}`;
          return {
            id: `deal_${d.id}`,
            originalId: String(d.id),
            nameNorm: normalizeHebrew(d.title),
            catNorm: normalizeHebrew(d.category),
            cardsNorm: '',
            branchesNorm: normalizeHebrew(d.locations || ''),
            suppNorm: normalizeHebrew(`${d.supplier || ''} ${linkedStoreName}`),
            tagsNorm: normalizeHebrew(tagsStr),
            descNorm: normalizeHebrew(descStr),
            tokens: `${d.title} ${d.supplier || ''} ${d.category || ''} ${linkedStoreName}`,
            type: 'deal'
          };
        });

        ms.addAll([...storeDocs, ...dealDocs]);
        miniSearchRef.current = ms;
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load stores & deals:', err);
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute category lists with counts
  const storeCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    stores.forEach(s => {
      const clubs = s.clubs || ['behatsdaa'];
      if (!clubs.some(c => activeClubs.has(c))) return;
      const cat = s.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [stores, activeClubs]);

  const dealCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach(d => {
      const club = d.club || 'behatsdaa';
      if (!activeClubs.has(club)) return;
      const cat = d.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [deals, activeClubs]);

  // Filtered and sorted Stores & Deals
  const { filteredStores, filteredDeals } = useMemo(() => {
    if (stores.length === 0 && deals.length === 0) {
      return { filteredStores: [], filteredDeals: [] };
    }

    let matchingStoreIds: Set<string> | null = null;
    let matchingDealIds: Set<string> | null = null;
    const storeSearchScore = new Map<string, number>();
    const dealSearchScore = new Map<string, number>();

    const q = query.trim();
    if (q && miniSearchRef.current) {
      matchingStoreIds = new Set();
      matchingDealIds = new Set();

      const searchFields = searchInDesc
        ? ['nameNorm', 'catNorm', 'cardsNorm', 'branchesNorm', 'suppNorm', 'tagsNorm', 'descNorm', 'tokens']
        : ['nameNorm', 'catNorm', 'cardsNorm', 'branchesNorm', 'suppNorm', 'tagsNorm', 'tokens'];

      const searchOpts: any = {
        prefix: true,
        fuzzy: fuzzySearch ? (term: string) => (term.length > 3 ? 0.2 : false) : false,
        fields: searchFields,
        boost: { nameNorm: 3.5, suppNorm: 3.0, catNorm: 2.0, cardsNorm: 1.8, branchesNorm: 1.5, tagsNorm: 1.3, tokens: 1.0, descNorm: 0.6 },
        processTerm: (term: string) => normalizeHebrew(term)
      };

      const queryWords = q.split(/\s+/).filter(Boolean);

      let finalQuery: any = q;
      if (smartSearch) {
        const expandedSynonyms = expandSmartTerms(q);
        if (expandedSynonyms.length > 0) {
          finalQuery = {
            combineWith: 'OR',
            queries: [
              q,
              ...expandedSynonyms.map(t => ({ queries: [t], boost: 0.6 }))
            ]
          };
        }
      }

      try {
        // If multi-word, try AND first to boost exact co-occurrences
        if (queryWords.length > 1) {
          try {
            const andResults = miniSearchRef.current.search(q, {
              ...searchOpts,
              combineWith: 'AND',
              fuzzy: false
            });
            for (const res of andResults) {
              const origId = String(res.originalId);
              if (res.type === 'store') {
                matchingStoreIds.add(origId);
                storeSearchScore.set(origId, (storeSearchScore.get(origId) || 0) + res.score * 3.0);
              } else if (res.type === 'deal') {
                matchingDealIds.add(origId);
                dealSearchScore.set(origId, (dealSearchScore.get(origId) || 0) + res.score * 3.0);
              }
            }
          } catch {
            // Ignore AND error, proceed to main query
          }
        }

        const searchResults = miniSearchRef.current.search(finalQuery, searchOpts);

        for (const res of searchResults) {
          const origId = String(res.originalId);
          if (res.type === 'store') {
            matchingStoreIds.add(origId);
            storeSearchScore.set(origId, (storeSearchScore.get(origId) || 0) + res.score);
          } else if (res.type === 'deal') {
            matchingDealIds.add(origId);
            dealSearchScore.set(origId, (dealSearchScore.get(origId) || 0) + res.score);
          }
        }
      } catch (err) {
        console.warn('MiniSearch search query error, fallback to literal:', err);
        try {
          const fallbackResults = miniSearchRef.current.search(q, {
            ...searchOpts,
            fuzzy: false
          });
          for (const res of fallbackResults) {
            const origId = String(res.originalId);
            if (res.type === 'store') {
              matchingStoreIds.add(origId);
              storeSearchScore.set(origId, res.score);
            } else if (res.type === 'deal') {
              matchingDealIds.add(origId);
              dealSearchScore.set(origId, res.score);
            }
          }
        } catch {
          // Keep sets empty on fatal query error
        }
      }
    }

    // Filter stores
    let sList = stores.filter(store => {
      const clubs = store.clubs || ['behatsdaa'];
      const hasActiveClub = clubs.some(c => activeClubs.has(c));
      if (!hasActiveClub) return false;

      if (selectedCategory !== 'all' && (store.category || 'כללי') !== selectedCategory) {
        return false;
      }

      if (showFavoritesOnly && isFavorite && !isFavorite('store', String(store.id))) {
        return false;
      }

      if (matchingStoreIds !== null && !matchingStoreIds.has(String(store.id))) {
        return false;
      }

      return true;
    });

    // Filter deals
    let dList = deals.filter(deal => {
      const club = deal.club || 'behatsdaa';
      if (!activeClubs.has(club)) return false;

      if (selectedCategory !== 'all' && (deal.category || 'כללי') !== selectedCategory) {
        return false;
      }

      if (showFavoritesOnly && isFavorite && !isFavorite('deal', String(deal.id))) {
        return false;
      }

      if (matchingDealIds !== null && !matchingDealIds.has(String(deal.id))) {
        return false;
      }

      return true;
    });

    // Sort stores
    sList.sort((a, b) => {
      if (sortBy === 'relevant' && q) {
        const scoreA = storeSearchScore.get(String(a.id)) || 0;
        const scoreB = storeSearchScore.get(String(b.id)) || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
      } else if (sortBy === 'discount') {
        const discA = getStoreActiveDiscount(a, activeClubs);
        const discB = getStoreActiveDiscount(b, activeClubs);
        if (discA !== discB) return discB - discA;
      }
      return (a.name || '').localeCompare(b.name || '', 'he');
    });

    // Sort deals
    dList.sort((a, b) => {
      if (sortBy === 'relevant' && q) {
        const scoreA = dealSearchScore.get(String(a.id)) || 0;
        const scoreB = dealSearchScore.get(String(b.id)) || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
      } else if (sortBy === 'discount') {
        const discA = a.discount_percent || 0;
        const discB = b.discount_percent || 0;
        if (discA !== discB) return discB - discA;
      }
      return (a.title || '').localeCompare(b.title || '', 'he');
    });

    return { filteredStores: sList, filteredDeals: dList };
  }, [
    stores,
    deals,
    query,
    activeClubs,
    sortBy,
    selectedCategory,
    showFavoritesOnly,
    isFavorite,
    smartSearch,
    fuzzySearch,
    searchInDesc
  ]);

  // Compute "Did you mean?" suggestions when search yields 0 results
  const didYouMean = useMemo(() => {
    const q = query.trim();
    if (!q || q.length < 2) return [];
    if (filteredStores.length > 0 || filteredDeals.length > 0) return [];
    return findDidYouMean(q);
  }, [query, filteredStores.length, filteredDeals.length]);

  const suggest = useMemo(() => {
    return (text: string, limit: number = 6): string[] => {
      if (!miniSearchRef.current || !text.trim()) return [];
      const clean = normalizeHebrew(text).trim();
      if (!clean) return [];
      try {
        const res = miniSearchRef.current.autoSuggest(clean, {
          prefix: true,
          fuzzy: (t: string) => (t.length > 3 ? 0.2 : false)
        });
        return res.slice(0, limit).map(r => r.suggestion);
      } catch {
        return [];
      }
    };
  }, []);

  return {
    isLoading,
    error,
    allStores: stores,
    allDeals: deals,
    filteredStores,
    filteredDeals,
    storeCategories,
    dealCategories,
    didYouMean,
    suggest
  };
}
