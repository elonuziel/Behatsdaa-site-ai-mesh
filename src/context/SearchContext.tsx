import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type PrimaryTab = 'mega' | 'behatsdaa' | 'uniq' | 'mastercard' | 'favorites';

export type MegaSubTab = 'all' | 'comparison' | 'map' | 'top-deals';
export type BehatsdaaSubTab = 'stores' | 'deals' | 'billing' | 'map' | 'wallets';
export type UniqSubTab = 'tab-a' | 'tab-b' | 'tab-c' | 'tab-d';
export type MastercardSubTab = 'deals' | 'active-today' | 'terms';
export type FavoritesSubTab = 'all' | 'stores' | 'deals';

export type SubTab = MegaSubTab | BehatsdaaSubTab | UniqSubTab | MastercardSubTab | FavoritesSubTab;
export type MainTab = string; // For backward compatibility
export type SortOption = 'discount' | 'name' | 'relevant';
export type ViewMode = 'grid' | 'table';
export type UiDensity = 'clean' | 'detailed';

export const DEFAULT_SUB_TABS: Record<PrimaryTab, string> = {
  mega: 'all',
  behatsdaa: 'stores',
  uniq: 'tab-a',
  mastercard: 'deals',
  favorites: 'all'
};

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
  primaryTab: PrimaryTab;
  setPrimaryTab: (tab: PrimaryTab) => void;
  subTab: string;
  setSubTab: (subTab: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  uiDensity: UiDensity;
  setUiDensity: (density: UiDensity) => void;
  toggleUiDensity: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCard: string;
  setSelectedCard: (card: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedStoreSlug: string | null;
  setSelectedStoreSlug: (slug: string | null) => void;
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
  smartSearch: boolean;
  setSmartSearch: (val: boolean) => void;
  fuzzySearch: boolean;
  setFuzzySearch: (val: boolean) => void;
  searchInDesc: boolean;
  setSearchInDesc: (val: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

function getInitialUrlParams() {
  if (typeof window === 'undefined') {
    return {
      query: '',
      tab: 'mega' as PrimaryTab,
      subtab: 'all',
      cat: 'all',
      store: null,
      deal: null
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const rawTab = searchParams.get('tab') || hashParams.get('tab');
  const validTabs: PrimaryTab[] = ['mega', 'behatsdaa', 'uniq', 'mastercard', 'favorites'];
  const tab: PrimaryTab = validTabs.includes(rawTab as PrimaryTab) ? (rawTab as PrimaryTab) : 'mega';

  const subtab = searchParams.get('subtab') || searchParams.get('sub') || hashParams.get('sub') || DEFAULT_SUB_TABS[tab] || 'all';
  const query = searchParams.get('q') || '';
  const cat = searchParams.get('cat') || 'all';
  const store = searchParams.get('store') || null;
  const deal = searchParams.get('deal') || null;

  return { query, tab, subtab, cat, store, deal };
}

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialParams = getInitialUrlParams();

  const [query, setQueryState] = useState(initialParams.query);
  const [primaryTab, setPrimaryTabState] = useState<PrimaryTab>(initialParams.tab);
  const [subTab, setSubTabState] = useState<string>(initialParams.subtab);
  const [selectedCategory, setSelectedCategoryState] = useState<string>(initialParams.cat);
  const [selectedStoreSlug, setSelectedStoreSlugState] = useState<string | null>(initialParams.store);
  const [selectedDealId, setSelectedDealIdState] = useState<string | null>(initialParams.deal);

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('app_view_mode');
    return saved === 'table' ? 'table' : 'grid';
  });

  const [uiDensity, setUiDensityState] = useState<UiDensity>(() => {
    const saved = localStorage.getItem('app_ui_density');
    return saved === 'detailed' ? 'detailed' : 'clean';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('app_view_mode', mode);
  };

  const setUiDensity = (density: UiDensity) => {
    setUiDensityState(density);
    localStorage.setItem('app_ui_density', density);
  };

  const toggleUiDensity = () => {
    setUiDensityState(prev => {
      const next = prev === 'clean' ? 'detailed' : 'clean';
      localStorage.setItem('app_ui_density', next);
      return next;
    });
  };

  const [selectedCard, setSelectedCard] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('discount');

  // Search enhancement options
  const [smartSearch, setSmartSearchState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mc_search_smart');
    return saved !== null ? saved === 'true' : true;
  });
  const [fuzzySearch, setFuzzySearchState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mc_search_fuzzy');
    return saved !== null ? saved === 'true' : true;
  });
  const [searchInDesc, setSearchInDescState] = useState<boolean>(() => {
    const saved = localStorage.getItem('mc_search_indesc');
    return saved !== null ? saved === 'true' : false;
  });

  const setSmartSearch = (val: boolean) => {
    setSmartSearchState(val);
    localStorage.setItem('mc_search_smart', String(val));
  };

  const setFuzzySearch = (val: boolean) => {
    setFuzzySearchState(val);
    localStorage.setItem('mc_search_fuzzy', String(val));
  };

  const setSearchInDesc = (val: boolean) => {
    setSearchInDescState(val);
    localStorage.setItem('mc_search_indesc', String(val));
  };

  // Keep a ref to track whether URL update was triggered by popstate
  const isPopStateRef = useRef(false);

  // Sync state with URL search params
  const updateUrl = useCallback((
    q: string,
    pTab: PrimaryTab,
    sTab: string,
    cat: string,
    store: string | null,
    deal: string | null,
    pushHistory: boolean = false
  ) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (pTab !== 'mega') params.set('tab', pTab);
    if (sTab !== (DEFAULT_SUB_TABS[pTab] || 'all')) params.set('subtab', sTab);
    if (cat !== 'all') params.set('cat', cat);
    if (store) params.set('store', store);
    if (deal) params.set('deal', deal);

    const queryString = params.toString();
    const newRelativePathQuery = queryString ? `?${queryString}` : window.location.pathname;

    if (window.location.search !== (queryString ? `?${queryString}` : '')) {
      if (pushHistory) {
        window.history.pushState(null, '', newRelativePathQuery);
      } else {
        window.history.replaceState(null, '', newRelativePathQuery);
      }
    }
  }, []);

  // Sync on state change (unless popstate)
  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }
    updateUrl(query, primaryTab, subTab, selectedCategory, selectedStoreSlug, selectedDealId, false);
  }, [query, primaryTab, subTab, selectedCategory, selectedStoreSlug, selectedDealId, updateUrl]);

  // Handle browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
      const parsed = getInitialUrlParams();
      setQueryState(parsed.query);
      setPrimaryTabState(parsed.tab);
      setSubTabState(parsed.subtab);
      setSelectedCategoryState(parsed.cat);
      setSelectedStoreSlugState(parsed.store);
      setSelectedDealIdState(parsed.deal);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setPrimaryTab = (tab: PrimaryTab) => {
    setPrimaryTabState(tab);
    const defaultSub = DEFAULT_SUB_TABS[tab] || 'all';
    setSubTabState(defaultSub);
    setSelectedCategoryState('all');
    updateUrl(query, tab, defaultSub, 'all', selectedStoreSlug, selectedDealId, true);
  };

  const setSubTab = (tab: string) => {
    setSubTabState(tab);
    setSelectedCategoryState('all');
    updateUrl(query, primaryTab, tab, 'all', selectedStoreSlug, selectedDealId, true);
  };

  const setSelectedCategory = (cat: string) => {
    setSelectedCategoryState(cat);
    updateUrl(query, primaryTab, subTab, cat, selectedStoreSlug, selectedDealId, false);
  };

  const setQuery = (q: string) => {
    setQueryState(q);
    let targetTab = primaryTab;
    let targetSub = subTab;
    if (q.trim().length > 0 && primaryTab !== 'mega' && primaryTab !== 'favorites') {
      targetTab = 'mega';
      targetSub = 'all';
      setPrimaryTabState('mega');
      setSubTabState('all');
    }
    updateUrl(q, targetTab, targetSub, selectedCategory, selectedStoreSlug, selectedDealId, false);
  };

  const setSelectedStoreSlug = (slug: string | null) => {
    setSelectedStoreSlugState(slug);
    // Push history when opening a modal so Back button closes it naturally
    updateUrl(query, primaryTab, subTab, selectedCategory, slug, selectedDealId, slug !== null);
  };

  const setSelectedDealId = (id: string | null) => {
    setSelectedDealIdState(id);
    // Push history when opening a modal so Back button closes it naturally
    updateUrl(query, primaryTab, subTab, selectedCategory, selectedStoreSlug, id, id !== null);
  };

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        primaryTab,
        setPrimaryTab,
        subTab,
        setSubTab,
        activeTab: subTab,
        setActiveTab: setSubTab,
        viewMode,
        setViewMode,
        uiDensity,
        setUiDensity,
        toggleUiDensity,
        selectedCategory,
        setSelectedCategory,
        selectedCard,
        setSelectedCard,
        selectedCity,
        setSelectedCity,
        sortBy,
        setSortBy,
        selectedStoreSlug,
        setSelectedStoreSlug,
        selectedDealId,
        setSelectedDealId,
        smartSearch,
        setSmartSearch,
        fuzzySearch,
        setFuzzySearch,
        searchInDesc,
        setSearchInDesc
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
