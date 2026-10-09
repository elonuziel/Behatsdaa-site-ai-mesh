import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';

interface MastercardDeal {
  id: string;
  brand: string;
  title: string;
  discount: string;
  discount_numeric?: number;
  discount_type?: string;
  ongoing_discount?: string;
  min_spend?: string;
  min_spend_numeric?: number;
  coupon?: string;
  url?: string;
  image?: string;
  category?: string;
  validity?: string;
  validity_code?: string;
  terms_bullets?: string[];
  description?: string;
}

export const MastercardDealsView: React.FC = () => {
  const { showToast } = useToast();
  const [deals, setDeals] = useState<MastercardDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    fetch('./data/mastercard/deals.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setDeals(json.deals || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load Mastercard Day deals:', err);
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
      const inBrand = d.brand.toLowerCase().includes(q);
      const inTitle = d.title.toLowerCase().includes(q);
      const inDesc = d.description && d.description.toLowerCase().includes(q);
      const inCat = d.category && d.category.toLowerCase().includes(q);
      return inBrand || inTitle || inDesc || inCat;
    });
  }, [deals, search, selectedCat]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => {
        showToast('העתקת הקופון נכשלה', 'warning');
      });
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען מבצעי Mastercard Day (44 הטבות)...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 text-white rounded-3xl p-6 shadow-md border border-amber-500/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black">כל הטבות Mastercard Day</h2>
            <p className="text-xs text-amber-100">
              הנחות ענק, קופונים ייחודיים ומבצעי 1-Click בכל 10 לחודש למחזיקי כרטיס מאסטרקארד
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-amber-100 block">סה"כ הטבות</span>
          <span className="text-xl font-black">{deals.length} מבצעים</span>
        </div>
      </div>

      {/* Filter & Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש מותג, הטבה או מוצר (למשל מקדונלד'ס, עולם הקולנוע)..."
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

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          מוצגים <strong className="text-slate-900 dark:text-white">{filteredDeals.length}</strong> מתוך {deals.length} מבצעים
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCat === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            כל המבצעים ({deals.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCat(cat.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCat === cat.name
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* Grid of Mastercard Deals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDeals.map(d => {
          const isImgBroken = imgErrors[d.id];
          const coupon = d.coupon || 'MASTERCARDAY';
          const isCopied = copiedCode === coupon;

          return (
            <div
              key={d.id}
              className="group bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Brand Graphic / Image */}
                <div className="w-full h-44 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                  {d.image && !isImgBroken ? (
                    <img
                      src={d.image}
                      alt={d.brand}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors(prev => ({ ...prev, [d.id]: true }))}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300 dark:text-amber-600">
                      <ShoppingBag className="w-12 h-12" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  {d.discount && (
                    <span className="absolute top-2 right-2 font-black text-xs px-2.5 py-0.5 rounded-lg bg-amber-500 text-amber-950 shadow-xs">
                      {d.discount}
                    </span>
                  )}

                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Mastercard Day
                  </span>
                </div>

                {/* Brand & Category */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {d.brand}
                  </span>
                  <span className="text-[11px] truncate">
                    {d.category || 'כללי'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition" title={d.title}>
                  {d.title}
                </h3>

                {/* Terms Bullets */}
                {d.terms_bullets && d.terms_bullets.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mb-3">
                    {d.terms_bullets.slice(0, 2).map((b, idx) => (
                      <div key={idx} className="truncate">
                        {b}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons: 1-Click Copy and Redeem URL */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCopyCode(coupon)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs cursor-pointer"
                  title="לחץ להעתקת קוד הקופון"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-300">הועתק ללוח!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>קוד: {coupon}</span>
                    </>
                  )}
                </button>

                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-semibold"
                  >
                    <span>מימוש באתר הרשת</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
