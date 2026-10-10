import React, { useState } from 'react';
import { UnifiedStore } from '../types/store';
import { ClubBadge } from './ClubBadge';
import { useClubs } from '../context/ClubContext';
import { useFavorites } from '../context/FavoritesContext';
import { useSearch } from '../context/SearchContext';
import { getStoreActiveDiscount } from '../hooks/useMiniSearch';
import { ChevronLeft, ChevronDown, CreditCard, Sparkles, Star, Tag, ShoppingBag } from 'lucide-react';


export function getCardBadge(name: string, discount: string) {
  const is20 = discount.includes("20") || name.includes("20%");
  const is15 = discount.includes("15") || name.includes("15%");
  const is10 = discount.includes("10") || name.includes("10%");
  const is7 = discount.includes("7") || name.includes("7%");
  const isFighter = name.includes("פייטר");
  const isRestaurants = name.includes("מסעדות");
  const isCarrefour = name.includes("קרפור");

  if (is20 && isRestaurants) return { label: "מסעדות 20%", bg: "bg-rose-500 text-white" };
  if (is20) return { label: "רשתות 20%", bg: "bg-emerald-600 text-white font-bold" };
  if (is15 && isFighter) return { label: "פייטר 15%", bg: "bg-amber-500 text-amber-950 font-black" };
  if (is15) return { label: "רשתות 15%", bg: "bg-indigo-600 text-white font-bold" };
  if (is10 || isCarrefour) return { label: "קרפור 10%", bg: "bg-blue-600 text-white" };
  if (is7) return { label: "מזון 7%", bg: "bg-teal-600 text-white" };

  return { label: name || "כרטיס מועדון", bg: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200" };
}

interface StoreCardProps {
  store: UnifiedStore;
  onSelect: (slug: string) => void;
  onSelectDeal?: (dealId: string) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect, onSelectDeal }) => {
  const { activeClubs } = useClubs();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { uiDensity } = useSearch();
  const [imgError, setImgError] = useState(false);
  const [showDetailsLocally, setShowDetailsLocally] = useState(false);

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
  const showFullDetails = uiDensity === 'detailed' || showDetailsLocally;

  return (
    <div
      onClick={() => onSelect(store.slug)}
      className="group relative bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header: Favorite Button, Logo, Badges */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* Logo container */}
          <div className="w-13 h-13 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-100 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
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

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">
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

        {/* Clean Mode Highlights or Full Breakdown List */}
        {!showFullDetails ? (
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="truncate flex items-center gap-1.5 text-[11px]">
              {cardsList.length > 0 && (
                <span>
                  {cardsList[0].name} {cardsList[0].discount && `(${cardsList[0].discount})`}
                </span>
              )}
              {store.linked_billing && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {store.linked_billing.discount}% באשראי
                  </span>
                </>
              )}
              {store.linked_deals && store.linked_deals.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {store.linked_deals.length} שוברים
                  </span>
                </>
              )}
            </div>

            {cardsList.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsLocally(true);
                }}
                className="text-[10px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0 flex items-center gap-0.5 cursor-pointer"
                title="הצג פירוט כרטיסים"
              >
                <span>עוד</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          /* Detailed Mode Breakdown List */
          <div className="mt-3 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in-50 duration-150">
            {cardsList.map((card, idx) => {
              const badge = getCardBadge(card.name, card.discount);
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 truncate font-medium text-[11px]">
                      {card.name}
                    </span>
                  </div>
                  {card.discount && (
                    <span className="font-black text-slate-900 dark:text-white shrink-0 text-xs">
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

            {/* Linked Deals Banner */}
            {store.linked_deals && store.linked_deals.length > 0 && (
              <div
                onClick={(e) => {
                  if (onSelectDeal && store.linked_deals?.[0]?.id) {
                    e.stopPropagation();
                    onSelectDeal(String(store.linked_deals[0].id));
                  }
                }}
                className="mt-2 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2 py-1 rounded-lg hover:bg-emerald-100/80 transition"
              >
                <span className="flex items-center gap-1 font-semibold truncate text-[11px]">
                  <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">שובר/מבצע פעיל ({store.linked_deals.length})</span>
                </span>
                <span className="text-[10px] underline shrink-0 mr-1">הצג</span>
              </div>
            )}

            {/* Linked Billing Discount Banner */}
            {store.linked_billing && (
              <div className="mt-1 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 px-2 py-1 rounded-lg">
                <span className="flex items-center gap-1 font-semibold truncate text-[11px]">
                  <CreditCard className="w-3 h-3 text-purple-600 shrink-0" />
                  <span className="truncate">הנחה במעמד החיוב ({store.linked_billing.discount}% באשראי)</span>
                </span>
              </div>
            )}

            {uiDensity === 'clean' && showDetailsLocally && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailsLocally(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  הסתר פירוט ▲
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Best Payment Advisor Link */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 text-[11px]">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>יועץ מסלול תשלום</span>
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 group-hover:-translate-x-1 transition-transform text-[11px]">
          השוואת מסלולים
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
