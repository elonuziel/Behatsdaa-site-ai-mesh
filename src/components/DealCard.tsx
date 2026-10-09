import React, { useState } from 'react';
import { UnifiedDeal } from '../types/deal';
import { ClubBadge } from './ClubBadge';
import { useToast } from '../context/ToastContext';
import { useFavorites } from '../context/FavoritesContext';
import { Copy, Ticket, Check, Star, Store, ExternalLink } from 'lucide-react';

interface DealCardProps {
  deal: UnifiedDeal;
  onSelect: (id: string) => void;
  onSelectStore?: (slug: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onSelect, onSelectStore }) => {
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const club = deal.club || 'behatsdaa';
  const isFav = isFavorite('deal', String(deal.id));

  const handleCopyCoupon = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deal.coupon_code) return;

    navigator.clipboard.writeText(deal.coupon_code)
      .then(() => {
        setCopied(true);
        showToast(`קוד קופון "${deal.coupon_code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        showToast('העתקת הקופון נכשלה', 'warning');
      });
  };

  const discountText = deal.discount_display || (deal.discount_percent ? `${deal.discount_percent}% הנחה` : null);
  const tag = deal.tag || (deal.tags && deal.tags.length > 0 ? deal.tags[0] : null);

  const hasSavings = deal.price && deal.original_price && deal.original_price > deal.price;
  const savings = hasSavings ? deal.original_price! - deal.price! : 0;

  return (
    <div
      onClick={() => onSelect(deal.id)}
      className="group bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Deal Image Container */}
        <div className="w-full h-44 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative">
          {deal.image && !imgError ? (
            <img
              src={deal.image}
              alt={deal.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
              <Ticket className="w-12 h-12" />
            </div>
          )}

          {/* Top-Right Badges over image */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
            {discountText && (
              <span className="font-bold text-xs px-2.5 py-0.5 rounded-lg bg-amber-500 text-amber-950 shadow-xs font-black">
                {discountText}
              </span>
            )}
            {tag && (
              <span className="font-semibold text-[10px] px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                {tag}
              </span>
            )}
          </div>

          {/* Top-Left Club Badge & Favorite Star */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <ClubBadge clubId={club} size="sm" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite('deal', String(deal.id));
              }}
              title={isFav ? 'הסר ממועדפים' : 'שמור במועדפים'}
              className="p-1 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-amber-500 shadow-2xs backdrop-blur-xs"
            >
              <Star className={`w-3.5 h-3.5 transition-colors ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Supplier & Category */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
            {deal.supplier || 'מועדון צרכנות'}
          </span>
          <span className="text-[11px] truncate max-w-[110px]">
            {deal.category || 'כללי'}
          </span>
        </div>

        {/* Deal Title */}
        <h3 className="deal-title font-bold text-sm text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition" title={deal.title}>
          {deal.title}
        </h3>

        {/* Linked Store Badge */}
        {deal.linked_store && (
          <div
            onClick={(e) => {
              if (onSelectStore && deal.linked_store?.slug) {
                e.stopPropagation();
                onSelectStore(deal.linked_store.slug);
              }
            }}
            className="mb-2.5 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-2 py-1 rounded-lg hover:bg-blue-100 transition"
          >
            <span className="flex items-center gap-1 font-semibold truncate text-[11px]">
              <Store className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="truncate">מכבד כרטיסים (עד {deal.linked_store.max_discount || 15}% הנחה)</span>
            </span>
            <span className="text-[10px] underline shrink-0 mr-1">לרשת</span>
          </div>
        )}
      </div>

      {/* Pricing and Footer */}
      <div>
        {deal.price ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between mb-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                ₪{deal.price}
              </span>
              {deal.original_price && deal.original_price > deal.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₪{deal.original_price}
                </span>
              )}
            </div>

            {hasSavings && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                חיסכון ₪{savings}
              </span>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mb-2.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              הטבה ייעודית לחברי המועדון
            </span>
          </div>
        )}

        {/* Action Button: Coupon Copy or Details */}
        {deal.coupon_code ? (
          <button
            onClick={handleCopyCoupon}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs cursor-pointer"
            title="לחץ להעתקת קוד הקופון"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">הועתק!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>קוד: {deal.coupon_code}</span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              {deal.is_external ? (
                <>
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                  <span>הטבת שותף</span>
                </>
              ) : (
                <>
                  <Ticket className="w-3 h-3 text-slate-400" />
                  <span>שובר דיגיטלי</span>
                </>
              )}
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              פרטים ורכישה ←
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
