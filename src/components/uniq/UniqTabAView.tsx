import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  ExternalLink,
  Info,
  Building2
} from 'lucide-react';

interface BrandGroup {
  id: string;
  name: string;
  brands: string[];
  category: string;
  discount: string;
  restrictions?: string[];
  badges?: { type: string; text: string }[];
  notes?: string;
  cross_references?: { tab: string; target_id: string; name: string; label: string }[];
}

interface RechargeableData {
  metadata: {
    title: string;
    total_brands: number;
    last_updated: string;
  };
  global_rules: {
    title: string;
    eligible_cards: string;
    minimum_load: string;
    daily_load_cap: string;
    monthly_load_cap: string;
    maximum_card_balance: string;
    daily_spend_cap: string;
    validity: string;
    default_exclusion: string;
    limits_summary: { label: string; value: string }[];
  };
  brands: BrandGroup[];
}

export const UniqTabAView: React.FC = () => {
  const [data, setData] = useState<RechargeableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    let isMounted = true;
    fetch('./data/uniq/rechargeable_benefits.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json: RechargeableData) => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load UNIQ rechargeable data:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.brands.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [data]);

  const filteredBrands = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();

    return data.brands.filter(b => {
      if (selectedCat !== 'all' && b.category !== selectedCat) {
        return false;
      }
      if (!q) return true;

      const inName = b.name.toLowerCase().includes(q);
      const inSubBrands = b.brands && b.brands.some(sb => sb.toLowerCase().includes(q));
      const inCat = b.category && b.category.toLowerCase().includes(q);
      const inNotes = b.notes && b.notes.toLowerCase().includes(q);

      return inName || inSubBrands || inCat || inNotes;
    });
  }, [data, search, selectedCat]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען נתוני כרטיס נטען UNIQ (15% הנחה)...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-slate-500">
        לא ניתן לטעון את נתוני הכרטיס הנטען. נסה שוב מאוחר יותר.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Rules & Limits Summary Box */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-purple-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                    כרטיס נטען 15% הנחה
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-200 border border-purple-300/30 text-xs font-bold">
                    31 קבוצות מותגים
                  </span>
                </div>
                <p className="text-xs md:text-sm text-purple-200/80">
                  {data.global_rules.eligible_cards}
                </p>
              </div>
            </div>

            <a
              href="https://www.max.co.il"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition shadow-lg shadow-purple-950/40 cursor-pointer"
            >
              <span>מעבר לטעינה באתר MAX</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Limits Summary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.global_rules.limits_summary.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col justify-between"
              >
                <span className="text-[11px] text-purple-200 font-medium">
                  {item.label}
                </span>
                <span className="text-lg md:text-xl font-black text-white mt-1">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Exclusions Notice */}
          <div className="flex items-start gap-2.5 text-xs text-purple-200/90 bg-purple-950/50 p-3 rounded-xl border border-purple-800/40">
            <Info className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
            <span>{data.global_rules.default_exclusion}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש קבוצת מותגים או תת-רשת (למשל פוקס, ארי, אמריקן איגל)..."
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

        {/* Counter */}
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          מוצגות <strong className="text-slate-900 dark:text-white">{filteredBrands.length}</strong> מתוך {data.brands.length} רשתות
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
            כל הקטגוריות ({data.brands.length})
          </button>
          {categories.map(cat => {
            const count = data.brands.filter(b => b.category === cat).length;
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map(b => (
          <div
            key={b.id}
            className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Top: Group Name + 15% Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    {b.category || 'קבוצת מותגים'}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug truncate" title={b.name}>
                    {b.name}
                  </h3>
                </div>

                <span className="shrink-0 px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-black">
                  15% הנחה
                </span>
              </div>

              {/* Sub-Brands Tags */}
              {b.brands && b.brands.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-purple-500" />
                    <span>רשתות ותת-מותגים כלולים ({b.brands.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {b.brands.map((sb, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60"
                      >
                        {sb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges / Restrictions */}
              {b.badges && b.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {b.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 font-semibold"
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Restrictions list */}
              {b.restrictions && b.restrictions.length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mb-3">
                  {b.restrictions.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card Footer: Reload CTA */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                טעינה ישירה בכרטיס MAX
              </span>
              <a
                href="https://www.max.co.il"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
              >
                <span>טעינה</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
