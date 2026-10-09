import React, { useState } from 'react';
import { UnifiedStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { useFavorites } from '../context/FavoritesContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { ChevronLeft, CreditCard, Sparkles, Star, Tag, ShoppingBag } from 'lucide-react';

interface StoreCardProps {
  store: UnifiedStore;
  onSelect: (slug: string) => void;
  onSelectDeal?: (dealId: string) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect, onSelectDeal }) => {
  const { activeClubs } = useClubs();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [imgError, setImgError] = useState(false);

  const clubs = store.clubs || ['behatsdaa'];
  const userAffiliatedClubs = clubs.filter(c => activeClubs.has(c));
  const activeDiscount = getStoreActiveDiscount(store, activeClubs);
  const isFav = isFavorite('store', String(store.id));

  // Extract cards info
  const cardsList = (store.cards || []).slice(0, 3).map(c => {
    if (typeof c === 'string') return { name: c, discount: '' };
    return {
      name: c.card_name || 'כרטיס מועדון',
      discount: c.discount || (c.discount_numeric ? `${c.discount_numeric}%` : '')
    };
  });

  const extraCardsCount = (store.cards || []).length > 3 ? (store.cards || []).length - 3 : 0;
  const isGold = activeDiscount >= 25;

  return (
    <div
      onClick={() => onSelect(store.slug)}
      className="group relative bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header: Favorite Button, Logo, Badges */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Logo container */}
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            {store.logo && !imgError ? (
              <img
                src={store.logo}
                alt={store.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl">
                <ShoppingBag className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Right badges: Clubs & Discount */}
          <div className="flex flex-col items-end gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {userAffiliatedClubs.map(clubId => (
                <ClubBadge key={clubId} clubId={clubId} size="sm" />
              ))}

              {activeDiscount > 0 && (
                <span
                  className={`inline-flex items-center gap-1 font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs shrink-0 ${
                    isGold
                      ? 'bg-amber-400 text-amber-950 font-black'
                      : 'bg-emerald-600 text-white font-bold'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  עד {activeDiscount}% הנחה
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
              {store.category || 'כללי'}
            </span>
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite('store', String(store.id));
            }}
            title={isFav ? 'הסר ממועדפים' : 'שמור במועדפים'}
            className="p-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition shadow-2xs -mr-1"
          >
            <Star className={`w-4 h-4 transition-colors ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Store Name */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" title={store.name}>
          {store.name}
        </h3>

        {/* Cards Breakdown List */}
        {cardsList.length > 0 && (
          <div className="mt-3 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {cardsList.map((card, idx) => {
              const is20 = card.discount.includes('20') || card.name.includes('20%') || card.name.includes('זהב');
              const is15 = card.discount.includes('15') || card.name.includes('15%') || card.name.includes('כסף');
              const isWallet = card.name.includes('ארנק') || card.name.toLowerCase().includes('wallet');
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                    {is20 ? (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 shrink-0">
                        זהב 20%
                      </span>
                    ) : is15 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                        כסף 15%
                      </span>
                    ) : isWallet ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 shrink-0">
                        ארנק
                      </span>
                    ) : null}
                    <span className="text-slate-600 dark:text-slate-300 truncate">
                      {card.name}
                    </span>
                  </div>
                  {card.discount && (
                    <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                      {card.discount}
                    </span>
                  )}
                </div>
              );
            })}
            {extraCardsCount > 0 && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                + עוד {extraCardsCount} כרטיסים
              </div>
            )}
            {clubs.includes('behatsdaa') && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 mt-1">
                <span>תקרת טעינה: עד 3,000 ₪ בחודש</span>
                <span>מינ׳ 100 ₪</span>
              </div>
            )}
          </div>
        )}

        {/* Linked Deals Banner */}
        {store.linked_deals && store.linked_deals.length > 0 && (
          <div
            onClick={(e) => {
              if (onSelectDeal && store.linked_deals?.[0]?.id) {
                e.stopPropagation();
                onSelectDeal(String(store.linked_deals[0].id));
              }
            }}
            className="mt-2.5 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100/80 transition"
          >
            <span className="flex items-center gap-1 font-semibold truncate">
              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">שובר/מבצע פעיל ({store.linked_deals.length})</span>
            </span>
            <span className="text-[11px] underline shrink-0 mr-1">הצג</span>
          </div>
        )}

        {/* Linked Billing Discount Banner */}
        {store.linked_billing && (
          <div className="mt-1.5 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 px-2.5 py-1.5 rounded-xl">
            <span className="flex items-center gap-1 font-semibold truncate">
              <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">הנחה במעמד החיוב ({store.linked_billing.discount}% באשראי)</span>
            </span>
          </div>
        )}
      </div>

      {/* Footer: Best Payment Advisor Link */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>יועץ מסלול תשלום</span>
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 group-hover:-translate-x-1 transition-transform">
          השוואת מסלולים
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
