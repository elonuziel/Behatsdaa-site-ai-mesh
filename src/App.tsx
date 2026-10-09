import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CategoryChips } from './components/CategoryChips';
import { StoreCard } from './components/StoreCard';
import { DealCard } from './components/DealCard';
import { TableView } from './components/TableView';
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
import { useMiniSearch, normalizeHebrew } from './hooks/useMiniSearch';
import {
  Store,
  Tag,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  Frown,
  Search,
  X
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    query,
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
    setSelectedDealId
  } = useSearch();

  const { activeClubs } = useClubs();
  const { isFavorite, showFavoritesOnly } = useFavorites();

  const {
    isLoading,
    allStores,
    allDeals,
    filteredStores,
    filteredDeals,
    storeCategories
  } = useMiniSearch(
    query,
    activeClubs,
    sortBy,
    selectedCategory,
    showFavoritesOnly,
    isFavorite
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
      list = list.filter(s => {
        const nameNorm = normalizeHebrew(s.name);
        const catNorm = s.category ? normalizeHebrew(s.category) : '';
        const cardsNorm = (s.cards || []).map(c => typeof c === 'string' ? c : c.card_name || '').join(' ');
        return nameNorm.includes(qNorm) || catNorm.includes(qNorm) || normalizeHebrew(cardsNorm).includes(qNorm);
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'discount') return (b.max_discount || 0) - (a.max_discount || 0);
      return (a.name || '').localeCompare(b.name || '', 'he');
    });
  }, [behStores, selectedCategory, sortBy, behStoreSearch, query]);

  const filteredBehDeals = useMemo(() => {
    let list = behDeals;
    if (selectedCategory !== 'all') {
      list = list.filter(d => (d.category || 'כללי') === selectedCategory);
    }
    const q = (behDealSearch || query).trim();
    if (q) {
      const qNorm = normalizeHebrew(q);
      list = list.filter(d => {
        const titleNorm = normalizeHebrew(d.title);
        const suppNorm = d.supplier ? normalizeHebrew(d.supplier) : '';
        const catNorm = d.category ? normalizeHebrew(d.category) : '';
        const tagsNorm = (d.tags || []).join(' ');
        return titleNorm.includes(qNorm) || suppNorm.includes(qNorm) || catNorm.includes(qNorm) || normalizeHebrew(tagsNorm).includes(qNorm);
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'discount') return (b.discount_percent || 0) - (a.discount_percent || 0);
      return (a.title || '').localeCompare(b.title || '', 'he');
    });
  }, [behDeals, selectedCategory, sortBy, behDealSearch, query]);

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

                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">טוען קטלוג רשתות, תמונות והטבות...</p>
                  </div>
                ) : filteredStores.length === 0 && filteredDeals.length === 0 ? (
                  <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Frown className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                      לא נמצאו תוצאות תואמות
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      נסה להסיר מילות חיפוש, לבחור קטגוריה אחרת, או לוודא שמועדוני הצרכנות מסומנים.
                    </p>
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

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                  >
                    <option value="discount">הנחה מרבית % (גבוה לנמוך)</option>
                    <option value="name">שם א-ת</option>
                  </select>
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
