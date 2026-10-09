import React from 'react';
import { SearchIndexStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { Store, ChevronLeft, CreditCard, Sparkles } from 'lucide-react';

interface StoreCardProps {
  store: SearchIndexStore;
  onSelect: (slug: string) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect }) => {
  const { activeClubs } = useClubs();

  const clubs = store.clubs || ['behatsdaa'];
  const userAffiliatedClubs = clubs.filter(c => activeClubs.has(c));
  const activeDiscount = getStoreActiveDiscount(store, activeClubs);

  return (
    <div
      onClick={() => onSelect(store.slug)}
      className="group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Header: Badges & Max Discount */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {userAffiliatedClubs.map(clubId => (
              <ClubBadge key={clubId} clubId={clubId} size="sm" />
            ))}
          </div>

          {activeDiscount > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              עד {activeDiscount}% הנחה
            </span>
          )}
        </div>

        {/* Store Name */}
        <div className="flex items-center gap-2.5 mt-1">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600 transition">
            <Store className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {store.name}
          </h3>
        </div>
      </div>

      {/* Footer: Strategy Prompt */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>יועץ מסלול תשלום משתלם</span>
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center group-hover:-translate-x-1 transition-transform">
          פירוט
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
