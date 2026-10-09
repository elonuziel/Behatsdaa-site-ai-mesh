import React, { useEffect, useState } from 'react';
import { UnifiedDeal } from '../types/deal';
import { ClubBadge } from './ClubBadge';
import { useToast } from '../context/ToastContext';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Store,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  Ticket
} from 'lucide-react';

interface DealDetailModalProps {
  id: string | null;
  onClose: () => void;
  onSelectStore?: (slug: string) => void;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  id,
  onClose,
  onSelectStore
}) => {
  const { showToast } = useToast();
  const [deal, setDeal] = useState<UnifiedDeal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setDeal(null);
      return;
    }

    setIsLoading(true);
    fetch(`./data/deals/${encodeURIComponent(id)}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: UnifiedDeal) => {
        setDeal(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load deal detail:', err);
        setIsLoading(false);
      });
  }, [id]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => showToast('שגיאה בהעתקת הקוד', 'warning'));
  };

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">טוען פרטי הטבה...</p>
          </div>
        ) : !deal ? (
          <div className="py-16 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <p>לא נמצאו נתונים עבור הטבה זו</p>
          </div>
        ) : (
          <div>
            {/* Header: Badges & Category */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ClubBadge clubId={deal.club} size="md" />
              {deal.category && (
                <span className="text-xs text-slate-400">{deal.category}</span>
              )}
              {deal.supplier && deal.supplier !== deal.title && (
                <span className="text-xs text-slate-500 font-medium">· {deal.supplier}</span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-snug mb-3">
              {deal.title}
            </h2>

            {/* Price & Savings Display */}
            <div className="flex flex-wrap items-baseline gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              {deal.price ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ₪{deal.price}
                  </span>
                  {deal.original_price && deal.original_price > deal.price && (
                    <span className="text-sm text-slate-400 line-through">
                      ₪{deal.original_price}
                    </span>
                  )}
                </div>
              ) : null}

              {deal.discount_percent > 0 && (
                <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {deal.discount_percent}% הנחה
                </span>
              )}

              {deal.discount_display && !deal.discount_percent && (
                <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {deal.discount_display}
                </span>
              )}
            </div>

            {/* Coupon Code Banner (if available) */}
            {deal.coupon_code && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      קוד קופון למימוש
                    </span>
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      {deal.coupon_code}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyCode(deal.coupon_code!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-semibold text-xs transition shadow-xs"
                >
                  {copiedCode === deal.coupon_code ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Deal Metadata Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 text-xs">
              {(deal.validity || deal.expiration_date) && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>תוקף: {deal.validity || deal.expiration_date}</span>
                </div>
              )}

              {(deal.min_spend_display || deal.min_spend) && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>מינימום קנייה: {deal.min_spend_display || `₪${deal.min_spend}`}</span>
                </div>
              )}

              {deal.locations && (
                <div className="sm:col-span-2 flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>מיקום: {deal.locations}</span>
                </div>
              )}
            </div>

            {/* Description & Terms */}
            {deal.description && (
              <div className="mb-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {deal.description}
              </div>
            )}

            {deal.terms_of_use && deal.terms_of_use !== deal.description && (
              <div className="mb-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-700 dark:text-slate-300">תנאי שימוש: </span>
                {deal.terms_of_use}
              </div>
            )}

            {/* Linked Store Shortcut */}
            {deal.linked_store && onSelectStore && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    רשת <strong>{deal.linked_store.name}</strong> מציעה אפשרויות תשלום והנחות נוספות
                  </span>
                </div>
                <button
                  onClick={() => onSelectStore(deal.linked_store!.slug)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap transition shadow-2xs"
                >
                  יועץ תשלום לרשת
                </button>
              </div>
            )}

            {/* External URL Action Button */}
            {deal.url && (
              <div className="pt-3">
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs md:text-sm transition shadow-md"
                >
                  <span>מעבר לאתר ההטבה / רכישה</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
