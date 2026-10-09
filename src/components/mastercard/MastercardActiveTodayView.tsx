import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  Zap,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface MastercardDeal {
  id: string;
  brand: string;
  title: string;
  discount: string;
  coupon?: string;
  url?: string;
  image?: string;
  category?: string;
  validity?: string;
  description?: string;
}

export const MastercardActiveTodayView: React.FC = () => {
  const { showToast } = useToast();
  const [deals, setDeals] = useState<MastercardDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const today = new Date();
  const currentDay = today.getDate();
  const isTenth = currentDay === 10;

  useEffect(() => {
    let isMounted = true;
    fetch('./data/mastercard/deals.json')
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          setDeals(json.deals || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load deals:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => showToast('העתקת הקופון נכשלה', 'warning'));
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">בודק הטבות פעילות היום...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <div className={`rounded-3xl p-6 shadow-md border text-white flex flex-wrap items-center justify-between gap-4 ${
        isTenth
          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 border-emerald-500'
          : 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 border-amber-500/50'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">
                {isTenth ? '🎉 היום ה-10 בחודש - כל המבצעים פעילים עכשיו!' : 'מבצעי ה-10 בחודש (תצוגה מקדימה)'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                {deals.length} הטבות בלעדיות
              </span>
            </div>
            <p className="text-xs text-white/90">
              {isTenth
                ? 'המבצעים בתוקף עד 23:59 הלילה! קוד הקופון MASTERCARDAY מוכן להעתקה בלחיצה.'
                : 'המבצעים הבאים יהיו פעילים למימוש ב-10 לחודש הקרוב לאורך כל היממה.'}
            </p>
          </div>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
          <span className="text-xs text-white/80 block">תאריך היום</span>
          <span className="text-lg font-black">{today.toLocaleDateString('he-IL')}</span>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {deals.map(d => {
          const coupon = d.coupon || 'MASTERCARDAY';
          const isCopied = copiedCode === coupon;

          return (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {d.brand}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black">
                    {d.discount}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {d.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {d.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCopyCode(coupon)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono text-xs font-bold hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>הועתק ללוח!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק קופון: {coupon}</span>
                    </>
                  )}
                </button>

                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-amber-600 font-semibold"
                  >
                    <span>מימוש באתר {d.brand}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
