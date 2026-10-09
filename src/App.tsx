import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { MastercardCountdown } from './components/MastercardCountdown';
import { StoreCard } from './components/StoreCard';
import { DealCard } from './components/DealCard';
import { MapView } from './components/MapView';
import { WalletsView } from './components/WalletsView';
import { PaymentAdvisorModal } from './components/PaymentAdvisorModal';
import { DealDetailModal } from './components/DealDetailModal';
import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useMiniSearch } from './hooks/useMiniSearch';
import { Store, Tag, Sparkles, ArrowUpDown } from 'lucide-react';

export const App: React.FC = () => {
  const {
    query,
    activeTab,
    sortBy,
    setSortBy,
    selectedStoreSlug,
    setSelectedStoreSlug,
    selectedDealId,
    setSelectedDealId
  } = useSearch();
  const { activeClubs } = useClubs();

  const { isLoading, filteredStores, filteredDeals } = useMiniSearch(query, activeClubs, sortBy);

  const [visibleStoreLimit, setVisibleStoreLimit] = useState(36);
  const [visibleDealLimit, setVisibleDealLimit] = useState(36);

  const showMastercardBanner = activeClubs.has('mastercard') && (activeTab === 'all' || activeTab === 'deals');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Mastercard Countdown Banner */}
        {showMastercardBanner && <MastercardCountdown />}

        {/* View Routing */}
        {activeTab === 'map' && <MapView />}

        {activeTab === 'wallets' && <WalletsView />}

        {(activeTab === 'all' || activeTab === 'stores' || activeTab === 'deals') && (
          <div>
            {/* Filter & Sorting Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
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

              {/* Sorting selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>מיון:</span>
                </span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="discount">הנחה מרבית % (גבוה לנמוך)</option>
                  <option value="name">שם א-ת</option>
                  <option value="relevant">התאמה לחיפוש</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">טוען ומאנדקס נתוני מועדונים...</p>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredStores.slice(0, visibleStoreLimit).map(store => (
                        <StoreCard
                          key={store.id}
                          store={store}
                          onSelect={slug => setSelectedStoreSlug(slug)}
                        />
                      ))}
                    </div>

                    {filteredStores.length > visibleStoreLimit && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setVisibleStoreLimit(prev => prev + 36)}
                          className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-emerald-500 hover:text-emerald-600 transition shadow-xs"
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
                        />
                      ))}
                    </div>

                    {filteredDeals.length > visibleDealLimit && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setVisibleDealLimit(prev => prev + 36)}
                          className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-amber-500 hover:text-amber-600 transition shadow-xs"
                        >
                          הצג עוד מבצעים (+36)
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* Empty State */}
                {filteredStores.length === 0 && filteredDeals.length === 0 && (
                  <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                    <Sparkles className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                      לא נמצאו תוצאות התואמות את החיפוש
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      נסה לחפש במילים אחרות, להסיר פילטרים או להפעיל מועדונים נוספים בשורת המועדונים העליונה.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Payment Advisor Modal */}
      <PaymentAdvisorModal
        slug={selectedStoreSlug}
        onClose={() => setSelectedStoreSlug(null)}
        onSelectDeal={id => {
          setSelectedStoreSlug(null);
          setSelectedDealId(id);
        }}
      />

      {/* Deal Detail Modal */}
      <DealDetailModal
        id={selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onSelectStore={slug => {
          setSelectedDealId(null);
          setSelectedStoreSlug(slug);
        }}
      />

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ההטבות שלי — פורטל מאוחד למועדוני בהצדעה, UNIQ ו-Mastercard Day</p>
          <p className="text-slate-400">הנתונים מתעדכנים ישירות ממערכות המועדונים והמבצעים</p>
        </div>
      </footer>
    </div>
  );
};
