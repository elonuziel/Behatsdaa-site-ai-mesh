import React, { useState, useMemo } from 'react';
import { UnifiedStore } from '../../types/store';
import { normalizeHebrew } from '../../hooks/useMiniSearch';
import {
  Scale,
  Crown,
  Search,
  ChevronLeft
} from 'lucide-react';

interface MegaComparisonViewProps {
  stores: UnifiedStore[];
  onSelectStore: (slug: string) => void;
}

export const MegaComparisonView: React.FC<MegaComparisonViewProps> = ({ stores, onSelectStore }) => {
  const [search, setSearch] = useState('');
  const [selectedQuickBrand, setSelectedQuickBrand] = useState<string>('כל המותגים המשותפים');

  // Prominent national brands that appear across clubs
  const QUICK_BRANDS = [
    'כל המותגים המשותפים',
    'פוקס',
    'גולף',
    'מקדונלדס',
    'טרמינל איקס',
    'סופר פארם',
    'דומינוס',
    'קרביץ',
    'סטימצקי',
    'מגה ספורט',
    'פוט לוקר',
    'שילב',
    'אדידס',
    'גולדה',
    'המשביר לצרכן'
  ];

  // Stores that have benefits in 2 or more clubs or are high-profile national brands
  const multiClubStores = useMemo(() => {
    return stores.filter(s => {
      const clubsCount = (s.clubs || []).length;
      return clubsCount > 1;
    });
  }, [stores]);

  const filteredStores = useMemo(() => {
    let list = multiClubStores;

    if (selectedQuickBrand !== 'כל המותגים המשותפים') {
      const bNorm = normalizeHebrew(selectedQuickBrand);
      list = multiClubStores.filter(s => {
        const sNorm = normalizeHebrew(s.name);
        if (bNorm === normalizeHebrew('סופר פארם')) {
          return sNorm.includes(normalizeHebrew('סופר פארם')) || sNorm.includes('פארמ');
        }
        if (bNorm === normalizeHebrew('מקדונלדס')) {
          return sNorm.includes('מקדונלד');
        }
        if (bNorm === normalizeHebrew('טרמינל איקס')) {
          return sNorm.includes('terminal') || sNorm.includes('טרמינל');
        }
        if (bNorm === normalizeHebrew('דומינוס')) {
          return sNorm.includes('דומינו');
        }
        return sNorm.includes(bNorm);
      });
    }

    if (search.trim()) {
      const qNorm = normalizeHebrew(search.trim());
      list = stores.filter(s => {
        const nameNorm = normalizeHebrew(s.name);
        const catNorm = s.category ? normalizeHebrew(s.category) : '';
        return nameNorm.includes(qNorm) || catNorm.includes(qNorm);
      });
    }

    return list;
  }, [multiClubStores, stores, selectedQuickBrand, search]);

  // Extract per-club discount details
  const getClubOffer = (store: UnifiedStore, clubId: 'behatsdaa' | 'uniq' | 'mastercard') => {
    const opts = (store.payment_options || []).filter(o => o.club === clubId);
    if (opts.length === 0) {
      if ((store.clubs || []).includes(clubId)) {
        return {
          hasOffer: true,
          rate: store.max_discount || 0,
          label: `הנחת מועדון עד ${store.max_discount}%`,
          desc: 'הטבה ייעודית לחברי המועדון'
        };
      }
      return { hasOffer: false, rate: 0, label: 'אין הטבה פעילה', desc: '-' };
    }

    let bestOpt = opts[0];
    for (const opt of opts) {
      if (opt.rateType === 'percent' && opt.rate > (bestOpt.rate || 0)) {
        bestOpt = opt;
      }
    }

    return {
      hasOffer: true,
      rate: bestOpt.rate || 0,
      label: bestOpt.label,
      desc: bestOpt.description
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-black">
              מטריצת השוואת מועדונים (Best Payment Advisor Matrix)
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            השוואה ראש בראש של רשתות מובילות: <strong>בהצדעה</strong> מול <strong>UNIQ</strong> מול <strong>Mastercard Day</strong>.
            גלו בדיוק איזה כרטיס מעניק לכם את ההנחה המקסימלית בכל קנייה.
          </p>
        </div>
      </div>

      {/* Quick Brand Pills & Search */}
      <div className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
        {/* Quick Brand Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_BRANDS.map(brand => (
            <button
              key={brand}
              onClick={() => {
                setSelectedQuickBrand(brand);
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedQuickBrand === brand && !search
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש כל רשת במטריצת ההשוואה..."
            className="w-full pl-8 pr-9 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
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
      </div>

      {/* Comparison Cards Grid */}
      <div className="space-y-4">
        {filteredStores.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-slate-500">
            לא נמצאו רשתות תואמות לחיפוש זה.
          </div>
        ) : (
          filteredStores.map(store => {
            const behOffer = getClubOffer(store, 'behatsdaa');
            const uniqOffer = getClubOffer(store, 'uniq');
            const mcOffer = getClubOffer(store, 'mastercard');

            // Find winning rate
            const maxRate = Math.max(behOffer.rate, uniqOffer.rate, mcOffer.rate);

            return (
              <div
                key={store.id}
                className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all"
              >
                {/* Store Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt={store.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="font-black text-sm text-slate-400">
                          {store.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                        {store.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {store.category || 'כללי'}
                      </span>
                    </div>
                  </div>

                  {/* Best rate pill */}
                  <div className="flex items-center gap-2">
                    {maxRate > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs shadow-xs">
                        <Crown className="w-4 h-4 fill-amber-950" />
                        <span>הנחה מרבית: {maxRate}%</span>
                      </span>
                    )}

                    <button
                      onClick={() => onSelectStore(store.slug)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                    >
                      <span>פירוט מלא</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3-Club Columns Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* בהצדעה Column */}
                  <div className={`rounded-xl p-3.5 border transition ${
                    behOffer.hasOffer && behOffer.rate === maxRate && maxRate > 0
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/50'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎖️</span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          בהצדעה
                        </span>
                      </div>
                      {behOffer.hasOffer && behOffer.rate === maxRate && maxRate > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                          <Crown className="w-3 h-3 fill-white" />
                          <span>מנצח!</span>
                        </span>
                      )}
                    </div>
                    {behOffer.hasOffer ? (
                      <div>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
                          {behOffer.rate > 0 ? `${behOffer.rate}%` : 'הטבה פעילה'}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                          {behOffer.label}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">אין הטבה במועדון זה</span>
                    )}
                  </div>

                  {/* UNIQ Column */}
                  <div className={`rounded-xl p-3.5 border transition ${
                    uniqOffer.hasOffer && uniqOffer.rate === maxRate && maxRate > 0
                      ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 ring-1 ring-purple-400/50'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎓</span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          UNIQ
                        </span>
                      </div>
                      {uniqOffer.hasOffer && uniqOffer.rate === maxRate && maxRate > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-600 text-white flex items-center gap-1">
                          <Crown className="w-3 h-3 fill-white" />
                          <span>מנצח!</span>
                        </span>
                      )}
                    </div>
                    {uniqOffer.hasOffer ? (
                      <div>
                        <span className="text-lg font-black text-purple-600 dark:text-purple-400 block">
                          {uniqOffer.rate > 0 ? `${uniqOffer.rate}%` : 'הטבה פעילה'}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                          {uniqOffer.label}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">אין הטבה במועדון זה</span>
                    )}
                  </div>

                  {/* Mastercard Day Column */}
                  <div className={`rounded-xl p-3.5 border transition ${
                    mcOffer.hasOffer && mcOffer.rate === maxRate && maxRate > 0
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-1 ring-amber-400/50'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">💳</span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          Mastercard Day
                        </span>
                      </div>
                      {mcOffer.hasOffer && mcOffer.rate === maxRate && maxRate > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-1">
                          <Crown className="w-3 h-3 fill-white" />
                          <span>מנצח!</span>
                        </span>
                      )}
                    </div>
                    {mcOffer.hasOffer ? (
                      <div>
                        <span className="text-lg font-black text-amber-600 dark:text-amber-400 block">
                          {mcOffer.rate > 0 ? `${mcOffer.rate}%` : 'קופון פעיל'}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                          {mcOffer.label}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">אין הטבה במועדון זה</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
