import React, { createContext, useContext, useState } from 'react';

export type MainTab = 'all' | 'stores' | 'deals' | 'map' | 'wallets';
export type SortOption = 'discount' | 'name' | 'relevant';

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedStoreSlug: string | null;
  setSelectedStoreSlug: (slug: string | null) => void;
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('discount');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        activeTab,
        setActiveTab,
        selectedCategory,
        setSelectedCategory,
        sortBy,
        setSortBy,
        selectedStoreSlug,
        setSelectedStoreSlug,
        selectedDealId,
        setSelectedDealId
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
