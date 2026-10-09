import React, { useState } from 'react';
import { UnifiedDeal } from '../types/deal';
import { ClubBadge } from './ClubBadge';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { Star, Tag, Sparkles, Copy, Check, ChevronLeft } from 'lucide-react';

interface DealsTableViewProps {
  deals: UnifiedDeal[];
  onSelectDeal: (id: string) => void;
  onSelectStore?: (slug: string) => void;
}

export const DealsTableView: React.FC<DealsTableViewProps> = ({
  deals,
  onSelectDeal,
  onSelectStore
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, code: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedId(id);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => showToast('העתקת הקופון נכשלה', 'warning'));
  };

  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">⭐</th>
              <th className="py-3 px-4">הטבה / שובר</th>
              <th className="py-3 px-4">ספק / רשת</th>
              <th className="py-3 px-4">מועדון</th>
              <th className="py-3 px-4">קטגוריה</th>
              <th className="py-3 px-4">הנחה / מחיר</th>
              <th className="py-3 px-4">קוד קופון</th>
              <th className="py-3 px-4 text-center">פעולה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {deals.map(deal => {
              const isFav = isFavorite('deal', String(deal.id));
              const isCopied = copiedId === deal.id;
              const couponCode = deal.coupon_code;
              const hasPrice = typeof deal.price === 'number' && deal.price > 0;
              const hasOriginal = typeof deal.original_price === 'number' && deal.original_price > 0;
              const hasDiscount = typeof deal.discount_percent === 'number' && deal.discount_percent > 0;

              return (
                <tr
                  key={deal.id}
                  onClick={() => onSelectDeal(deal.id)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                >
                  {/* Favorite Star */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite('deal', String(deal.id))}
                      className="p-1 rounded-full text-slate-300 dark:text-slate-600 hover:text-amber-500 transition"
                      title={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </td>

                  {/* Thumbnail + Title */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                        {deal.image ? (
                          <img
                            src={deal.image}
                            alt={deal.title}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tag className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition block truncate" title={deal.title}>
                          {deal.title}
                        </span>
                        {deal.locations && (
                          <span className="text-[11px] text-slate-400 truncate block">
                            {deal.locations}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {deal.linked_store && onSelectStore ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStore(deal.linked_store!.slug);
                        }}
                        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {deal.supplier || deal.linked_store.name}
                      </button>
                    ) : (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {deal.supplier || '—'}
                      </span>
                    )}
                  </td>

                  {/* Club Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ClubBadge clubId={deal.club || 'behatsdaa'} size="sm" />
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {deal.category || 'כללי'}
                  </td>

                  {/* Discount / Price */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasDiscount && (
                        <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {deal.discount_percent}% הנחה
                        </span>
                      )}
                      {hasPrice && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₪{deal.price}
                          </span>
                          {hasOriginal && (
                            <span className="text-[11px] text-slate-400 line-through">
                              ₪{deal.original_price}
                            </span>
                          )}
                        </div>
                      )}
                      {!hasDiscount && !hasPrice && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Coupon Code */}
                  <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {couponCode ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs">
                        <span className="font-bold text-slate-800 dark:text-amber-400">{couponCode}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, couponCode, deal.id)}
                          title="העתק קוד קופון"
                          className="p-0.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">ללא קוד</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectDeal(deal.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-500 group-hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                    >
                      <span>פרטים</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
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
