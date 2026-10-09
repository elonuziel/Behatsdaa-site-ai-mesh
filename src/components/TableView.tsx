import React from 'react';
import { UnifiedStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { useFavorites } from '../context/FavoritesContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { Star, ShoppingBag, Sparkles, ChevronLeft } from 'lucide-react';

interface TableViewProps {
  stores: UnifiedStore[];
  onSelect: (slug: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ stores, onSelect }) => {
  const { activeClubs } = useClubs();
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">⭐</th>
              <th className="py-3 px-4">רשת / עסק</th>
              <th className="py-3 px-4">קטגוריה</th>
              <th className="py-3 px-4">מועדונים</th>
              <th className="py-3 px-4">הנחה מרבית</th>
              <th className="py-3 px-4">כרטיסים נטענים ופרטים</th>
              <th className="py-3 px-4 text-center">פעולה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {stores.map(store => {
              const clubs = store.clubs || ['behatsdaa'];
              const userClubs = clubs.filter(c => activeClubs.has(c));
              const activeDisc = getStoreActiveDiscount(store, activeClubs);
              const isFav = isFavorite('store', String(store.id));

              const cardsSummary = (store.cards || [])
                .map(c => {
                  if (typeof c === 'string') return c;
                  const d = c.discount || (c.discount_numeric ? `${c.discount_numeric}%` : '');
                  return d ? `${c.card_name}: ${d}` : (c.card_name || '');
                })
                .filter(Boolean)
                .join(' • ');

              return (
                <tr
                  key={store.id}
                  onClick={() => onSelect(store.slug)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                >
                  {/* Favorite Star */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite('store', String(store.id))}
                      className="p-1 rounded-full text-slate-300 dark:text-slate-600 hover:text-amber-500 transition"
                      title={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </td>

                  {/* Logo + Store Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                        {store.logo ? (
                          <img
                            src={store.logo}
                            alt={store.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {store.name}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {store.category || 'כללי'}
                  </td>

                  {/* Clubs */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {userClubs.map(c => (
                        <ClubBadge key={c} clubId={c} size="sm" />
                      ))}
                    </div>
                  </td>

                  {/* Max Discount */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {activeDisc > 0 ? (
                      <span className="inline-flex items-center gap-1 font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        עד {activeDisc}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Cards details */}
                  <td className="py-3 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400" title={cardsSummary}>
                    {cardsSummary || 'בכפוף לתקנון המועדון'}
                  </td>

                  {/* Action button */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:-translate-x-0.5 transition-transform">
                      יועץ תשלום
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
