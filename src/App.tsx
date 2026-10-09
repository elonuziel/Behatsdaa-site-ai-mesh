import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { MastercardCountdown } from './components/MastercardCountdown';
import { CategoryChips } from './components/CategoryChips';
import { StoreCard } from './components/StoreCard';
import { DealCard } from './components/DealCard';
import { TableView } from './components/TableView';
import { BillingView } from './components/BillingView';
import { MapView } from './components/MapView';
import { WalletsView } from './components/WalletsView';
import { PaymentAdvisorModal } from './components/PaymentAdvisorModal';
import { DealDetailModal } from './components/DealDetailModal';
import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useFavorites } from './context/FavoritesContext';
import { useMiniSearch } from './hooks/useMiniSearch';
import {
  Store,
  Tag,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  Frown
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    query,
    activeTab,
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
  const { isFavorite, showFavoritesOnly, setShowFavoritesOnly } = useFavorites();

  const {
    isLoading,
    filteredStores,
    filteredDeals,
    storeCategories,
    dealCategories
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

  const showMastercardBanner = activeClubs.has('mastercard') && (activeTab === 'all' || activeTab === 'deals');

  // Categories to display based on active tab
  const activeCategories = activeTab === 'deals' ? dealCategories : storeCategories;
  const totalItemsCount = activeTab === 'deals' ? filteredDeals.length : filteredStores.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full space-y-5">
        {/* Mastercard Countdown Banner */}
        {showMastercardBanner && <MastercardCountdown />}

        {/* View Routing */}
        {activeTab === 'map' && <MapView />}

        {activeTab === 'wallets' && <WalletsView />}

        {activeTab === 'billing' && <BillingView />}

        {(activeTab === 'all' || activeTab === 'stores' || activeTab === 'deals') && (
          <div className="space-y-4">
            {/* Category Filter Carousel */}
            <CategoryChips
              categories={activeCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={cat => setSelectedCategory(cat)}
              totalCount={totalItemsCount}
            />

            {/* Filter & Sorting Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>
                  {showFavoritesOnly ? (
                    <span className="font-bold text-amber-500">תצוגת מועדפים בלבד: </span>
                  ) : (
                    <span>נמצאו </span>
                  )}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {filteredStores.length.toLocaleString()}
                  </strong>{' '}
                  רשתות ו-
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {filteredDeals.length.toLocaleString()}
                  </strong>{' '}
                  מבצעים
                </span>

                {showFavoritesOnly && (
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="text-xs text-amber-600 dark:text-amber-400 underline mr-2"
                  >
                    הצג הכל
                  </button>
                )}
              </div>

              {/* View Mode & Sorting selectors */}
              <div className="flex items-center gap-2">
                {/* View Mode Switcher (Grid vs Table) */}
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

                {/* Sorting selector */}
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
                  נסה להסיר מילות חיפוש, לבחור קטגוריה אחרת, או לוודא שמועדוני הצרכנות מסומנים בכותרת.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Stores Section */}
                {(activeTab === 'all' || activeTab === 'stores') && filteredStores.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                          <Store className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          רשתות וחנויות ({filteredStores.length.toLocaleString()})
                        </h2>
                      </div>
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
                {(activeTab === 'all' || activeTab === 'deals') && filteredDeals.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          מבצעים, שוברים וקופונים ({filteredDeals.length.toLocaleString()})
                        </h2>
                      </div>
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
      </main>

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
