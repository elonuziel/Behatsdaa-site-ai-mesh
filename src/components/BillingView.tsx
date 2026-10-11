import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CreditCard, Search, MapPin, ExternalLink, Sparkles, ArrowUp } from 'lucide-react';
import { ViewModeToggle } from './ViewModeToggle';
import { useSearch } from '../context/SearchContext';

interface BillingStoreItem {
  id: string | number;
  name: string;
  discount: number;
  city?: string;
  address?: string;
  full_address?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  detail_url?: string;
}

const TABLE_ROW_HEIGHT = 52;
const GRID_ROW_HEIGHT = 186;
const OVERSCAN = 6;

export const BillingView: React.FC = () => {
  const { viewMode } = useSearch();
  const [stores, setStores] = useState<BillingStoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingQuery, setBillingQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(650);
  const [gridColumns, setGridColumns] = useState(3);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('./data/billing_stores.json')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setStores(data.stores || []);
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load billing stores:', err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update grid columns based on container width
  useEffect(() => {
    const updateDimensions = () => {
      if (!scrollContainerRef.current) return;
      const width = scrollContainerRef.current.clientWidth;
      const height = scrollContainerRef.current.clientHeight || 650;
      setContainerHeight(height);

      if (width < 640) {
        setGridColumns(1);
      } else if (width < 1024) {
        setGridColumns(2);
      } else if (width < 1280) {
        setGridColumns(3);
      } else {
        setGridColumns(4);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Unique cities list sorted by store count
  const cities = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    stores.forEach(s => {
      const c = (s.city || '').trim();
      if (c && c !== '0' && c !== 'online') {
        cityCounts[c] = (cityCounts[c] || 0) + 1;
      }
    });
    return Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [stores]);

  // Filtered stores
  const filteredStores = useMemo(() => {
    let list = stores;
    const q = billingQuery.trim().toLowerCase();

    if (selectedCity !== 'all') {
      list = list.filter(s => (s.city || '').trim() === selectedCity);
    }

    if (q) {
      list = list.filter(s => {
        const name = (s.name || '').toLowerCase();
        const addr = (s.address || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        return name.includes(q) || addr.includes(q) || city.includes(q) || cat.includes(q);
      });
    }

    return list;
  }, [stores, billingQuery, selectedCity]);

  // Reset scroll on filter change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [billingQuery, selectedCity, viewMode]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    setScrollTop(top);
    setShowScrollTopBtn(top > 400);
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Virtualization Calculations
  const totalCount = filteredStores.length;

  // 1. Table Virtualization
  const tableTotalHeight = totalCount * TABLE_ROW_HEIGHT;
  const tableStartIndex = Math.max(0, Math.floor(scrollTop / TABLE_ROW_HEIGHT) - OVERSCAN);
  const tableVisibleCount = Math.ceil(containerHeight / TABLE_ROW_HEIGHT) + 2 * OVERSCAN;
  const tableEndIndex = Math.min(totalCount, tableStartIndex + tableVisibleCount);
  const tableVisibleStores = filteredStores.slice(tableStartIndex, tableEndIndex);
  const tableOffsetY = tableStartIndex * TABLE_ROW_HEIGHT;

  // 2. Grid Virtualization
  const totalGridRows = Math.ceil(totalCount / gridColumns);
  const gridTotalHeight = totalGridRows * GRID_ROW_HEIGHT;
  const gridStartRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_HEIGHT) - OVERSCAN);
  const gridVisibleRowsCount = Math.ceil(containerHeight / GRID_ROW_HEIGHT) + 2 * OVERSCAN;
  const gridEndRow = Math.min(totalGridRows, gridStartRow + gridVisibleRowsCount);

  const gridVisibleStores = useMemo(() => {
    const startIndex = gridStartRow * gridColumns;
    const endIndex = Math.min(totalCount, gridEndRow * gridColumns);
    return {
      items: filteredStores.slice(startIndex, endIndex),
      startIndex
    };
  }, [filteredStores, gridStartRow, gridEndRow, gridColumns, totalCount]);

  const gridOffsetY = gridStartRow * GRID_ROW_HEIGHT;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען 10,000+ עסקים במעמד החיוב...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-transparent p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              הנחות במעמד החיוב (10,000+ בתי עסק ומסעדות)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ההנחה ניתנת אוטומטית בחשבון האשראי של כרטיס המועדון בעת תשלום בקופת בית העסק. גלילה חלקה עם וירטואליזציה מהירה.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            סה"כ {filteredStores.length.toLocaleString()} עסקים
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={billingQuery}
            onChange={e => setBillingQuery(e.target.value)}
            placeholder="חיפוש עסק, כתובת או קטגוריה (מתוך 10,650+ עסקים)..."
            className="w-full pl-3 pr-9 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-purple-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>יישוב:</span>
          </span>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-purple-500 cursor-pointer max-w-[160px]"
          >
            <option value="all">כל היישובים ({stores.length.toLocaleString()})</option>
            {cities.map(c => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>

          <ViewModeToggle />
        </div>
      </div>

      {/* Virtualized Container */}
      <div className="relative">
        {filteredStores.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">לא נמצאו עסקים תואמים</h3>
            <p className="text-xs text-slate-500 mt-1">נסה לשנות את מילות החיפוש או לבחור יישוב אחר</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Virtualized Table */
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="w-full text-right text-xs">
              {/* Sticky Table Header */}
              <div className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 px-4 py-3 select-none">
                <div className="col-span-4 sm:col-span-3">בית עסק / מסעדה</div>
                <div className="col-span-3 sm:col-span-2">הנחה במעמד החיוב</div>
                <div className="col-span-2 hidden sm:block">קטגוריה</div>
                <div className="col-span-3 sm:col-span-3">יישוב וכתובת</div>
                <div className="col-span-2 text-center">פרטים</div>
              </div>

              {/* Scrollable Virtual Body */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="overflow-y-auto max-h-[650px] min-h-[400px] will-change-scroll"
              >
                <div style={{ height: `${tableTotalHeight}px`, position: 'relative' }}>
                  <div
                    style={{
                      transform: `translateY(${tableOffsetY}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0
                    }}
                    className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    {tableVisibleStores.map((store, i) => (
                      <div
                        key={store.id || tableStartIndex + i}
                        style={{ height: `${TABLE_ROW_HEIGHT}px` }}
                        className="grid grid-cols-12 px-4 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition"
                      >
                        <div className="col-span-4 sm:col-span-3 font-bold text-slate-900 dark:text-white truncate pr-1" title={store.name}>
                          {store.name}
                        </div>
                        <div className="col-span-3 sm:col-span-2 whitespace-nowrap">
                          <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            {store.discount}%
                          </span>
                        </div>
                        <div className="col-span-2 hidden sm:block text-slate-500 dark:text-slate-400 truncate">
                          {store.category || 'כללי'}
                        </div>
                        <div className="col-span-3 sm:col-span-3 text-slate-600 dark:text-slate-300 truncate" title={store.full_address || store.city || ''}>
                          {store.full_address || store.city || '—'}
                        </div>
                        <div className="col-span-2 text-center whitespace-nowrap">
                          {store.detail_url ? (
                            <a
                              href={store.detail_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                            >
                              <span>פרטים</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Virtualized Grid */
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto max-h-[700px] min-h-[450px] p-1 will-change-scroll"
          >
            <div style={{ height: `${gridTotalHeight}px`, position: 'relative' }}>
              <div
                style={{
                  transform: `translateY(${gridOffsetY}px)`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0
                }}
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`}
              >
                {gridVisibleStores.items.map((store, i) => (
                  <div
                    key={store.id || gridVisibleStores.startIndex + i}
                    style={{ height: `${GRID_ROW_HEIGHT - 16}px` }}
                    className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-purple-500/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {store.discount}% הנחה באשראי
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                          {store.category || 'כללי'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug mb-1 truncate" title={store.name}>
                        {store.name}
                      </h3>

                      {store.full_address && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{store.full_address}</span>
                        </div>
                      )}

                      {store.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {store.description}
                        </p>
                      )}
                    </div>

                    {store.detail_url ? (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <a
                          href={store.detail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <span>פרטי עסק</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-left">
                        חיוב ישיר בכרטיס
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Scroll To Top Button */}
        {showScrollTopBtn && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-4 right-4 z-20 p-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer"
            title="חזרה לראש הרשימה"
            aria-label="חזרה לראש הרשימה"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
