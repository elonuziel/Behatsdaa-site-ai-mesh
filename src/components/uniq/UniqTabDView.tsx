import React, { useState, useEffect, useMemo } from 'react';
import { ViewModeToggle } from '../ViewModeToggle';
import { useSearch } from '../../context/SearchContext';
import {
  CreditCard,
  Search,
  ExternalLink,
  Store,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface UniqBillingStageItem {
  id: string;
  original_id: string;
  name: string;
  category: string;
  categories?: string[];
  discount: string;
  discount_rate?: string;
  restrictions?: string[];
  badges?: { type: string; text: string }[];
  terms?: string;
  logo_url?: string | null;
  tags?: string[];
  direct_url?: string | null;
}

export const UniqTabDView: React.FC = () => {
  const { viewMode } = useSearch();
  const [items, setItems] = useState<UniqBillingStageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    fetch('./data/uniq/scraped_benefits.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setItems(json.billing_stage_discounts || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load UNIQ billing stage discounts:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(b => {
      const cat = b.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(b => {
      if (selectedCat !== 'all' && (b.category || 'כללי') !== selectedCat) {
        return false;
      }
      if (!q) return true;
      const inName = b.name.toLowerCase().includes(q);
      const inTerms = b.terms && b.terms.toLowerCase().includes(q);
      const inCat = b.category && b.category.toLowerCase().includes(q);
      return inName || inTerms || inCat;
    });
  }, [items, search, selectedCat]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען הטבות מעמד החיוב UNIQ (119 בתי עסק)...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-purple-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <CreditCard className="w-6 h-6 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-black">הנחות במעמד החיוב - UNIQ</h2>
            <p className="text-xs text-purple-200">
              ההנחה מתקבלת אוטומטית בדף פירוט חיובי האשראי של כרטיס UNIQ בעת תשלום בקופת העסק
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-purple-200 block">בתי עסק</span>
          <span className="text-xl font-black">{items.length} עסקים</span>
        </div>
      </div>

      {/* Filter & Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש בית עסק במעמד החיוב..."
              className="w-full pl-8 pr-9 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-purple-500 focus:outline-none transition"
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

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          מוצגים <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> מתוך {items.length} בתי עסק
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCat === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            כל העסקים ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCat(cat.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCat === cat.name
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* Display: Table or Grid */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">בית עסק</th>
                  <th className="py-3 px-4">קטגוריה</th>
                  <th className="py-3 px-4">הנחה במעמד החיוב</th>
                  <th className="py-3 px-4">תנאים וסייגים</th>
                  <th className="py-3 px-4 text-center">פרטים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredItems.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                          {b.logo_url && !imgErrors[b.id] ? (
                            <img
                              src={b.logo_url}
                              alt={b.name}
                              loading="lazy"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <Store className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {b.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {b.category || 'כללי'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-black text-xs inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        {b.discount || 'הנחה במעמד החיוב'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-sm text-[11px]">
                      {b.terms || 'ההנחה ניתנת אוטומטית בעת תשלום בכרטיס UNIQ'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {b.direct_url ? (
                        <a
                          href={b.direct_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                        >
                          <span>לאתר</span>
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
          {filteredItems.map(b => {
            const isImgBroken = imgErrors[b.id];
            return (
              <div
                key={b.id}
                className="group bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Logo & Badges Top */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                      {b.logo_url && !isImgBroken ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() => setImgErrors(prev => ({ ...prev, [b.id]: true }))}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-purple-400" />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
                      <span className="font-black text-xs px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs shrink-0">
                        {b.discount || 'הנחה במעמד החיוב'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                        {b.category || 'כללי'}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug mb-2 truncate" title={b.name}>
                    {b.name}
                  </h3>

                  {/* Terms / Description */}
                  {b.terms && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">
                      {b.terms}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>אוטומטי בחשבון</span>
                  </span>

                  {b.direct_url && (
                    <a
                      href={b.direct_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 font-bold"
                    >
                      <span>לאתר</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
