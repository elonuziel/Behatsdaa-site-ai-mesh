import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Search, MapPin, ExternalLink, Sparkles } from 'lucide-react';
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

export const BillingView: React.FC = () => {
  const { viewMode } = useSearch();
  const [stores, setStores] = useState<BillingStoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingQuery, setBillingQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [visibleCount, setVisibleCount] = useState(48);

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

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען 10,000+ עסקים במעמד החיוב...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            ההנחה ניתנת אוטומטית בחשבון האשראי של כרטיס המועדון בעת תשלום בקופת בית העסק.
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
          סה"כ {filteredStores.length.toLocaleString()} עסקים
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={billingQuery}
            onChange={e => setBillingQuery(e.target.value)}
            placeholder="חיפוש עסק, כתובת או קטגוריה..."
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
            <option value="all">כל היישובים ({stores.length})</option>
            {cities.map(c => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>

          <ViewModeToggle />
        </div>
      </div>

      {/* Display: Table or Grid of Billing Stores */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">בית עסק / מסעדה</th>
                  <th className="py-3 px-4">הנחה במעמד החיוב</th>
                  <th className="py-3 px-4">קטגוריה</th>
                  <th className="py-3 px-4">יישוב וכתובת</th>
                  <th className="py-3 px-4 text-center">פרטים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredStores.slice(0, visibleCount).map((store, idx) => (
                  <tr key={store.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {store.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        {store.discount}% הנחה באשראי
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {store.category || 'כללי'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {store.full_address || store.city || '—'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {store.detail_url ? (
                        <a
                          href={store.detail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                        >
                          <span>אתר / פרטים</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStores.slice(0, visibleCount).map((store, idx) => (
            <div
              key={store.id || idx}
              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-purple-500/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {store.discount}% הנחה באשראי
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    {store.category || 'כללי'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug mb-1 truncate" title={store.name}>
                  {store.name}
                </h3>

                {store.full_address && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{store.full_address}</span>
                  </div>
                )}

                {store.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {store.description}
                  </p>
                )}
              </div>

              {store.detail_url && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {filteredStores.length > visibleCount && (
        <div className="text-center pt-4">
          <button
            onClick={() => setVisibleCount(prev => prev + 48)}
            className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:border-purple-500 hover:text-purple-600 transition shadow-xs"
          >
            הצג עוד עסקים (+48)
          </button>
        </div>
      )}
    </div>
  );
};
