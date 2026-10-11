import React from 'react';
import { UnifiedStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { useFavorites } from '../context/FavoritesContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { Star, ShoppingBag } from 'lucide-react';

interface TableViewProps {
  stores: UnifiedStore[];
  onSelect: (slug: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ stores, onSelect }) => {
  const { activeClubs } = useClubs();
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-editorial-ink">
              <th className="py-4 px-4 w-12 text-center">⭐</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted">Business / Chain</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted">Category</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted">Clubs</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted">Max Discount</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted">Details</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-widest text-editorial-ink-muted text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-editorial-ink dark:text-slate-200">
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
                  className="hover:bg-editorial-bg transition cursor-pointer border-b border-editorial-ink-faint group"
                >
                  {/* Favorite Star */}
                  <td className="py-5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite('store', String(store.id))}
                      className="p-1 rounded-full text-slate-300 dark:text-slate-600 hover:text-amber-500 transition"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </td>

                  {/* Logo + Store Name */}
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-editorial-ink-faint bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
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
                      <span className="font-bold text-editorial-ink dark:text-white group-hover:text-editorial-accent transition-colors">
                        {store.name}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-5 px-4 text-editorial-ink-muted dark:text-slate-400 whitespace-nowrap">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-editorial-ink-faint rounded-sm">
                      {store.category || 'General'}
                    </span>
                  </td>

                  {/* Clubs */}
                  <td className="py-5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {userClubs.map(c => (
                        <ClubBadge key={c} clubId={c} size="sm" className="!rounded-none font-mono text-[9px] uppercase" />
                      ))}
                    </div>
                  </td>

                  {/* Max Discount */}
                  <td className="py-5 px-4 whitespace-nowrap">
                    {activeDisc > 0 ? (
                      <span className="font-syne text-xl font-black text-editorial-accent">
                        {activeDisc}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Details */}
                  <td className="py-5 px-4 max-w-xs truncate text-editorial-ink-muted dark:text-slate-400" title={cardsSummary}>
                    {cardsSummary || 'Subject to club terms'}
                  </td>

                  {/* Action button */}
                  <td className="py-5 px-4 text-center whitespace-nowrap">
                    <button className="font-mono text-[10px] uppercase tracking-wider border border-editorial-ink px-3 py-1.5 hover:bg-editorial-ink hover:text-white transition-colors">
                      Advisor
                    </button>
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
