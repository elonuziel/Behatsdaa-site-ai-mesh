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
import { OnlineStatusIndicator } from './components/OnlineStatusIndicator';
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

/**
 * Renders the active benefits view, navigation, detail modals, and AI chat controls.
 */
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

      <footer className="mt-12 py-6 pb-safe border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 space-y-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ההטבות שלי — פורטל מאוחד למועדוני בהצדעה, UNIQ ו-Mastercard Day</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <OnlineStatusIndicator />
            <ClubLastUpdatedBadge showAll={true} variant="footer" />
          </div>
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

      <div className="fixed bottom-5 left-5 z-40 mb-safe">
        <button
          onClick={() => openChat(query)}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-700 dark:border-slate-200"
          title="סייר הטבות AI — שאל כל שאלה"
          aria-label="סייר הטבות AI"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>

      <Suspense fallback={null}>
        <AiChatModal onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId} />
      </Suspense>
    </div>
  );
};
