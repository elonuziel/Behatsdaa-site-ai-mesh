import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Search,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';

interface UniqBrandDiscount {
  id: string;
  original_id: string;
  name: string;
  category: string;
  categories?: string[];
  price?: number | null;
  original_price?: number | null;
  discount: string;
  restrictions?: string[];
  badges?: { type: string; text: string }[];
  terms?: string;
  image_url?: string | null;
  tags?: string[];
  direct_url?: string | null;
  cross_references?: any[];
}

export const UniqTabCView: React.FC = () => {
  const [brands, setBrands] = useState<UniqBrandDiscount[]>([]);
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
          setBrands(json.brand_discounts || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load UNIQ brand discounts:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    brands.forEach(b => {
      const cat = b.category || 'כללי';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter(b => {
      if (selectedCat !== 'all' && (b.category || 'כללי') !== selectedCat) {
        return false;
      }
      if (!q) return true;
      const inName = b.name.toLowerCase().includes(q);
      const inTerms = b.terms && b.terms.toLowerCase().includes(q);
      const inCat = b.category && b.category.toLowerCase().includes(q);
      return inName || inTerms || inCat;
    });
  }, [brands, search, selectedCat]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען הנחות מותגים ורשתות UNIQ (110 רשתות)...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-purple-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Tag className="w-6 h-6 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-black">הנחות מותגים ורשתות - UNIQ</h2>
            <p className="text-xs text-purple-200">
              הנחות קבועות, קופונים והטבות אתר ברשתות מובילות לחברי מועדון UNIQ
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-purple-200 block">רשתות ומותגים</span>
          <span className="text-xl font-black">{brands.length} מותגים</span>
        </div>
      </div>

      {/* Filter & Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש מותג או רשת (למשל סנו, קרביץ, מגה ספורט)..."
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

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          מוצגים <strong className="text-slate-900 dark:text-white">{filteredBrands.length}</strong> מתוך {brands.length} מותגים
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
            כל המותגים ({brands.length})
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

      {/* Grid of Brand Discounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBrands.map(b => {
          const isImgBroken = imgErrors[b.id];
          return (
            <div
              key={b.id}
              className="group bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Brand Image Container */}
                <div className="w-full h-40 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                  {b.image_url && !isImgBroken ? (
                    <img
                      src={b.image_url}
                      alt={b.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors(prev => ({ ...prev, [b.id]: true }))}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-300 dark:text-purple-600">
                      <ShoppingBag className="w-12 h-12" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  {b.discount && (
                    <span className="absolute top-2 right-2 font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-600 text-white shadow-xs">
                      {b.discount.split('(')[0].trim()}
                    </span>
                  )}

                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    UNIQ
                  </span>
                </div>

                {/* Category */}
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block mb-1">
                  {b.category || 'הנחות מותגים'}
                </span>

                {/* Name */}
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" title={b.name}>
                  {b.name}
                </h3>

                {/* Terms */}
                {b.terms && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {b.terms}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {b.direct_url ? (
                  <a
                    href={b.direct_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition cursor-pointer"
                  >
                    <span>קבלת ההטבה באתר UNIQ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="text-center text-xs text-purple-600 dark:text-purple-400 font-bold py-1">
                    הטבה בלעדית לחברי מועדון
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
