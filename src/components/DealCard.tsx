import React from 'react';
import { SearchIndexDeal } from '../types/deal';
import { ClubBadge } from './ClubBadge';
import { useToast } from '../context/ToastContext';
import { Copy, Ticket, Check } from 'lucide-react';

interface DealCardProps {
  deal: SearchIndexDeal;
  onSelect: (id: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onSelect }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const club = deal.club || 'behatsdaa';

  const handleCopyCoupon = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deal.cp) return;

    navigator.clipboard.writeText(deal.cp)
      .then(() => {
        setCopied(true);
        showToast(`קוד קופון "${deal.cp}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        showToast('העתקת הקופון נכשלה', 'warning');
      });
  };

  return (
    <div
      onClick={() => onSelect(deal.id)}
      className="group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <ClubBadge clubId={club} size="sm" />

          {deal.d > 0 && (
            <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {deal.d}% הנחה
            </span>
          )}
        </div>

        {/* Deal Title */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
          {deal.name}
        </h3>

        {/* Price / Spend info */}
        {deal.p && (
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              ₪{deal.p}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              מחיר מועדון
            </span>
          </div>
        )}
      </div>

      {/* Footer: Coupon Code Copy or Details */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
        {deal.cp ? (
          <button
            onClick={handleCopyCoupon}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs"
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
                <span>קוד קופון: {deal.cp}</span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-slate-400" />
              <span>הטבה בלעדית</span>
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              לפרטים
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
