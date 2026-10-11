import React, { useState, useMemo } from 'react';
import { UnifiedStore } from '../../types/store';
import { UnifiedDeal } from '../../types/deal';
import { useSearch } from '../../context/SearchContext';
import { StoreCard } from '../StoreCard';
import { DealCard } from '../DealCard';
import { TableView } from '../TableView';
import { DealsTableView } from '../DealsTableView';
import { CategoryChips } from '../CategoryChips';
import { BillingView } from '../BillingView';
const MapView = React.lazy(() => import('../MapView').then(m => ({ default: m.MapView })));
import { WalletsView } from '../WalletsView';
import { ViewModeToggle } from '../ViewModeToggle';
import { ClubLastUpdatedBadge } from '../ClubLastUpdatedBadge';
import { normalizeHebrew } from '../../utils/hebrew';
import { expandSmartTerms, matchesCategory } from '../../hooks/useMiniSearch';
import {
  Store,
  Tag,
  Search,
  X,
  Frown,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface BehatsdaaViewProps {
  allStores: UnifiedStore[];
  allDeals: UnifiedDeal[];
  availableCards: Array<{ id: string; name: string; count: number }>;
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

export const BehatsdaaView: React.FC<BehatsdaaViewProps> = ({
  allStores,
  allDeals,
  availableCards,
  onSelectStore,
  onSelectDeal
}) => {
  const {
    subTab,
    query,
    selectedCategory,
    setSelectedCategory,
    selectedCard,
    setSelectedCard,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    uiDensity,
    smartSearch,
    searchInDesc
  } = useSearch();

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
      list = list.filter(s => matchesCategory(s.category, selectedCategory));
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
      list = list.filter(d => matchesCategory(d.category, selectedCategory));
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

  if (subTab === 'billing') return <BillingView />;
  if (subTab === 'map') {
    return (
      <React.Suspense fallback={<div className="flex justify-center p-8 text-slate-400">טוען מפה...</div>}>
        <MapView />
      </React.Suspense>
    );
  }
  if (subTab === 'wallets') return <WalletsView />;

  if (subTab === 'deals') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              מועדון בהצדעה — שוברים ומבצעים
            </h2>
          </div>
          <ClubLastUpdatedBadge clubId="behatsdaa" variant="header" />
        </div>

        <CategoryChips
          categories={behDealCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={cat => setSelectedCategory(cat)}
          totalCount={behDeals.length}
          compact={uiDensity === 'clean'}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
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
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">לא נמצאו שוברים תואמים</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">נסה להסיר מילות חיפוש או לבחור קטגוריה אחרת.</p>
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
            onSelectDeal={onSelectDeal}
            onSelectStore={onSelectStore}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBehDeals.slice(0, visibleDealLimit).map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onSelect={onSelectDeal}
                onSelectStore={onSelectStore}
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

        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
          <ClubLastUpdatedBadge clubId="behatsdaa" variant="footer" />
        </div>
      </div>
    );
  }

  // default subTab === 'stores'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            מועדון בהצדעה — רשתות וארנקים נטענים
          </h2>
        </div>
        <ClubLastUpdatedBadge clubId="behatsdaa" variant="header" />
      </div>

      <CategoryChips
        categories={behStoreCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={cat => setSelectedCategory(cat)}
        totalCount={behStores.length}
        compact={uiDensity === 'clean'}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
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
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">לא נמצאו רשתות תואמות</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">נסה להסיר מילות חיפוש או לבחור קטגוריה אחרת.</p>
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
          onSelect={onSelectStore}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBehStores.slice(0, visibleStoreLimit).map(store => (
            <StoreCard
              key={store.id}
              store={store}
              onSelect={onSelectStore}
              onSelectDeal={onSelectDeal}
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

      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
        <ClubLastUpdatedBadge clubId="behatsdaa" variant="footer" />
      </div>
    </div>
  );
};
