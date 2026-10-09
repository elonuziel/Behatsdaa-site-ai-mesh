import React from 'react';
import { RecommendedStore, RecommendedDeal } from '../../types/chat';
import { ClubBadge } from '../ClubBadge';
import { Store, Tag, CreditCard, ChevronLeft } from 'lucide-react';

interface ChatCardsProps {
  stores?: RecommendedStore[];
  deals?: RecommendedDeal[];
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

export const ChatCards: React.FC<ChatCardsProps> = ({
  stores = [],
  deals = [],
  onSelectStore,
  onSelectDeal,
}) => {
  if (stores.length === 0 && deals.length === 0) return null;

  return (
    <div className="mt-3.5 space-y-3.5">
      {/* Recommended Stores Section */}
      {stores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Store className="w-3.5 h-3.5 text-emerald-500" />
            <span>רשתות מומלצות לפי הפנייה ({stores.length}):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stores.map(store => (
              <div
                key={store.id}
                onClick={() => onSelectStore(store.slug)}
                className="group relative bg-white dark:bg-slate-800/90 rounded-xl p-2.5 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-emerald-500/70 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start gap-2.5">
                  {/* Store Logo / Icon */}
                  <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Store className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Store Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {store.name}
                      </h4>
                      {store.max_discount ? (
                        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                          {store.max_discount}%-
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {store.category || 'כללי'}
                    </p>

                    {/* Clubs Badges */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {(store.clubs || []).map(club => (
                        <ClubBadge key={club} clubId={club as any} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    איך משלמים & סניפים
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Deals Section */}
      {deals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>מבצעים ושוברים מומלצים ({deals.length}):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deals.map(deal => (
              <div
                key={deal.id}
                onClick={() => onSelectDeal(deal.id)}
                className="group bg-white dark:bg-slate-800/90 rounded-xl p-2.5 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-amber-500/70 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start gap-2.5">
                  {/* Deal Image / Icon */}
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/40 dark:border-amber-800/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {deal.image ? (
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Tag className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                        {deal.title}
                      </h4>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {deal.supplier || 'ספק מורשה'}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      {deal.price ? (
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ₪{deal.price}
                        </span>
                      ) : null}

                      {deal.discount_percent ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {deal.discount_percent}% הנחה
                        </span>
                      ) : null}

                      {deal.club && (
                        <ClubBadge clubId={deal.club as any} size="sm" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <span>פרטי שובר ותנאי מימוש</span>
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
