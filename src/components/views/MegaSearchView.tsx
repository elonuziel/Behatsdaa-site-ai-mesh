import React, { useState } from 'react';
import { UnifiedStore } from '../../types/store';
import { UnifiedDeal } from '../../types/deal';
import { useSearch } from '../../context/SearchContext';
import { StoreCard } from '../StoreCard';
import { DealCard } from '../DealCard';
import { TableView } from '../TableView';
import { DealsTableView } from '../DealsTableView';
import { CategoryChips } from '../CategoryChips';
import { MyClubsPills } from '../MyClubsPills';
import { MapView } from '../MapView';
import { MegaAiSearchView } from '../mega/MegaAiSearchView';
import { MegaComparisonView } from '../mega/MegaComparisonView';
import { MegaTopDealsView } from '../mega/MegaTopDealsView';
import { CleanModeHero } from './CleanModeHero';
import { CatalogToolbar } from '../toolbar/CatalogToolbar';
import {
  Store,
  Tag,
  Sparkles,
  Search,
  X,
  SlidersHorizontal
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

  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'stores' | 'deals'>('all');
  const [cleanModeShowShopsManually, setCleanModeShowShopsManually] = useState(false);
  const [visibleStoreLimit, setVisibleStoreLimit] = useState(36);
  const [visibleDealLimit, setVisibleDealLimit] = useState(36);

  // SubTab views
  if (subTab === 'ai-search') {
    return <MegaAiSearchView onSelectStore={onSelectStore} onSelectDeal={onSelectDeal} />;
  }
  if (subTab === 'comparison') {
    return <MegaComparisonView stores={allStores} onSelectStore={onSelectStore} />;
  }
  if (subTab === 'map') {
    return <MapView />;
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

  // subTab === 'all'
  return (
    <div className="space-y-4">
      {uiDensity === 'clean' ? (
        <CatalogToolbar
          totalStoresCount={filteredStores.length}
          totalDealsCount={filteredDeals.length}
          availableCards={availableCards}
          storeCategories={storeCategories}
          contentTypeFilter={contentTypeFilter}
          setContentTypeFilter={setContentTypeFilter}
        />
      ) : (
        <>
          {/* Detailed Mode Banner */}
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
      ) : uiDensity === 'clean' && !query.trim() && selectedCategory === 'all' && !cleanModeShowShopsManually ? (
        <CleanModeHero
          totalStoresCount={filteredStores.length}
          onShowAllShops={() => setCleanModeShowShopsManually(true)}
        />
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
  );
};
