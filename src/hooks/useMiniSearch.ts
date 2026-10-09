import { useState, useEffect, useMemo, useRef } from 'react';
import MiniSearch from 'minisearch';
import { SearchIndexStore } from '../types/store';
import { SearchIndexDeal } from '../types/deal';
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

interface SearchIndexData {
  metadata: {
    last_updated: string;
    total_stores: number;
    total_deals: number;
  };
  stores: SearchIndexStore[];
  deals: SearchIndexDeal[];
}

export function getStoreActiveDiscount(store: SearchIndexStore, activeClubs: Set<ClubId>): number {
  if (store.cd) {
    let max = 0;
    for (const c of activeClubs) {
      const val = store.cd[c];
      if (val !== undefined && val > max) {
        max = val;
      }
    }
    return max;
  }
  return store.d || 0;
}

export function useMiniSearch(
  query: string,
  activeClubs: Set<ClubId>,
  sortBy: SortOption
) {
  const [data, setData] = useState<SearchIndexData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const miniSearchRef = useRef<MiniSearch | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('./data/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((json: SearchIndexData) => {
        if (!isMounted) return;
        setData(json);

        // Build MiniSearch instance
        const ms = new MiniSearch({
          fields: ['nameNorm'],
          storeFields: ['id', 'type'],
          processTerm: (term) => normalizeHebrew(term),
          searchOptions: {
            prefix: true,
            fuzzy: (term) => (term.length > 3 ? 0.2 : false),
            processTerm: (term) => normalizeHebrew(term)
          }
        });

        // Add stores to index
        const storeDocs = (json.stores || []).map(s => ({
          id: `store_${s.id}`,
          originalId: s.id,
          nameNorm: normalizeHebrew(s.name),
          type: 'store'
        }));

        // Add deals to index
        const dealDocs = (json.deals || []).map(d => ({
          id: `deal_${d.id}`,
          originalId: d.id,
          nameNorm: normalizeHebrew(d.name),
          type: 'deal'
        }));

        ms.addAll([...storeDocs, ...dealDocs]);
        miniSearchRef.current = ms;
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load search index:', err);
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered and sorted Stores & Deals
  const { filteredStores, filteredDeals } = useMemo(() => {
    if (!data) return { filteredStores: [], filteredDeals: [] };

    let matchingStoreIds: Set<string> | null = null;
    let matchingDealIds: Set<string> | null = null;

    const trimmedQuery = query.trim();
    if (trimmedQuery && miniSearchRef.current) {
      const searchResults = miniSearchRef.current.search(trimmedQuery);
      matchingStoreIds = new Set();
      matchingDealIds = new Set();

      for (const res of searchResults) {
        if (res.type === 'store') {
          matchingStoreIds.add(res.id.replace('store_', ''));
        } else if (res.type === 'deal') {
          matchingDealIds.add(res.id.replace('deal_', ''));
        }
      }
    }

    // 1. Filter Stores by active clubs and query match
    let stores = data.stores.filter(s => {
      const clubs = s.clubs || ['behatsdaa'];
      const hasActiveClub = clubs.some(c => activeClubs.has(c));
      if (!hasActiveClub) return false;

      if (matchingStoreIds !== null) {
        return matchingStoreIds.has(s.id);
      }
      return true;
    });

    // 2. Filter Deals by active clubs and query match
    let deals = data.deals.filter(d => {
      const club = d.club || 'behatsdaa';
      if (!activeClubs.has(club)) return false;

      if (matchingDealIds !== null) {
        return matchingDealIds.has(d.id);
      }
      return true;
    });

    // 3. Sort Stores
    stores = [...stores].sort((a, b) => {
      const discA = getStoreActiveDiscount(a, activeClubs);
      const discB = getStoreActiveDiscount(b, activeClubs);
      if (sortBy === 'discount') {
        return discB - discA;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'he');
      }
      // 'relevant': default order
      return discB - discA;
    });

    // 4. Sort Deals
    deals = [...deals].sort((a, b) => {
      if (sortBy === 'discount') {
        return (b.d || 0) - (a.d || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'he');
      }
      return (b.d || 0) - (a.d || 0);
    });

    return { filteredStores: stores, filteredDeals: deals };
  }, [data, query, activeClubs, sortBy]);

  return {
    isLoading,
    error,
    filteredStores,
    filteredDeals,
    totalStores: data?.stores.length || 0,
    totalDeals: data?.deals.length || 0
  };
}
