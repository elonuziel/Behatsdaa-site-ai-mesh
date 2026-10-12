import React from 'react';
import { UnifiedStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { useFavorites } from '../context/FavoritesContext';
import { useSearch } from '../context/SearchContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { Star, ShoppingBag, ChevronLeft } from 'lucide-react';

interface TableViewProps {
  stores: UnifiedStore[];
  onSelect: (slug: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ stores, onSelect }) => {
  const { activeClubs } = useClubs();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { uiDensity } = useSearch();

  const isClean = uiDensity === 'clean';

  return (
    <div
      className={
        isClean
          ? 'bg-white dark:bg-slate-900 overflow-hidden border-2 border-editorial-ink dark:border-slate-800'
          : 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden'
      }
    >
      <div className="overflow-x-auto">
        <table className={`w-full text-right ${isClean ? 'text-[13px]' : 'text-xs'} border-collapse`}>
          <thead className="sticky top-0 z-10">
            {isClean ? (
              <tr className="border-b-2 border-editorial-ink dark:border-slate-700 bg-editorial-bg dark:bg-slate-850">
                <th className="py-4 px-4 w-12 text-center">⭐</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400">Business / Chain</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400">Category</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400">Clubs</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400">Max Discount</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400">Details</th>
                <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted dark:text-slate-400 text-center">Action</th>
              </tr>
            ) : (
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 w-12 text-center">⭐</th>
                <th className="py-3 px-4">רשת / חנות</th>
                <th className="py-3 px-4">קטגוריה</th>
                <th className="py-3 px-4">מועדונים</th>
                <th className="py-3 px-4">הנחה מרבית</th>
                <th className="py-3 px-4">פירוט הטבות</th>
                <th className="py-3 px-4 text-center">פעולה</th>
              </tr>
            )}
          </thead>
          <tbody className={isClean ? 'text-editorial-ink dark:text-slate-200' : 'text-slate-700 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800'}>
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
                  className={
                    isClean
                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer border-b border-editorial-ink-faint dark:border-slate-800 group'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition cursor-pointer group'
                  }
                >
                  {/* Favorite Star */}
                  <td className={isClean ? 'py-5 px-4 text-center' : 'py-3 px-4 text-center'} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite('store', String(store.id))}
                      className="p-1 rounded-full text-slate-300 dark:text-slate-600 hover:text-amber-500 transition"
                      title={isFav ? 'הסר ממועדפים' : 'שמור במועדפים'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </td>

                  {/* Logo + Store Name */}
                  <td className={isClean ? 'py-5 px-4' : 'py-3 px-4'}>
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          isClean
                            ? 'w-10 h-10 border border-editorial-ink-faint dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shrink-0 flex items-center justify-center overflow-hidden'
                            : 'w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden'
                        }
                      >
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
                      <span
                        className={
                          isClean
                            ? 'font-bold text-editorial-ink dark:text-white group-hover:text-editorial-accent dark:group-hover:text-emerald-400 transition-colors'
                            : 'font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'
                        }
                      >
                        {store.name}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className={isClean ? 'py-5 px-4 text-editorial-ink-muted dark:text-slate-400 whitespace-nowrap' : 'py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap'}>
                    <span
                      className={
                        isClean
                          ? 'font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-editorial-ink-faint dark:border-slate-700 rounded-sm'
                          : 'text-xs text-slate-500 dark:text-slate-400'
                      }
                    >
                      {store.category || 'כללי'}
                    </span>
                  </td>

                  {/* Clubs */}
                  <td className={isClean ? 'py-5 px-4 whitespace-nowrap' : 'py-3 px-4 whitespace-nowrap'}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {userClubs.map(c => (
                        <ClubBadge
                          key={c}
                          clubId={c}
                          size="sm"
                          className={isClean ? '!rounded-none font-mono text-[9px] uppercase' : 'shadow-2xs'}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Max Discount */}
                  <td className={isClean ? 'py-5 px-4 whitespace-nowrap' : 'py-3 px-4 whitespace-nowrap'}>
                    {activeDisc > 0 ? (
                      isClean ? (
                        <span className="font-syne text-xl font-black text-editorial-accent dark:text-emerald-400">
                          {activeDisc}%
                        </span>
                      ) : (
                        <span className="font-black text-xs px-2.5 py-1 rounded-xl bg-emerald-600 text-white shadow-2xs">
                          עד {activeDisc}%
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Details */}
                  <td className={isClean ? 'py-5 px-4 max-w-xs truncate text-editorial-ink-muted dark:text-slate-400' : 'py-3 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400 text-xs'} title={cardsSummary}>
                    {cardsSummary || (isClean ? 'Subject to club terms' : 'בכפוף לתקנון')}
                  </td>

                  {/* Action button */}
                  <td className={isClean ? 'py-5 px-4 text-center whitespace-nowrap' : 'py-3 px-4 text-center whitespace-nowrap'}>
                    {isClean ? (
                      <button className="font-mono text-[10px] uppercase tracking-wider border border-editorial-ink dark:border-slate-700 px-3 py-1.5 hover:bg-editorial-ink hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
                        Advisor
                      </button>
                    ) : (
                      <button className="flex items-center gap-1 mx-auto px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer">
                        <span>יועץ</span>
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
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
