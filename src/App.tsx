import React, { Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { MegaSearchView } from './components/views/MegaSearchView';
import { BehatsdaaView } from './components/views/BehatsdaaView';
import { FavoritesView } from './components/favorites/FavoritesView';
import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useFavorites } from './context/FavoritesContext';
import { useChat } from './context/ChatContext';
import { useMiniSearch } from './hooks/useMiniSearch';
import { ClubLastUpdatedBadge } from './components/ClubLastUpdatedBadge';
import { Bot } from 'lucide-react';

const PaymentAdvisorModal = React.lazy(() =>
  import('./components/PaymentAdvisorModal').then(m => ({ default: m.PaymentAdvisorModal }))
);
const DealDetailModal = React.lazy(() =>
  import('./components/DealDetailModal').then(m => ({ default: m.DealDetailModal }))
);
const AiChatModal = React.lazy(() =>
  import('./components/chat/AiChatModal').then(m => ({ default: m.AiChatModal }))
);
const UniqTabAView = React.lazy(() =>
  import('./components/uniq/UniqTabAView').then(m => ({ default: m.UniqTabAView }))
);
const UniqTabBView = React.lazy(() =>
  import('./components/uniq/UniqTabBView').then(m => ({ default: m.UniqTabBView }))
);
const UniqTabCView = React.lazy(() =>
  import('./components/uniq/UniqTabCView').then(m => ({ default: m.UniqTabCView }))
);
const UniqTabDView = React.lazy(() =>
  import('./components/uniq/UniqTabDView').then(m => ({ default: m.UniqTabDView }))
);
const MastercardDealsView = React.lazy(() =>
  import('./components/mastercard/MastercardDealsView').then(m => ({ default: m.MastercardDealsView }))
);
const MastercardActiveTodayView = React.lazy(() =>
  import('./components/mastercard/MastercardActiveTodayView').then(m => ({ default: m.MastercardActiveTodayView }))
);
const MastercardTermsView = React.lazy(() =>
  import('./components/mastercard/MastercardTermsView').then(m => ({ default: m.MastercardTermsView }))
);

const ViewSuspenseFallback = () => (
  <div className="flex items-center justify-center p-12 text-slate-400">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-3" />
    <span>טוען תצוגה...</span>
  </div>
);

export const App: React.FC = () => {
  const {
    query, primaryTab, subTab, selectedCategory, selectedCard, setSelectedCard,
    sortBy, selectedStoreSlug, setSelectedStoreSlug, selectedDealId, setSelectedDealId,
    smartSearch, fuzzySearch, searchInDesc
  } = useSearch();

  const { activeClubs } = useClubs();
  const { isFavorite, showFavoritesOnly } = useFavorites();
  const { openChat } = useChat();

  const {
    isLoading, allStores, allDeals, filteredStores, filteredDeals,
    availableCards, storeCategories, didYouMean
  } = useMiniSearch(
    query, activeClubs, sortBy, selectedCategory, showFavoritesOnly,
    isFavorite, { smartSearch, fuzzySearch, searchInDesc, selectedCard }
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full space-y-5">
        {primaryTab === 'mega' && (
          <MegaSearchView
            isLoading={isLoading} allStores={allStores} allDeals={allDeals}
            filteredStores={filteredStores} filteredDeals={filteredDeals}
            availableCards={availableCards} storeCategories={storeCategories}
            didYouMean={didYouMean} onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId}
          />
        )}

        {primaryTab === 'behatsdaa' && (
          <BehatsdaaView
            allStores={allStores} allDeals={allDeals} availableCards={availableCards}
            onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId}
          />
        )}

        {primaryTab === 'uniq' && (
          <Suspense fallback={<ViewSuspenseFallback />}>
            {subTab === 'tab-a' && <UniqTabAView />}
            {subTab === 'tab-b' && <UniqTabBView />}
            {subTab === 'tab-c' && <UniqTabCView />}
            {subTab === 'tab-d' && <UniqTabDView />}
          </Suspense>
        )}

        {primaryTab === 'mastercard' && (
          <Suspense fallback={<ViewSuspenseFallback />}>
            {subTab === 'deals' && <MastercardDealsView />}
            {subTab === 'active-today' && <MastercardActiveTodayView />}
            {subTab === 'terms' && <MastercardTermsView />}
          </Suspense>
        )}

        {primaryTab === 'favorites' && (
          <FavoritesView
            stores={allStores} deals={allDeals}
            onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId}
          />
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 space-y-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ההטבות שלי — פורטל מאוחד למועדוני בהצדעה, UNIQ ו-Mastercard Day</p>
          <ClubLastUpdatedBadge showAll={true} variant="footer" />
        </div>
      </footer>

      {selectedStoreSlug && (
        <Suspense fallback={null}>
          <PaymentAdvisorModal
            slug={selectedStoreSlug}
            onClose={() => setSelectedStoreSlug(null)}
            onSelectCard={cardName => { setSelectedCard(cardName); setSelectedStoreSlug(null); }}
            onSelectDeal={dealId => { setSelectedStoreSlug(null); setSelectedDealId(dealId); }}
          />
        </Suspense>
      )}

      {selectedDealId && (
        <Suspense fallback={null}>
          <DealDetailModal
            id={selectedDealId}
            onClose={() => setSelectedDealId(null)}
            onSelectStore={slug => { setSelectedDealId(null); setSelectedStoreSlug(slug); }}
          />
        </Suspense>
      )}

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
          <span className="hidden sm:inline text-[11px] font-normal text-emerald-100">· חיפוש חופשי</span>
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
        </button>
      </div>

      <Suspense fallback={null}>
        <AiChatModal onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId} />
      </Suspense>
    </div>
  );
};
