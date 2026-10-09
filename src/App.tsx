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

// Favorites View
import { FavoritesView } from './components/favorites/FavoritesView';

import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useFavorites } from './context/FavoritesContext';
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
  SlidersHorizontal
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    query,
    setQuery,
    primaryTab,
    subTab,
    viewMode,
    setViewMode,
    selectedCategory,
    setSelectedCategory,
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

  const { activeClubs } = useClubs();
  const { isFavorite, showFavoritesOnly } = useFavorites();

  const {
    isLoading,
    allStores,
    allDeals,
    filteredStores,
    filteredDeals,
    storeCategories,
    didYouMean
  } = useMiniSearch(
    query,
    activeClubs,
    sortBy,
    selectedCategory,
    showFavoritesOnly,
    isFavorite,
    { smartSearch, fuzzySearch, searchInDesc }
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
  }, [behStores, selectedCategory, sortBy, behStoreSearch, query, smartSearch, searchInDesc]);

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
                {/* Clubs Selector Filter Pills */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <MyClubsPills />

                  <div className="text-xs text-slate-500 font-medium">
                    חיפוש מקביל ב-3 מועדוני צרכנות מובילים
                  </div>
                </div>

                {/* Category Filter Carousel */}
                <CategoryChips
                  categories={storeCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={cat => setSelectedCategory(cat)}
                  totalCount={filteredStores.length + filteredDeals.length}
                />

                {/* Filter & Sorting Controls Header */}
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

                {/* Smart Search Engine Options Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>הגדרות מנוע חיפוש:</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Smart & Synonym Search Toggle */}
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

                    {/* Fuzzy Typo Tolerance Toggle */}
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

                    {/* Search in Description Toggle */}
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
                  </div>
                </div>

                {/* Popular Discovery Intent Chips */}
                {!query && (
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
                  <div className="space-y-10">
                    {/* Stores Section */}
                    {filteredStores.length > 0 && (
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
                    {filteredDeals.length > 0 && (
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
    </div>
  );
};
