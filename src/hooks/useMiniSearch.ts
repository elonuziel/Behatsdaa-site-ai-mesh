import { useState, useEffect, useMemo, useRef } from 'react';
import MiniSearch from 'minisearch';
import { UnifiedStore } from '../types/store';
import { UnifiedDeal } from '../types/deal';
import { ClubId } from '../types/club';
import { SortOption } from '../context/SearchContext';

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
  isFavorite?: (type: 'store' | 'deal', id: string) => boolean
) {
  const [stores, setStores] = useState<UnifiedStore[]>([]);
  const [deals, setDeals] = useState<UnifiedDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const miniSearchRef = useRef<MiniSearch | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch('./data/stores.json').then(res => {
        if (!res.ok) throw new Error(`Stores error: ${res.status}`);
        return res.json();
      }),
      fetch('./data/deals.json').then(res => {
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

        // Build high-performance MiniSearch instance with rich fields
        const ms = new MiniSearch({
          fields: ['nameNorm', 'catNorm', 'cardsNorm', 'suppNorm', 'tagsNorm'],
          storeFields: ['id', 'type'],
          processTerm: (term) => normalizeHebrew(term),
          searchOptions: {
            prefix: true,
            fuzzy: (term) => (term.length > 3 ? 0.2 : false),
            processTerm: (term) => normalizeHebrew(term)
          }
        });

        // Add stores to index
        const storeDocs = rawStores.map(s => {
          const cardsStr = (s.cards || []).map(c => typeof c === 'string' ? c : c.card_name || '').join(' ');
          return {
            id: `store_${s.id}`,
            originalId: String(s.id),
            nameNorm: normalizeHebrew(s.name),
            catNorm: normalizeHebrew(s.category),
            cardsNorm: normalizeHebrew(cardsStr),
            suppNorm: '',
            tagsNorm: '',
            type: 'store'
          };
        });

        // Add deals to index
        const dealDocs = rawDeals.map(d => {
          const tagsStr = (d.tags || []).join(' ');
          return {
            id: `deal_${d.id}`,
            originalId: String(d.id),
            nameNorm: normalizeHebrew(d.title),
            catNorm: normalizeHebrew(d.category),
            cardsNorm: '',
            suppNorm: normalizeHebrew(d.supplier),
            tagsNorm: normalizeHebrew(tagsStr),
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
      const searchResults = miniSearchRef.current.search(q);
      matchingStoreIds = new Set();
      matchingDealIds = new Set();

      for (const res of searchResults) {
        if (res.type === 'store') {
          matchingStoreIds.add(String(res.originalId));
          storeSearchScore.set(String(res.originalId), res.score);
        } else if (res.type === 'deal') {
          matchingDealIds.add(String(res.originalId));
          dealSearchScore.set(String(res.originalId), res.score);
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
  }, [stores, deals, query, activeClubs, sortBy, selectedCategory, showFavoritesOnly, isFavorite]);

  return {
    isLoading,
    error,
    allStores: stores,
    allDeals: deals,
    filteredStores,
    filteredDeals,
    storeCategories,
    dealCategories
  };
}
