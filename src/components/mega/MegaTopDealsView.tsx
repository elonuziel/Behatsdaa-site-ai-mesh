import React, { useState, useMemo } from 'react';
import { UnifiedDeal } from '../../types/deal';
import { DealCard } from '../DealCard';
import { DealsTableView } from '../DealsTableView';
import { ViewModeToggle } from '../ViewModeToggle';
import { useSearch } from '../../context/SearchContext';
import {
  Flame,
  Search,
  Filter
} from 'lucide-react';

interface MegaTopDealsViewProps {
  deals: UnifiedDeal[];
  onSelectDeal: (id: string) => void;
  onSelectStore: (slug: string) => void;
}

export const MegaTopDealsView: React.FC<MegaTopDealsViewProps> = ({
  deals,
  onSelectDeal,
  onSelectStore
}) => {
  const { viewMode } = useSearch();
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(36);

  // Top deals sorted by discount percentage descending
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => {
      const discA = a.discount_percent || 0;
      const discB = b.discount_percent || 0;
      return discB - discA;
    });
  }, [deals]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach(d => {
      const cat = d.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return sortedDeals.filter(d => {
      if (selectedClub !== 'all' && d.club !== selectedClub) {
        return false;
      }
      if (selectedCategory !== 'all' && (d.category || 'כללי') !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const inTitle = d.title.toLowerCase().includes(q);
        const inSupp = d.supplier && d.supplier.toLowerCase().includes(q);
        if (!inTitle && !inSupp) return false;
      }
      return true;
    });
  }, [sortedDeals, selectedClub, selectedCategory, search]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-orange-400/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black">מבצעי שיא בכל המועדונים</h2>
            <p className="text-xs md:text-sm text-orange-100">
              השוברים וההטבות עם אחוזי ההנחה והחיסכון הגבוהים ביותר מכל המועדונים
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-orange-100 block">מבצעים מדורגים</span>
          <span className="text-xl font-black">{filteredDeals.length.toLocaleString()} הטבות</span>
        </div>
      </div>

      {/* Club Selector Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
        {/* Club Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>מועדון:</span>
          </span>

          <button
            onClick={() => setSelectedClub('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedClub === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            כל המועדונים
          </button>
          <button
            onClick={() => setSelectedClub('behatsdaa')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedClub === 'behatsdaa'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            בהצדעה (1,670)
          </button>
          <button
            onClick={() => setSelectedClub('uniq')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedClub === 'uniq'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            UNIQ (207)
          </button>
          <button
            onClick={() => setSelectedClub('mastercard')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedClub === 'mastercard'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Mastercard Day (44)
          </button>
        </div>

        {/* Controls: Search Input & View Mode Toggle */}
        <div className="flex items-center gap-2 max-w-md w-full justify-end">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="סינון לפי שם מבצע או ספק..."
              className="w-full pl-8 pr-9 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-amber-500 focus:outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-2.5 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <ViewModeToggle />
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            כל הקטגוריות ({deals.length.toLocaleString()})
          </button>
          {categories.slice(0, 15).map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat.name
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* Deals Display: Table or Grid */}
      {viewMode === 'table' ? (
        <DealsTableView
          deals={filteredDeals.slice(0, visibleLimit)}
          onSelectDeal={id => onSelectDeal(id)}
          onSelectStore={slug => onSelectStore(slug)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDeals.slice(0, visibleLimit).map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onSelect={id => onSelectDeal(id)}
              onSelectStore={slug => onSelectStore(slug)}
            />
          ))}
        </div>
      )}

      {filteredDeals.length > visibleLimit && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisibleLimit(prev => prev + 36)}
            className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-amber-500 hover:text-amber-600 transition shadow-xs cursor-pointer"
          >
            הצג עוד מבצעי שיא (+36)
          </button>
        </div>
      )}
    </div>
  );
};
