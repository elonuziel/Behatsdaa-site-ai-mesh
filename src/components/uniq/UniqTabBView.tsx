import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Search,
  ExternalLink,
  Ticket
} from 'lucide-react';

interface UniqItemDeal {
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
}

export const UniqTabBView: React.FC = () => {
  const [deals, setDeals] = useState<UniqItemDeal[]>([]);
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
          setDeals(json.item_deals || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load UNIQ item deals:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    const q = search.trim().toLowerCase();
    return deals.filter(d => {
      if (selectedCat !== 'all' && (d.category || 'כללי') !== selectedCat) {
        return false;
      }
      if (!q) return true;
      const inName = d.name.toLowerCase().includes(q);
      const inTerms = d.terms && d.terms.toLowerCase().includes(q);
      const inCat = d.category && d.category.toLowerCase().includes(q);
      return inName || inTerms || inCat;
    });
  }, [deals, search, selectedCat]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען שוברים והטבות UNIQ (97 הטבות)...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-950 text-white rounded-3xl p-6 shadow-md border border-purple-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Gift className="w-6 h-6 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-black">שוברים והטבות בלעדיות - UNIQ</h2>
            <p className="text-xs text-purple-200">
              שוברים מסובסדים, אטרקציות, הופעות, ומוצרי צריכה בהנחה בלעדית לאקדמאים
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-purple-200 block">סה"כ הטבות</span>
          <span className="text-xl font-black">{deals.length} שוברים</span>
        </div>
      </div>

      {/* Filter & Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש שובר, אטרקציה, מוצר או ספק..."
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
          מוצגים <strong className="text-slate-900 dark:text-white">{filteredDeals.length}</strong> מתוך {deals.length} שוברים
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
            כל השוברים ({deals.length})
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

      {/* Grid of Deals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDeals.map(d => {
          const hasSavings = d.price && d.original_price && d.original_price > d.price;
          const savings = hasSavings ? d.original_price! - d.price! : 0;
          const isImgBroken = imgErrors[d.id];

          return (
            <div
              key={d.id}
              className="group bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Product Image */}
                <div className="w-full h-44 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                  {d.image_url && !isImgBroken ? (
                    <img
                      src={d.image_url}
                      alt={d.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors(prev => ({ ...prev, [d.id]: true }))}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-300 dark:text-purple-600">
                      <Ticket className="w-12 h-12" />
                    </div>
                  )}

                  {/* Top-Right Discount Badge */}
                  {d.discount && (
                    <span className="absolute top-2 right-2 font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-600 text-white shadow-xs">
                      {d.discount.split('(')[0].trim()}
                    </span>
                  )}

                  {/* Club Tag */}
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    UNIQ
                  </span>
                </div>

                {/* Category */}
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block mb-1">
                  {d.category || 'שוברים'}
                </span>

                {/* Title */}
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" title={d.name}>
                  {d.name}
                </h3>

                {/* Terms Snippet */}
                {d.terms && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {d.terms}
                  </p>
                )}
              </div>

              {/* Pricing & CTA */}
              <div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between mb-2.5">
                  <div className="flex items-baseline gap-1.5">
                    {d.price ? (
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        ₪{d.price}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        הטבה בלעדית
                      </span>
                    )}

                    {d.original_price && d.original_price > (d.price || 0) && (
                      <span className="text-xs text-slate-400 line-through">
                        ₪{d.original_price}
                      </span>
                    )}
                  </div>

                  {hasSavings && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      חיסכון ₪{savings}
                    </span>
                  )}
                </div>

                {d.direct_url ? (
                  <a
                    href={d.direct_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition cursor-pointer"
                  >
                    <span>פרטים ורכישה ב-UNIQ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="text-center text-xs text-purple-600 dark:text-purple-400 font-bold py-1">
                    למימוש באתר UNIQ
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
