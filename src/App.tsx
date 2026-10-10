import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CategoryChips } from './components/CategoryChips';
import { StoreCard } from './components/StoreCard';
import { DealCard } from './components/DealCard';
import { TableView } from './components/TableView';
import { DealsTableView } from './components/DealsTableView';
import { ViewModeToggle } from './components/ViewModeToggle';
import { BillingView } from './components/BillingView';
import { MapView } from './components/MapView';
import { WalletsView } from './components/WalletsView';
import { PaymentAdvisorModal } from './components/PaymentAdvisorModal';
import { DealDetailModal } from './components/DealDetailModal';
import { MyClubsPills } from './components/MyClubsPills';

// UNIQ Sub-Tab Views
import { UniqTabAView } from './components/uniq/UniqTabAView';
import { UniqTabBView } from './components/uniq/UniqTabBView';
import { UniqTabCView } from './components/uniq/UniqTabCView';
import { UniqTabDView } from './components/uniq/UniqTabDView';

// Mastercard Day Sub-Tab Views
import { MastercardDealsView } from './components/mastercard/MastercardDealsView';
import { MastercardActiveTodayView } from './components/mastercard/MastercardActiveTodayView';
import { MastercardTermsView } from './components/mastercard/MastercardTermsView';

// Mega Search Hub Sub-Tab Views
import { MegaComparisonView } from './components/mega/MegaComparisonView';
import { MegaTopDealsView } from './components/mega/MegaTopDealsView';
import { MegaAiSearchView } from './components/mega/MegaAiSearchView';

// Favorites View
import { FavoritesView } from './components/favorites/FavoritesView';

// AI Chat Assistant
import { AiChatModal } from './components/chat/AiChatModal';

import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useFavorites } from './context/FavoritesContext';
import { useChat } from './context/ChatContext';
import { useMiniSearch, normalizeHebrew, expandSmartTerms } from './hooks/useMiniSearch';
import {
  Store,
  Tag,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  Frown,
  Search,
  X,
  SlidersHorizontal,
  Bot,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    query,
    setQuery,
    primaryTab,
    subTab,
    viewMode,
    setViewMode,
    uiDensity,
    toggleUiDensity,
    selectedCategory,
    setSelectedCategory,
    selectedCard,
    setSelectedCard,
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
  } = useSearch();

  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'stores' | 'deals'>('all');
  const [cleanModeShowShopsManually, setCleanModeShowShopsManually] = useState(false);

  const { activeClubs } = useClubs();
  const { isFavorite, showFavoritesOnly } = useFavorites();
  const { openChat } = useChat();

  const {
    isLoading,
    allStores,
    allDeals,
    filteredStores,
    filteredDeals,
    availableCards,
    storeCategories,
    didYouMean
  } = useMiniSearch(
    query,
    activeClubs,
    sortBy,
    selectedCategory,
    showFavoritesOnly,
    isFavorite,
    { smartSearch, fuzzySearch, searchInDesc, selectedCard }
  );

  const [visibleStoreLimit, setVisibleStoreLimit] = useState(36);
  const [visibleDealLimit, setVisibleDealLimit] = useState(36);
  const [behStoreSearch, setBehStoreSearch] = useState('');
  const [behDealSearch, setBehDealSearch] = useState('');

  // Behatsdaa filtered lists
  const behStores = useMemo(() => {
    return allStores.filter(s => (s.clubs || []).includes('behatsdaa'));
  }, [allStores]);

  const behDeals = useMemo(() => {
    return allDeals.filter(d => (d.club || 'behatsdaa') === 'behatsdaa');
  }, [allDeals]);

  const behStoreCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    behStores.forEach(s => {
      const cat = s.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [behStores]);

  const behDealCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    behDeals.forEach(d => {
      const cat = d.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [behDeals]);

  const filteredBehStores = useMemo(() => {
    let list = behStores;
    if (selectedCard && selectedCard !== 'all') {
      list = list.filter(s =>
        s.cards && s.cards.some(c =>
          typeof c === 'string'
            ? c === selectedCard
            : c.card_name === selectedCard || c.card_id === selectedCard || (c.card_name && c.card_name.includes(selectedCard))
        )
      );
    }
    if (selectedCategory !== 'all') {
      list = list.filter(s => (s.category || 'כללי') === selectedCategory);
    }
    const q = (behStoreSearch || query).trim();
    if (q) {
      const qNorm = normalizeHebrew(q);
      const expandedTerms = smartSearch ? expandSmartTerms(q) : [];
      const searchTerms = [qNorm, ...expandedTerms.map(t => normalizeHebrew(t))].filter(Boolean);

      list = list.filter(s => {
        const nameNorm = normalizeHebrew(s.name);
        const catNorm = s.category ? normalizeHebrew(s.category) : '';
        const cardsNorm = (s.cards || []).map(c => typeof c === 'string' ? c : c.card_name || '').join(' ');
        const cardsNormStr = normalizeHebrew(cardsNorm);
        const descNorm = searchInDesc ? normalizeHebrew(s.conditions || '') : '';

        return searchTerms.some(term =>
          nameNorm.includes(term) ||
          catNorm.includes(term) ||
          cardsNormStr.includes(term) ||
          (searchInDesc && descNorm.includes(term))
        );
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'discount') return (b.max_discount || 0) - (a.max_discount || 0);
      return (a.name || '').localeCompare(b.name || '', 'he');
    });
  }, [behStores, selectedCard, selectedCategory, sortBy, behStoreSearch, query, smartSearch, searchInDesc]);

  const filteredBehDeals = useMemo(() => {
    let list = behDeals;
    if (selectedCategory !== 'all') {
      list = list.filter(d => (d.category || 'כללי') === selectedCategory);
    }
    const q = (behDealSearch || query).trim();
    if (q) {
      const qNorm = normalizeHebrew(q);
      const expandedTerms = smartSearch ? expandSmartTerms(q) : [];
      const searchTerms = [qNorm, ...expandedTerms.map(t => normalizeHebrew(t))].filter(Boolean);

      list = list.filter(d => {
        const titleNorm = normalizeHebrew(d.title);
        const suppNorm = d.supplier ? normalizeHebrew(d.supplier) : '';
        const catNorm = d.category ? normalizeHebrew(d.category) : '';
        const tagsNorm = (d.tags || []).join(' ');
        const tagsNormStr = normalizeHebrew(tagsNorm);
        const descNorm = searchInDesc ? normalizeHebrew(`${d.description || ''} ${d.terms_of_use || ''}`) : '';

        return searchTerms.some(term =>
          titleNorm.includes(term) ||
          suppNorm.includes(term) ||
          catNorm.includes(term) ||
          tagsNormStr.includes(term) ||
          (searchInDesc && descNorm.includes(term))
        );
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'discount') return (b.discount_percent || 0) - (a.discount_percent || 0);
      return (a.title || '').localeCompare(b.title || '', 'he');
    });
  }, [behDeals, selectedCategory, sortBy, behDealSearch, query, smartSearch, searchInDesc]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full space-y-5">
        {/* ========================================================================= */}
        {/* 1. MEGA SEARCH HUB (🌐 מגה חיפוש)                                       */}
        {/* ========================================================================= */}
        {primaryTab === 'mega' && (
          <>
            {subTab === 'ai-search' && (
              <MegaAiSearchView
                onSelectStore={slug => setSelectedStoreSlug(slug)}
                onSelectDeal={id => setSelectedDealId(id)}
              />
            )}

            {subTab === 'comparison' && (
              <MegaComparisonView
                stores={allStores}
                onSelectStore={slug => setSelectedStoreSlug(slug)}
              />
            )}

            {subTab === 'map' && <MapView />}

            {subTab === 'top-deals' && (
              <MegaTopDealsView
                deals={allDeals}
                onSelectDeal={id => setSelectedDealId(id)}
                onSelectStore={slug => setSelectedStoreSlug(slug)}
              />
            )}

            {subTab === 'all' && (
              <div className="space-y-4">
                {uiDensity === 'clean' ? (
                  <div className="space-y-3">
                    {/* Ultra-Clean Controls: Choosing Between Content + Filters + Sort */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs">
                      {/* 1. Choosing Between: All / Stores / Deals */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                        <button
                          type="button"
                          onClick={() => setContentTypeFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            contentTypeFilter === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          הכל ({(filteredStores.length + filteredDeals.length).toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => setContentTypeFilter('stores')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            contentTypeFilter === 'stores'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>רשתות ({filteredStores.length.toLocaleString()})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContentTypeFilter('deals')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            contentTypeFilter === 'deals'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          <span>מבצעים ({filteredDeals.length.toLocaleString()})</span>
                        </button>
                      </div>

                      {/* 2. Filters & View Controls */}
                      <div className="flex items-center gap-2 flex-wrap">

                      {/* Card Filter Dropdown */}
                      <div className="relative">
                        <select
                          value={selectedCard}
                          onChange={e => setSelectedCard(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[190px] truncate"
                        >
                          <option value="all">💳 כל כרטיסי בהצדעה</option>
                          {availableCards.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                        {/* Category Filter Dropdown */}
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[170px] truncate"
                          >
                            <option value="all">כל הקטגוריות</option>
                            {storeCategories.map(cat => (
                              <option key={cat.name} value={cat.name}>
                                {cat.name} ({cat.count})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sort selector */}
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as any)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                        >
                          <option value="discount">הנחה מרבית %</option>
                          <option value="name">שם א-ת</option>
                          <option value="relevant">התאמה לחיפוש</option>
                        </select>

                        {/* View Mode: Grid / Table */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => setViewMode('grid')}
                            title="תצוגת כרטיסים"
                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                              viewMode === 'grid'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewMode('table')}
                            title="תצוגת טבלה"
                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                              viewMode === 'table'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <TableIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Extra Filters Drawer Button (Clubs + Search Options) */}
                        <button
                          type="button"
                          onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isAdvancedFiltersOpen
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="סינון מועדונים והגדרות חיפוש"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">מסננים נוספים</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Detailed Mode Quick Switch */}
                        <button
                          type="button"
                          onClick={toggleUiDensity}
                          className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline px-1 py-1 font-medium cursor-pointer"
                          title="מעבר לתצוגה מפורטת מלאה עם כל הסרגלים"
                        >
                          הצג הכל
                        </button>
                      </div>
                    </div>

                    {/* Expandable Advanced Filters Drawer in Clean Mode */}
                    {isAdvancedFiltersOpen && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3.5 animate-in fade-in-50 duration-150">
                        {/* Clubs Filter */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <MyClubsPills />
                          <div className="text-xs text-slate-500 font-medium">
                            חיפוש מקביל ב-3 מועדוני צרכנות מובילים
                          </div>
                        </div>

                        {/* Search Engine Options */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>הגדרות מנוע חיפוש:</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSmartSearch(!smartSearch)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                smartSearch
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span>🧠 חיפוש חכם</span>
                              <span className={`w-2 h-2 rounded-full ${smartSearch ? 'bg-white' : 'bg-slate-400'}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setFuzzySearch(!fuzzySearch)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                fuzzySearch
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span>🎯 חיפוש גמיש (Fuzzy)</span>
                              <span className={`w-2 h-2 rounded-full ${fuzzySearch ? 'bg-white' : 'bg-slate-400'}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSearchInDesc(!searchInDesc)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                searchInDesc
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span>📝 חיפוש בתיאור ובתקנון</span>
                              <span className={`w-2 h-2 rounded-full ${searchInDesc ? 'bg-white' : 'bg-slate-400'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Detailed Mode ("Show Everything"): Mode Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="font-bold">מצב תצוגה מפורטת (הכל מוצג):</span>
                        <span className="text-slate-600 dark:text-slate-300 hidden sm:inline">
                          כל סרגלי הסינון, בורר המועדונים, קרוסלת הקטגוריות והגדרות החיפוש פתוחים.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleUiDensity}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>עבור לתצוגה נקייה</span>
                      </button>
                    </div>

                    {/* Box 1: Clubs Selector Filter Pills */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                      <MyClubsPills />

                      <div className="text-xs text-slate-500 font-medium">
                        חיפוש מקביל ב-3 מועדוני צרכנות מובילים
                      </div>
                    </div>

                    {/* Box 2: Full Category Filter Carousel */}
                    <CategoryChips
                      categories={storeCategories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={cat => setSelectedCategory(cat)}
                      totalCount={filteredStores.length + filteredDeals.length}
                      compact={false}
                    />

                    {/* Box 3: Filter & Sorting Controls Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span>
                          נמצאו{' '}
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {filteredStores.length.toLocaleString()}
                          </strong>{' '}
                          רשתות ו-
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {filteredDeals.length.toLocaleString()}
                          </strong>{' '}
                          מבצעים
                        </span>
                      </div>

                      {/* View Mode & Sorting selectors */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => setViewMode('grid')}
                            title="תצוגת כרטיסים"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              viewMode === 'grid'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">כרטיסים</span>
                          </button>
                          <button
                            onClick={() => setViewMode('table')}
                            title="תצוגת טבלה"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              viewMode === 'table'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">טבלה</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400 hidden sm:flex items-center gap-1">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>מיון:</span>
                          </span>
                          <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                          >
                            <option value="discount">הנחה מרבית % (גבוה לנמוך)</option>
                            <option value="name">שם א-ת</option>
                            <option value="relevant">התאמה לחיפוש</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Box 4: Smart Search Engine Options Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>הגדרות מנוע חיפוש:</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSmartSearch(!smartSearch)}
                          title="חיבור אוטומטי של מילים נרדפות ותעתיקים (למשל: סושי ⟷ sushi, נעליים ⟷ אופנה, דלק ⟷ בנזין/סונול, סלולר ⟷ טלפונים)"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                            smartSearch
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>🧠 חיפוש חכם (מילים נרדפות ותעתיק)</span>
                          <span className={`w-2 h-2 rounded-full ${smartSearch ? 'bg-white' : 'bg-slate-400'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setFuzzySearch(!fuzzySearch)}
                          title="עמידות לשגיאות הקלדה ומילים חלקיות"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                            fuzzySearch
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>🎯 חיפוש גמיש (Fuzzy)</span>
                          <span className={`w-2 h-2 rounded-full ${fuzzySearch ? 'bg-white' : 'bg-slate-400'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSearchInDesc(!searchInDesc)}
                          title="חיפוש גם בתוך תיאורי המבצעים, תנאי המימוש והאותיות הקטנות"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                            searchInDesc
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>📝 חיפוש בתיאור ובתקנון</span>
                          <span className={`w-2 h-2 rounded-full ${searchInDesc ? 'bg-white' : 'bg-slate-400'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openChat(query)}
                          title="חיפוש טבעי בעזרת Gemini AI - שאל כל שאלה וקבל המלצות מדויקות"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/60 dark:to-emerald-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 shadow-2xs"
                        >
                          <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>🤖 שאל את סייר ה-AI</span>
                          <span className="text-[10px] px-1 py-0.2 rounded-full font-bold bg-indigo-600 text-white">Gemini</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Popular Discovery Intent Chips (shown only in Detailed Mode) */}
                {uiDensity === 'detailed' && !query && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      חיפושים נפוצים:
                    </span>
                    {[
                      { label: '🍕 פיצה ומסעדות', val: 'פיצה' },
                      { label: '⛽ דלק ותחבורה', val: 'דלק' },
                      { label: '🛒 סופרמרקט ומזון', val: 'סופר' },
                      { label: '👟 אופנה והנעלה', val: 'אופנה' },
                      { label: '✈️ טיסות ומלונות', val: 'מלון' },
                      { label: '📱 סלולר ו-eSIM', val: 'esim' },
                      { label: '🎬 קולנוע ומופעים', val: 'קולנוע' },
                      { label: '💻 KSP ומחשבים', val: 'ksp' },
                      { label: '🎁 גיפט קארד ושוברים', val: 'שובר' }
                    ].map(chip => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => setQuery(chip.val)}
                        className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition whitespace-nowrap text-xs font-medium cursor-pointer shadow-2xs"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">טוען קטלוג רשתות, תמונות והטבות...</p>
                  </div>
                ) : (uiDensity === 'clean' && !query.trim() && selectedCategory === 'all' && !cleanModeShowShopsManually) ? (
                  /* Clean Mode: Hide all shops by default until user searches, selects category, or requests them */
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-2xs space-y-7 animate-in fade-in-50 duration-150">
                    {/* Clean Mode Header & Mode Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>מצב נקי וממוקד</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white pt-1">
                          במה תרצה לחסוך היום?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                          החנויות מוסתרות כברירת מחדל לשמירה על ממשק נקי ומקצועי. בחר קטגוריה, חפש מותג, או פתח את כל הרשתות.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCleanModeShowShopsManually(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <Store className="w-4 h-4" />
                          <span>הצג את כל {filteredStores.length.toLocaleString()} הרשתות</span>
                        </button>

                        <button
                          type="button"
                          onClick={toggleUiDensity}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="מעבר לתצוגה מפורטת מלאה המציגה את כל החנויות והסרגלים באופן קבוע"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="hidden sm:inline">מצב מפורט</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Cards with Colors & Icons */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>בחר קטגוריה לפתיחת הרשתות וההנחות:</span>
                        <span className="text-slate-400 font-normal">8 קטגוריות ראשיות</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { name: 'מסעדות ואוכל', icon: '🍕', color: 'from-amber-500/15 to-orange-500/10 border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300', count: 'פיצה, בורגר, משלוחים' },
                          { name: 'אופנה והנעלה', icon: '👟', color: 'from-blue-500/15 to-indigo-500/10 border-blue-200/80 dark:border-blue-900/60 text-blue-800 dark:text-blue-300', count: 'בגדים, ספורט, מותגים' },
                          { name: 'סופרמרקט ומזון', icon: '🛒', color: 'from-emerald-500/15 to-teal-500/10 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300', count: 'שופרסל, קרפור, יוחננוף' },
                          { name: 'מחשבים וסלולר', icon: '💻', color: 'from-purple-500/15 to-violet-500/10 border-purple-200/80 dark:border-purple-900/60 text-purple-800 dark:text-purple-300', count: 'KSP, אייבורי, סלולר' },
                          { name: 'תיירות ונופש', icon: '✈️', color: 'from-sky-500/15 to-cyan-500/10 border-sky-200/80 dark:border-sky-900/60 text-sky-800 dark:text-sky-300', count: 'מלונות, ספא, טיסות' },
                          { name: 'קולנוע ותרבות', icon: '🎬', color: 'from-rose-500/15 to-pink-500/10 border-rose-200/80 dark:border-rose-900/60 text-rose-800 dark:text-rose-300', count: 'סינמה סיטי, מופעים' },
                          { name: 'דלק ותחבורה', icon: '⛽', color: 'from-red-500/15 to-orange-500/10 border-red-200/80 dark:border-red-900/60 text-red-800 dark:text-red-300', count: 'סונול, פז, דלק, שטיפה' },
                          { name: 'גיפט קארד ושוברים', icon: '🎁', color: 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/80 dark:border-violet-900/60 text-violet-800 dark:text-violet-300', count: 'ארנקים נטענים 20%' },
                        ].map(cat => (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`p-3.5 rounded-2xl bg-gradient-to-br ${cat.color} border hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer text-right flex flex-col justify-between min-h-[96px] shadow-2xs group`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{cat.icon}</span>
                              <ChevronLeft className="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:-translate-x-0.5 transition" />
                            </div>
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {cat.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {cat.count}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Search Chips */}
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        חיפושים נפוצים בלחיצה:
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: '🍕 פיצה ומסעדות', val: 'פיצה' },
                          { label: '⛽ דלק ותחבורה', val: 'דלק' },
                          { label: '🛒 שופרסל וקרפור', val: 'סופר' },
                          { label: '👟 מגה ספורט', val: 'מגה ספורט' },
                          { label: '🛍️ Terminal X', val: 'terminal x' },
                          { label: '💻 KSP ומחשבים', val: 'ksp' },
                          { label: '🎬 סינמה סיטי (33 ₪)', val: 'סינמה סיטי' },
                          { label: '☕ קפה ומאפה', val: 'קפה' },
                          { label: '📱 eSIM לחו״ל', val: 'esim' },
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setQuery(item.val)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Assistant Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/40 border border-indigo-200/70 dark:border-indigo-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              סייר AI חכם מבוסס Gemini
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-600 text-white">
                              10,000+ עסקים
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            חיפוש חופשי בשפה טבעית בכל 10,000+ בתי העסק, הסניפים, הרשתות וההנחות במעמד החיוב.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openChat()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-center whitespace-nowrap"
                      >
                        שאל את סייר ה-AI
                      </button>
                    </div>
                  </div>
                ) : filteredStores.length === 0 && filteredDeals.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                        {query ? `לא נמצאו תוצאות עבור "${query}"` : 'לא נמצאו תוצאות'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {query
                          ? 'נסה להסיר מילות חיפוש, לבחור קטגוריה אחרת, או להפעיל "חיפוש בתיאור ובתקנון".'
                          : 'בחר מועדוני צרכנות פעילים או שנה את סינון הקטגוריה.'}
                      </p>
                    </div>

                    {/* Did You Mean Suggestion Buttons */}
                    {didYouMean && didYouMean.length > 0 && (
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 max-w-md mx-auto space-y-2">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          האם התכוונת ל:
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {didYouMean.map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setQuery(suggestion)}
                              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                            >
                              🔍 {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Quick Actions */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      {!searchInDesc && (
                        <button
                          type="button"
                          onClick={() => setSearchInDesc(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
                        >
                          📝 הפעל חיפוש בתיאור ובתקנון
                        </button>
                      )}
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                        >
                          איפוס חיפוש
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Clean Mode Active Results Bar & Hide Button */}
                    {uiDensity === 'clean' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
                        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>
                            מציג{' '}
                            <strong className="text-slate-900 dark:text-white font-bold">
                              {filteredStores.length.toLocaleString()}
                            </strong>{' '}
                            רשתות ו-
                            <strong className="text-slate-900 dark:text-white font-bold">
                              {filteredDeals.length.toLocaleString()}
                            </strong>{' '}
                            מבצעים
                            {selectedCategory !== 'all' ? ` • קטגוריה: ${selectedCategory}` : ''}
                            {query ? ` • חיפוש: "${query}"` : ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCleanModeShowShopsManually(false);
                            setQuery('');
                            setSelectedCategory('all');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 text-xs font-semibold transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>הסתר חנויות וחזור למצב נקי</span>
                        </button>
                      </div>
                    )}

                    {/* Stores Section */}
                    {filteredStores.length > 0 && (contentTypeFilter === 'all' || contentTypeFilter === 'stores') && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                            <Store className="w-4 h-4" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            רשתות וחנויות ({filteredStores.length.toLocaleString()})
                          </h2>
                        </div>

                        {viewMode === 'table' ? (
                          <TableView
                            stores={filteredStores.slice(0, visibleStoreLimit)}
                            onSelect={slug => setSelectedStoreSlug(slug)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredStores.slice(0, visibleStoreLimit).map(store => (
                              <StoreCard
                                key={store.id}
                                store={store}
                                onSelect={slug => setSelectedStoreSlug(slug)}
                                onSelectDeal={dealId => setSelectedDealId(dealId)}
                              />
                            ))}
                          </div>
                        )}

                        {filteredStores.length > visibleStoreLimit && (
                          <div className="mt-6 text-center">
                            <button
                              onClick={() => setVisibleStoreLimit(prev => prev + 36)}
                              className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-emerald-500 hover:text-emerald-600 transition shadow-xs cursor-pointer"
                            >
                              הצג עוד רשתות (+36)
                            </button>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Deals Section */}
                    {filteredDeals.length > 0 && (contentTypeFilter === 'all' || contentTypeFilter === 'deals') && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                            <Tag className="w-4 h-4" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            מבצעים, שוברים וקופונים ({filteredDeals.length.toLocaleString()})
                          </h2>
                        </div>

                        {viewMode === 'table' ? (
                          <DealsTableView
                            deals={filteredDeals.slice(0, visibleDealLimit)}
                            onSelectDeal={id => setSelectedDealId(id)}
                            onSelectStore={slug => setSelectedStoreSlug(slug)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredDeals.slice(0, visibleDealLimit).map(deal => (
                              <DealCard
                                key={deal.id}
                                deal={deal}
                                onSelect={id => setSelectedDealId(id)}
                                onSelectStore={slug => setSelectedStoreSlug(slug)}
                              />
                            ))}
                          </div>
                        )}

                        {filteredDeals.length > visibleDealLimit && (
                          <div className="mt-6 text-center">
                            <button
                              onClick={() => setVisibleDealLimit(prev => prev + 36)}
                              className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-amber-500 hover:text-amber-600 transition shadow-xs cursor-pointer"
                            >
                              הצג עוד מבצעים (+36)
                            </button>
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* 2. BEHATSDAA DEDICATED HUB (🎖️ בהצדעה)                                  */}
        {/* ========================================================================= */}
        {primaryTab === 'behatsdaa' && (
          <>
            {subTab === 'billing' && <BillingView />}

            {subTab === 'map' && <MapView />}

            {subTab === 'wallets' && <WalletsView />}

            {subTab === 'stores' && (
              <div className="space-y-4">
                <CategoryChips
                  categories={behStoreCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={cat => setSelectedCategory(cat)}
                  totalCount={behStores.length}
                  compact={uiDensity === 'clean'}
                />

                {/* Filter & View Mode Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
                  {/* Search input for Behatsdaa stores */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <input
                      type="text"
                      value={behStoreSearch}
                      onChange={e => setBehStoreSearch(e.target.value)}
                      placeholder="חיפוש רשת או כרטיס נטען בהצדעה..."
                      className="w-full pl-8 pr-9 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    {behStoreSearch && (
                      <button
                        onClick={() => setBehStoreSearch('')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-2.5 top-2 p-0.5"
                        aria-label="נקה חיפוש"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>


                  {/* Behatsdaa Card Filter */}
                  <select
                    value={selectedCard}
                    onChange={e => setSelectedCard(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[200px] truncate"
                  >
                    <option value="all">💳 כל ארנקי בהצדעה</option>
                    {availableCards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </select>


                  <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Store className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      רשתות וכרטיסים:{' '}
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {filteredBehStores.length.toLocaleString()}
                      </strong>{' '}
                      רשתות
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">כרטיסים</span>
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          viewMode === 'table'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">טבלה</span>
                      </button>
                    </div>

                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                    >
                      <option value="discount">הנחה מרבית % (גבוה לנמוך)</option>
                      <option value="name">שם א-ת</option>
                    </select>
                  </div>
                </div>

                {filteredBehStores.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Frown className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                      לא נמצאו רשתות תואמות
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      נסה להסיר מילות חיפוש או לבחור קטגוריה אחרת.
                    </p>
                    <button
                      onClick={() => { setBehStoreSearch(''); setSelectedCategory('all'); }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-100 transition"
                    >
                      איפוס סינונים
                    </button>
                  </div>
                ) : viewMode === 'table' ? (
                  <TableView
                    stores={filteredBehStores.slice(0, visibleStoreLimit)}
                    onSelect={slug => setSelectedStoreSlug(slug)}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredBehStores.slice(0, visibleStoreLimit).map(store => (
                      <StoreCard
                        key={store.id}
                        store={store}
                        onSelect={slug => setSelectedStoreSlug(slug)}
                        onSelectDeal={dealId => setSelectedDealId(dealId)}
                      />
                    ))}
                  </div>
                )}

                {filteredBehStores.length > visibleStoreLimit && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleStoreLimit(prev => prev + 36)}
                      className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-emerald-500 hover:text-emerald-600 transition shadow-xs cursor-pointer"
                    >
                      הצג עוד רשתות (+36)
                    </button>
                  </div>
                )}
              </div>
            )}

            {subTab === 'deals' && (
              <div className="space-y-4">
                <CategoryChips
                  categories={behDealCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={cat => setSelectedCategory(cat)}
                  totalCount={behDeals.length}
                  compact={uiDensity === 'clean'}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
                  {/* Search input for Behatsdaa deals */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <input
                      type="text"
                      value={behDealSearch}
                      onChange={e => setBehDealSearch(e.target.value)}
                      placeholder="חיפוש שובר או ספק בהצדעה..."
                      className="w-full pl-8 pr-9 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    {behDealSearch && (
                      <button
                        onClick={() => setBehDealSearch('')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-2.5 top-2 p-0.5"
                        aria-label="נקה חיפוש"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      שוברים ומבצעים בהצדעה:{' '}
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {filteredBehDeals.length.toLocaleString()}
                      </strong>{' '}
                      מבצעים
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ViewModeToggle />

                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                    >
                      <option value="discount">הנחה מרבית % (גבוה לנמוך)</option>
                      <option value="name">שם א-ת</option>
                    </select>
                  </div>
                </div>

                {filteredBehDeals.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Frown className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                      לא נמצאו שוברים תואמים
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      נסה להסיר מילות חיפוש או לבחור קטגוריה אחרת.
                    </p>
                    <button
                      onClick={() => { setBehDealSearch(''); setSelectedCategory('all'); }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-100 transition"
                    >
                      איפוס סינונים
                    </button>
                  </div>
                ) : viewMode === 'table' ? (
                  <DealsTableView
                    deals={filteredBehDeals.slice(0, visibleDealLimit)}
                    onSelectDeal={id => setSelectedDealId(id)}
                    onSelectStore={slug => setSelectedStoreSlug(slug)}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredBehDeals.slice(0, visibleDealLimit).map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onSelect={id => setSelectedDealId(id)}
                        onSelectStore={slug => setSelectedStoreSlug(slug)}
                      />
                    ))}
                  </div>
                )}

                {filteredBehDeals.length > visibleDealLimit && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleDealLimit(prev => prev + 36)}
                      className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-emerald-500 hover:text-emerald-600 transition shadow-xs cursor-pointer"
                    >
                      הצג עוד מבצעים (+36)
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* 3. UNIQ DEDICATED HUB (🎓 UNIQ)                                         */}
        {/* ========================================================================= */}
        {primaryTab === 'uniq' && (
          <>
            {subTab === 'tab-a' && <UniqTabAView />}
            {subTab === 'tab-b' && <UniqTabBView />}
            {subTab === 'tab-c' && <UniqTabCView />}
            {subTab === 'tab-d' && <UniqTabDView />}
          </>
        )}

        {/* ========================================================================= */}
        {/* 4. MASTERCARD DAY DEDICATED HUB (💳 Mastercard Day)                     */}
        {/* ========================================================================= */}
        {primaryTab === 'mastercard' && (
          <>
            {subTab === 'deals' && <MastercardDealsView />}
            {subTab === 'active-today' && <MastercardActiveTodayView />}
            {subTab === 'terms' && <MastercardTermsView />}
          </>
        )}

        {/* ========================================================================= */}
        {/* 5. FAVORITES DEDICATED HUB (⭐ מועדפים)                                 */}
        {/* ========================================================================= */}
        {primaryTab === 'favorites' && (
          <FavoritesView
            stores={allStores}
            deals={allDeals}
            onSelectStore={slug => setSelectedStoreSlug(slug)}
            onSelectDeal={id => setSelectedDealId(id)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ההטבות שלי — פורטל מאוחד למועדוני בהצדעה, UNIQ ו-Mastercard Day</p>
          <p className="text-slate-400">הנתונים מתעדכנים ישירות ממערכות המועדונים והמבצעים</p>
        </div>
      </footer>

      {/* Payment Advisor Modal */}
      {selectedStoreSlug && (
        <PaymentAdvisorModal
          slug={selectedStoreSlug}
          onClose={() => setSelectedStoreSlug(null)}
          onSelectCard={cardName => {
            setSelectedCard(cardName);
            setSelectedStoreSlug(null);
          }}
          onSelectDeal={dealId => {
            setSelectedStoreSlug(null);
            setSelectedDealId(dealId);
          }}
        />
      )}

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailModal
          id={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onSelectStore={slug => {
            setSelectedDealId(null);
            setSelectedStoreSlug(slug);
          }}
        />
      )}

      {/* Floating AI Assistant Trigger Button */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          onClick={() => openChat(query)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          aria-label="פתח סייר הטבות AI"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-wide">סייר AI</span>
          <span className="hidden sm:inline text-[11px] font-normal text-emerald-100">
            · חיפוש חופשי
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
        </button>
      </div>

      {/* AI Chat Modal Dialog */}
      <AiChatModal
        onSelectStore={slug => setSelectedStoreSlug(slug)}
        onSelectDeal={id => setSelectedDealId(id)}
      />
    </div>
  );
};
