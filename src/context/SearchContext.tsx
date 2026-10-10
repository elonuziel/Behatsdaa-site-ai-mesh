import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQueryState] = useState('');
  const [primaryTab, setPrimaryTabState] = useState<PrimaryTab>('mega');
  const [subTab, setSubTabState] = useState<string>('all');
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('discount');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

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

  // Sync initial hash if present
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        const params = new URLSearchParams(hash);
        const p = params.get('tab') as PrimaryTab;
        const s = params.get('sub');
        if (p && ['mega', 'behatsdaa', 'uniq', 'mastercard', 'favorites'].includes(p)) {
          setPrimaryTabState(p);
          if (s) {
            setSubTabState(s);
          } else {
            setSubTabState(DEFAULT_SUB_TABS[p] || 'all');
          }
        }
      }
    } catch {
      // Ignore hash parse errors
    }
  }, []);

  // Update hash when tabs change
  useEffect(() => {
    try {
      const newHash = `tab=${primaryTab}&sub=${subTab}`;
      if (window.location.hash !== `#${newHash}`) {
        window.history.replaceState(null, '', `#${newHash}`);
      }
    } catch {
      // Ignore history state errors
    }
  }, [primaryTab, subTab]);

  const setPrimaryTab = (tab: PrimaryTab) => {
    setPrimaryTabState(tab);
    setSubTabState(DEFAULT_SUB_TABS[tab] || 'all');
    setSelectedCategory('all');
  };

  const setSubTab = (tab: string) => {
    setSubTabState(tab);
    setSelectedCategory('all');
  };

  const setQuery = (q: string) => {
    setQueryState(q);
    // Typing in search focuses mega search hub
    if (q.trim().length > 0 && primaryTab !== 'mega' && primaryTab !== 'favorites') {
      setPrimaryTabState('mega');
      setSubTabState('all');
    }
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
