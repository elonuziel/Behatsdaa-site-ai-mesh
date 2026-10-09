import React, { useState, useEffect, useMemo } from 'react';
import { MastercardDeal, getDealValidityStatus } from '../../utils/mastercardValidity';
import { MastercardHero } from './MastercardHero';
import { MastercardDealCard } from './MastercardDealCard';
import { MastercardTableView } from './MastercardTableView';
import fallbackDealsData from '../../data/mastercard_deals.json';
import {
  Search,
  X,
  CalendarCheck,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Frown,
  RotateCcw
} from 'lucide-react';

interface MastercardDealsViewProps {
  initialValidity?: string;
}

export const MastercardDealsView: React.FC<MastercardDealsViewProps> = ({
  initialValidity = 'all'
}) => {
  const [deals, setDeals] = useState<MastercardDeal[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Controls State
  const [search, setSearch] = useState('');
  const [selectedValidity, setSelectedValidity] = useState<string>(initialValidity);
  const [selectedCategory, setSelectedCategory] = useState<string>('הכל');
  const [sortBy, setSortBy] = useState<'discount-desc' | 'brand-asc' | 'min-spend-asc'>('discount-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('mc_view_mode') as 'grid' | 'table') || 'grid';
  });

  useEffect(() => {
    if (initialValidity) {
      setSelectedValidity(initialValidity);
    }
  }, [initialValidity]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const base = import.meta.env.BASE_URL || '/';
    const candidateUrls = [
      `${base}data/mastercard/deals.json`.replace('//', '/'),
      '/data/mastercard/deals.json',
      './data/mastercard/deals.json',
      'data/deals.json'
    ];

    async function loadData() {
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url);
          const ct = res.headers.get('content-type') || '';
          if (res.ok && (ct.includes('application/json') || !ct.includes('text/html'))) {
            const json = await res.json();
            if (json && Array.isArray(json.deals)) {
              if (isMounted) {
                setDeals(json.deals);
                setMetadata(json.metadata || null);
                setIsLoading(false);
              }
              return;
            }
          }
        } catch {
          // Continue to next candidate URL
        }
      }

      // Safe fallback to bundled dataset if fetch failed or returned HTML
      if (isMounted) {
        const fb: any = fallbackDealsData;
        setDeals(fb.deals || []);
        setMetadata(fb.metadata || null);
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('mc_view_mode', mode);
  };

  const categories = useMemo(() => {
    if (metadata?.categories) {
      return metadata.categories as string[];
    }
    const set = new Set<string>();
    deals.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return ['הכל', ...Array.from(set)];
  }, [deals, metadata]);

  // Validity filter definitions with live counts
  const validityFilters = useMemo(() => {
    const now = new Date();
    const defs = [
      { id: 'all', label: 'כל ההטבות' },
      { id: 'active_today', label: 'בתוקף היום 🔥' },
      { id: 'only_10th', label: '10 בחודש בלבד' },
      { id: '10_11th', label: 'גם ב-11 בחודש' },
      { id: 'all_month', label: 'כל החודש' },
      { id: 'expired', label: 'פג תוקף לחודש זה' }
    ];

    return defs.map(def => {
      let count = 0;
      if (def.id === 'all') {
        count = deals.length;
      } else if (def.id === 'active_today') {
        count = deals.filter(d => getDealValidityStatus(d, now).status === 'active_today').length;
      } else if (def.id === 'expired') {
        count = deals.filter(d => getDealValidityStatus(d, now).status === 'expired').length;
      } else if (def.id === '10_11th') {
        count = deals.filter(d =>
          d.validity_code === '10_11th' ||
          d.validity_code === '10_11th_and_all_month' ||
          (Array.isArray(d.valid_days) && d.valid_days.includes(11))
        ).length;
      } else if (def.id === 'all_month') {
        count = deals.filter(d =>
          d.validity_code === 'all_month' ||
          d.validity_code === '10_11th_and_all_month' ||
          Boolean(d.ongoing_discount) ||
          (Array.isArray(d.valid_days) && d.valid_days.length >= 28)
        ).length;
      } else {
        count = deals.filter(d => d.validity_code === def.id).length;
      }
      return { ...def, count };
    });
  }, [deals]);

  const activeTodayCount = useMemo(() => {
    const filter = validityFilters.find(f => f.id === 'active_today');
    return filter ? filter.count : 0;
  }, [validityFilters]);

  // Filter & Sort Logic
  const filteredDeals = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();

    const list = deals.filter(deal => {
      // 1. Validity Filter
      const vStatus = getDealValidityStatus(deal, now);
      if (selectedValidity === 'active_today' && vStatus.status !== 'active_today') {
        return false;
      }
      if (selectedValidity === 'expired' && vStatus.status !== 'expired') {
        return false;
      }
      if (selectedValidity === 'only_10th' && deal.validity_code !== 'only_10th') {
        return false;
      }
      if (selectedValidity === '10_11th') {
        const is11Valid =
          deal.validity_code === '10_11th' ||
          deal.validity_code === '10_11th_and_all_month' ||
          (Array.isArray(deal.valid_days) && deal.valid_days.includes(11));
        if (!is11Valid) return false;
      }
      if (selectedValidity === 'all_month') {
        const isAllMonth =
          deal.validity_code === 'all_month' ||
          deal.validity_code === '10_11th_and_all_month' ||
          Boolean(deal.ongoing_discount) ||
          (Array.isArray(deal.valid_days) && deal.valid_days.length >= 28);
        if (!isAllMonth) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'הכל' && deal.category !== selectedCategory) {
        return false;
      }

      // 3. Search Filter
      if (q) {
        const bulletsText = (deal.terms_bullets || []).join(' ');
        const haystack = `${deal.brand} ${deal.title} ${deal.coupon || ''} ${deal.discount} ${deal.category || ''} ${deal.min_spend || ''} ${deal.description || ''} ${bulletsText}`.toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // 4. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'discount-desc') {
        return (b.discount_numeric || 0) - (a.discount_numeric || 0);
      }
      if (sortBy === 'brand-asc') {
        return (a.brand || '').localeCompare(b.brand || '', 'he');
      }
      if (sortBy === 'min-spend-asc') {
        return (a.min_spend_numeric || 0) - (b.min_spend_numeric || 0);
      }
      return 0;
    });
  }, [deals, selectedValidity, selectedCategory, search, sortBy]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedValidity('all');
    setSelectedCategory('הכל');
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען קטלוג הטבות מאסטרקארד דיי...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Hero Section with Live Countdown & Calendar Context */}
      <MastercardHero
        totalDeals={deals.length}
        activeTodayCount={activeTodayCount}
        lastUpdated={metadata?.last_updated}
      />

      {/* 2. Search & Sort Controls Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש מותג, הטבה, מוצר או קוד קופון (למשל: Airalo, גולדה, KSP, 20%...)"
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs md:text-sm shadow-2xs transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label="נקה חיפוש"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Select, View Toggle & Count */}
          <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              מוצגות <strong className="font-bold text-slate-900 dark:text-white">{filteredDeals.length}</strong> מתוך {deals.length}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleSetViewMode('grid')}
                title="תצוגת כרטיסים"
                className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-red-600 dark:text-red-400 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">כרטיסים</span>
              </button>

              <button
                onClick={() => handleSetViewMode('table')}
                title="תצוגת טבלה"
                className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-red-600 dark:text-red-400 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">טבלה</span>
              </button>
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2 pl-8 pr-3.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs cursor-pointer"
              >
                <option value="discount-desc">הנחה: מהגבוה לנמוך</option>
                <option value="brand-asc">שם מותג: א-ת</option>
                <option value="min-spend-asc">מינימום קנייה: מהנמוך לגבוה</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Validity Filter Row Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5 pl-1">
            <CalendarCheck className="w-3.5 h-3.5 text-red-500" />
            <span>תוקף:</span>
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {validityFilters.map(vf => {
              const isActive = selectedValidity === vf.id;
              return (
                <button
                  key={vf.id}
                  onClick={() => setSelectedValidity(vf.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-red-600 text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span>{vf.label}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                      isActive
                        ? 'bg-slate-800 dark:bg-red-700 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {vf.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Category Filter Carousel */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => {
              const count = cat === 'הכל'
                ? deals.length
                : deals.filter(d => d.category === cat).length;
              const isActive = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                      isActive
                        ? 'bg-red-700/90 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Deals Display (Grid or Table) */}
      {filteredDeals.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Frown className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            לא נמצאו הטבות תואמות לסינונים שבחרתם
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            נסו לנקות את שורת החיפוש, לבחור קטגוריה אחרת או להציג את כל ההטבות.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>איפוס סינונים</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDeals.map(deal => (
            <MastercardDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <MastercardTableView deals={filteredDeals} />
      )}
    </div>
  );
};
