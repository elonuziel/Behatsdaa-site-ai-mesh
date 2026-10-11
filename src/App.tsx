import React from 'react';
import { Navbar } from './components/Navbar';
import { PaymentAdvisorModal } from './components/PaymentAdvisorModal';
import { DealDetailModal } from './components/DealDetailModal';
import { AiChatModal } from './components/chat/AiChatModal';
import { MegaSearchView } from './components/views/MegaSearchView';
import { BehatsdaaView } from './components/views/BehatsdaaView';
import { FavoritesView } from './components/favorites/FavoritesView';
import { UniqTabAView } from './components/uniq/UniqTabAView';
import { UniqTabBView } from './components/uniq/UniqTabBView';
import { UniqTabCView } from './components/uniq/UniqTabCView';
import { UniqTabDView } from './components/uniq/UniqTabDView';
import { MastercardDealsView } from './components/mastercard/MastercardDealsView';
import { MastercardActiveTodayView } from './components/mastercard/MastercardActiveTodayView';
import { MastercardTermsView } from './components/mastercard/MastercardTermsView';
import { useSearch } from './context/SearchContext';
import { useClubs } from './context/ClubContext';
import { useFavorites } from './context/FavoritesContext';
import { useChat } from './context/ChatContext';
import { useMiniSearch } from './hooks/useMiniSearch';
import { Bot } from 'lucide-react';

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
          <>
            {subTab === 'tab-a' && <UniqTabAView />}
            {subTab === 'tab-b' && <UniqTabBView />}
            {subTab === 'tab-c' && <UniqTabCView />}
            {subTab === 'tab-d' && <UniqTabDView />}
          </>
        )}

        {primaryTab === 'mastercard' && (
          <>
            {subTab === 'deals' && <MastercardDealsView />}
            {subTab === 'active-today' && <MastercardActiveTodayView />}
            {subTab === 'terms' && <MastercardTermsView />}
          </>
        )}

        {primaryTab === 'favorites' && (
          <FavoritesView
            stores={allStores} deals={allDeals}
            onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId}
          />
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ההטבות שלי — פורטל מאוחד למועדוני בהצדעה, UNIQ ו-Mastercard Day</p>
          <p className="text-slate-400">הנתונים מתעדכנים ישירות ממערכות המועדונים והמבצעים</p>
        </div>
      </footer>

      {selectedStoreSlug && (
        <PaymentAdvisorModal
          slug={selectedStoreSlug}
          onClose={() => setSelectedStoreSlug(null)}
          onSelectCard={cardName => { setSelectedCard(cardName); setSelectedStoreSlug(null); }}
          onSelectDeal={dealId => { setSelectedStoreSlug(null); setSelectedDealId(dealId); }}
        />
      )}

      {selectedDealId && (
        <DealDetailModal
          id={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onSelectStore={slug => { setSelectedDealId(null); setSelectedStoreSlug(slug); }}
        />
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

      <AiChatModal onSelectStore={setSelectedStoreSlug} onSelectDeal={setSelectedDealId} />
    </div>
  );
};
