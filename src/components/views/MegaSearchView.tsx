import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedStore } from '../../types/store';
import { UnifiedDeal } from '../../types/deal';
import { useSearch } from '../../context/SearchContext';
import { useChat } from '../../context/ChatContext';
import { StoreCard } from '../StoreCard';
import { DealCard } from '../DealCard';
import { TableView } from '../TableView';
import { DealsTableView } from '../DealsTableView';
import { CategoryChips } from '../CategoryChips';
import { MyClubsPills } from '../MyClubsPills';
import { ViewModeToggle } from '../ViewModeToggle';
const MapView = React.lazy(() => import('../MapView').then(m => ({ default: m.MapView })));
import { MegaAiSearchView } from '../mega/MegaAiSearchView';
import { MegaComparisonView } from '../mega/MegaComparisonView';
import { MegaTopDealsView } from '../mega/MegaTopDealsView';
import { CatalogToolbar } from '../toolbar/CatalogToolbar';
import {
  Store,
  Tag,
  Sparkles,
  Search,
  Bot,
  ArrowUp
} from 'lucide-react';

interface MegaSearchViewProps {
  isLoading: boolean;
  allStores: UnifiedStore[];
  allDeals: UnifiedDeal[];
  filteredStores: UnifiedStore[];
  filteredDeals: UnifiedDeal[];
  availableCards: Array<{ id: string; name: string; count: number }>;
  storeCategories: Array<{ name: string; count: number }>;
  didYouMean?: string[];
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

const DISCOVERY_INTENT_CHIPS = [
  { label: '🍕 פיצה ומסעדות', val: 'פיצה' },
  { label: '⛽ דלק ותחבורה', val: 'דלק' },
  { label: '🛒 סופרמרקט ומזון', val: 'סופר' },
  { label: '👟 אופנה והנעלה', val: 'אופנה' },
  { label: '✈️ טיסות ומלונות', val: 'מלון' },
  { label: '📱 סלולר ו-eSIM', val: 'esim' },
  { label: '🎬 קולנוע ומופעים', val: 'קולנוע' },
  { label: '💻 KSP ומחשבים', val: 'ksp' },
  { label: '🎁 גיפט קארד ושוברים', val: 'שובר' }
];

export const MegaSearchView: React.FC<MegaSearchViewProps> = ({
  isLoading,
  allStores,
  allDeals,
  filteredStores,
  filteredDeals,
  availableCards,
  storeCategories,
  didYouMean,
  onSelectStore,
  onSelectDeal
}) => {
  const {
    subTab,
    query,
    setQuery,
    uiDensity,
    toggleUiDensity,
    viewMode,
    selectedCategory,
    setSelectedCategory,
    searchInDesc,
    setSearchInDesc
  } = useSearch();

  const { openChat } = useChat();

  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'stores' | 'deals'>('all');
  const [visibleStoreLimit, setVisibleStoreLimit] = useState(36);
  const [visibleDealLimit, setVisibleDealLimit] = useState(36);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset pagination limit when search query or filters change
  useEffect(() => {
    setVisibleStoreLimit(36);
    setVisibleDealLimit(36);
  }, [query, selectedCategory, contentTypeFilter]);

  // Track window scroll for Scroll-to-Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasMoreStores = filteredStores.length > visibleStoreLimit && (contentTypeFilter === 'all' || contentTypeFilter === 'stores');
  const hasMoreDeals = filteredDeals.length > visibleDealLimit && (contentTypeFilter === 'all' || contentTypeFilter === 'deals');
  const hasMore = hasMoreStores || hasMoreDeals;

  const loadMore = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    if (hasMoreStores) {
      setVisibleStoreLimit(prev => Math.min(prev + 36, filteredStores.length));
    }
    if (hasMoreDeals) {
      setVisibleDealLimit(prev => Math.min(prev + 36, filteredDeals.length));
    }
    setTimeout(() => {
      setIsLoadingMore(false);
    }, 150);
  }, [hasMoreStores, hasMoreDeals, filteredStores.length, filteredDeals.length, isLoadingMore]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { root: null, rootMargin: '400px', threshold: 0.05 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // SubTab views
  if (subTab === 'ai-search') {
    return <MegaAiSearchView onSelectStore={onSelectStore} onSelectDeal={onSelectDeal} />;
  }
  if (subTab === 'comparison') {
    return <MegaComparisonView stores={allStores} onSelectStore={onSelectStore} />;
  }
  if (subTab === 'map') {
    return (
      <React.Suspense fallback={<div className="flex justify-center p-8 text-slate-400">טוען מפה...</div>}>
        <MapView />
      </React.Suspense>
    );
  }
  if (subTab === 'top-deals') {
    return (
      <MegaTopDealsView
        deals={allDeals}
        onSelectDeal={onSelectDeal}
        onSelectStore={onSelectStore}
      />
    );
  }

  // CLEAN MODE: When no query is typed, show ONLY minimal search & AI search
  if (uiDensity === 'clean' && !query.trim()) {
    return (
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-4 text-center space-y-7 animate-in fade-in duration-200">
        <div className="space-y-2.5">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            חיפוש הטבות
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            חיפוש מהיר או שיחה עם סייר ה-AI בכל מועדוני הצרכנות
          </p>
        </div>

        {/* Minimalist Search Box */}
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש רשת, הטבה או מוצר (למשל: דלק, פיצה, KSP)..."
            autoFocus
            className="w-full bg-white dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-750 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-5 py-4 pl-12 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* AI Direct Action & View Mode Selection */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openChat(query)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
          >
            <Bot className="w-4 h-4 text-emerald-400 dark:text-white" />
            <span>סייר הטבות AI</span>
          </button>
          <ViewModeToggle className="bg-white dark:bg-slate-850 shadow-2xs" />
        </div>

        {/* Quick Search Tags */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
            חיפושים מהירים:
          </div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {['פיצה', 'דלק', 'סופרמרקט', 'eSIM', 'קולנוע', 'KSP', 'מלונות'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Switch to Full Mode Link */}
        <div className="pt-10 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={toggleUiDensity}
            className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
          >
            רוצה לראות את כל הרשתות והמבצעים? <span className="underline font-semibold">מעבר לתצוגה מלאה</span>
          </button>
        </div>
      </div>
    );
  }

  // subTab === 'all'
  return (
    <div className="space-y-4">
      {uiDensity === 'clean' ? (
        /* In Clean Mode with active query: sleek minimal results bar with AI action & cards/table toggle */
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              תוצאות עבור: <span className="font-bold text-slate-900 dark:text-white">"{query}"</span>
              {' '}({(filteredStores.length + filteredDeals.length).toLocaleString()} תוצאות)
            </div>
            {/* Cards vs Table switch in Clean Mode */}
            <ViewModeToggle />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openChat(query)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition cursor-pointer shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>שאל את ה-AI</span>
            </button>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
            >
              נקה
            </button>
          </div>
        </div>
      ) : (
        <>
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
            totalCount={allStores.length + allDeals.length}
            compact={false}
          />

          {/* Toolbar */}
          <CatalogToolbar
            totalStoresCount={filteredStores.length}
            totalDealsCount={filteredDeals.length}
            availableCards={availableCards}
            storeCategories={storeCategories}
            contentTypeFilter={contentTypeFilter}
            setContentTypeFilter={setContentTypeFilter}
          />
        </>
      )}

      {/* Discovery Intent Chips in Detailed Mode */}
      {uiDensity === 'detailed' && !query && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            חיפושים נפוצים:
          </span>
          {DISCOVERY_INTENT_CHIPS.map(chip => (
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

      {/* Main Content Area */}
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
                  onSelect={onSelectStore}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredStores.slice(0, visibleStoreLimit).map(store => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      onSelect={onSelectStore}
                      onSelectDeal={onSelectDeal}
                    />
                  ))}
                </div>
              )}

              {filteredStores.length > visibleStoreLimit && (
                <div className="mt-4 text-center">
                  <span className="text-xs text-slate-400">
                    מציג {Math.min(visibleStoreLimit, filteredStores.length)} מתוך {filteredStores.length.toLocaleString()} רשתות (גלול למטה לטעינה אוטומטית)
                  </span>
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
                  onSelectDeal={onSelectDeal}
                  onSelectStore={onSelectStore}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDeals.slice(0, visibleDealLimit).map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onSelect={onSelectDeal}
                      onSelectStore={onSelectStore}
                    />
                  ))}
                </div>
              )}

              {filteredDeals.length > visibleDealLimit && (
                <div className="mt-4 text-center">
                  <span className="text-xs text-slate-400">
                    מציג {Math.min(visibleDealLimit, filteredDeals.length)} מתוך {filteredDeals.length.toLocaleString()} מבצעים (גלול למטה לטעינה אוטומטית)
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Infinite Scroll Sentinel & Loader */}
          {hasMore && (
            <div ref={observerTarget} className="py-8 flex flex-col items-center justify-center gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>טוען עוד תוצאות בגלילה...</span>
              </div>
              <button
                type="button"
                onClick={loadMore}
                className="px-5 py-2 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-emerald-500 hover:text-emerald-600 transition shadow-xs cursor-pointer"
              >
                הצג עוד תוצאות (+36)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="חזרה לראש העמוד"
          className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
