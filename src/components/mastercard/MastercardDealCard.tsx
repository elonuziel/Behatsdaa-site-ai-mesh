import React, { useState } from 'react';
import { MastercardDeal, getDealValidityStatus } from '../../utils/mastercardValidity';
import { useToast } from '../../context/ToastContext';
import {
  Percent,
  Share2,
  Ticket,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  CheckSquare,
  Sparkles
} from 'lucide-react';

interface MastercardDealCardProps {
  deal: MastercardDeal;
}

export const MastercardDealCard: React.FC<MastercardDealCardProps> = ({ deal }) => {
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const validityInfo = getDealValidityStatus(deal);
  const couponCode = deal.coupon || 'MASTERCARDAY';
  const directUrl = deal.url || 'https://www.mastercard.com/il/he/%D7%90%D7%99%D7%A9%D7%99/find-a-card/card-benefits/mastercard-day.html';
  const hasImage = Boolean(deal.image && !deal.image.includes('sep.png') && !deal.image.includes('.svg') && !imgError);

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(couponCode)
      .then(() => {
        setCopiedCode(true);
        showToast(`קוד קופון "${couponCode}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCode(false), 2000);
      })
      .catch(() => {
        showToast('העתקת הקופון נכשלה', 'warning');
      });
  };

  const handleShare = () => {
    const textToShare = `${deal.brand} - ${deal.discount} במאסטרקארד דיי! קוד קופון: ${couponCode}\n${directUrl}`;
    if (navigator.share) {
      navigator.share({
        title: `${deal.brand} | Mastercard Day`,
        text: textToShare,
        url: directUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(textToShare)
        .then(() => {
          showToast(`פרטי ההטבה של ${deal.brand} הועתקו לשיתוף!`, 'success');
        })
        .catch(() => {
          showToast('העתקה לשיתוף נכשלה', 'warning');
        });
    }
  };

  return (
    <article
      id={deal.id}
      className={`relative flex flex-col bg-white dark:bg-mc-cardDark rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
        validityInfo.isExpired
          ? 'opacity-70 grayscale-[30%] hover:grayscale-0 hover:opacity-100 border-slate-300 dark:border-slate-800'
          : 'border-slate-200/90 dark:border-mc-borderDark hover:border-red-300 dark:hover:border-red-900/60 hover:-translate-y-0.5'
      }`}
    >
      {/* Card Image & Header */}
      <div className="relative h-44 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
        {hasImage ? (
          <img
            src={deal.image}
            alt={deal.brand}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full bg-gradient-to-br from-red-600/10 via-amber-500/10 to-red-600/5 text-red-600 dark:text-red-400 p-4 text-center">
            <Sparkles className="w-8 h-8 opacity-60" />
            <span className="font-black text-lg line-clamp-1">{deal.brand}</span>
          </div>
        )}

        {/* Live Validity Status Badge (Top-Right in RTL) */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-xs font-bold shadow-md border flex items-center gap-1.5 backdrop-blur-md ${validityInfo.badgeClass}`}>
          <span className={`w-2 h-2 rounded-full ${validityInfo.dotClass} ${validityInfo.status === 'active_today' ? 'animate-pulse' : ''}`} />
          <span>{validityInfo.label}</span>
        </div>

        {/* Category & Validity Badges (Bottom-Right in RTL) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 flex-wrap">
          {deal.category && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium">
              {deal.category}
            </span>
          )}
          {deal.validity && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-900/85 backdrop-blur-md text-amber-300 text-[11px] font-medium">
              {deal.validity}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Brand, Pricing & Share */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                {deal.brand}
              </h3>

              {/* Discount Badges */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow-xs">
                  <Percent className="w-3 h-3" />
                  <span>{deal.discount}</span>
                </span>

                {deal.ongoing_discount && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold">
                    <span>📅 {deal.ongoing_discount} שאר החודש</span>
                  </span>
                )}

                {deal.min_spend && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold">
                    <span>מעל {deal.min_spend}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleShare}
              title="שתף הטבה"
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label="שתף הטבה"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Deal Summary Title */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {deal.title}
          </p>

          {/* Structured Conditions Bullets */}
          {deal.terms_bullets && deal.terms_bullets.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-red-500" />
                <span>עיקרי התנאים:</span>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                {deal.terms_bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-1 leading-snug">
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Actions: Coupon Box, Website Link, Legal Fine Print */}
        <div className="space-y-3 pt-2">
          {/* Coupon Box & 1-Click Copy */}
          <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Ticket className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-right truncate">
                <div className="text-[10px] text-slate-400 font-medium">קוד קופון:</div>
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-amber-400 tracking-wider select-all">
                  {couponCode}
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyCoupon}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'הועתק!' : 'העתק'}</span>
            </button>
          </div>

          {/* Action Buttons & Expandable Legal Terms */}
          <div className="space-y-2">
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>מעבר לאתר ההטבה</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {deal.description && (
              <details className="group text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer list-none flex items-center justify-between py-1 text-[11px] font-medium hover:text-slate-700 dark:hover:text-slate-200 transition">
                  <span>תקנון מלא ואותיות קטנות</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="mt-2 p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 text-[11px] leading-relaxed border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  {deal.description}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
