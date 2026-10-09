import React from 'react';
import { RecommendedStore, RecommendedDeal, RecommendedBilling } from '../../types/chat';
import { ClubBadge } from '../ClubBadge';
import { Store, Tag, CreditCard, ChevronLeft, MapPin, Building2, ExternalLink } from 'lucide-react';

interface ChatCardsProps {
  stores?: RecommendedStore[];
  deals?: RecommendedDeal[];
  billing?: RecommendedBilling[];
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

export const ChatCards: React.FC<ChatCardsProps> = ({
  stores = [],
  deals = [],
  billing = [],
  onSelectStore,
  onSelectDeal,
}) => {
  if (stores.length === 0 && deals.length === 0 && billing.length === 0) return null;

  return (
    <div className="mt-3.5 space-y-4">
      {/* 1. TOP SECTION: Primary Recommended Stores & Service Providers */}
      {stores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-500" />
              <span>רשתות וספקים מומלצים ({stores.length}):</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              מובילי הקטגוריה
            </span>
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

      {/* 2. DIRECT CREDIT BILLING STORES: Kept at top alongside partner stores */}
      {billing.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>עסקים וסניפים בהנחה במעמד החיוב באשראי ({billing.length}):</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              הנחה ישירה בחשבון
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {billing.map(store => (
              <div
                key={store.id}
                className="group bg-white dark:bg-slate-800/90 rounded-xl p-2.5 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-blue-500/70 transition flex flex-col justify-between"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-800/40 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-full h-full object-contain p-0.5 rounded-lg"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {store.name}
                      </h4>
                      <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/40">
                        {store.discount}% בהצדעה
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {store.category || 'כללי'}
                    </p>

                    {(store.city || store.address || store.full_address) && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{store.full_address || `${store.address || ''} ${store.city || ''}`}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-medium text-blue-600 dark:text-blue-400">
                  <span>הנחה ישירה בחשבון האשראי</span>
                  {store.detail_url && (
                    <a
                      href={store.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <span>פרטי בית עסק</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SEPARATED LOWER SECTION: Deals, Vouchers & Complementary Benefits */}
      {deals.length > 0 && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>מבצעים, שוברים והטבות משלימות ({deals.length}):</span>
            </div>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              קופונים ושוברים מוזלים
            </span>
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
