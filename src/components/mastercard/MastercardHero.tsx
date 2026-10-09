import React, { useState, useEffect } from 'react';
import {
  getNextMastercardDay,
  getCalendarContext
} from '../../utils/mastercardValidity';
import { useToast } from '../../context/ToastContext';
import {
  Tag,
  CheckCircle2,
  KeyRound,
  Clock,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface MastercardHeroProps {
  totalDeals: number;
  activeTodayCount: number;
  lastUpdated?: string;
}

export const MastercardHero: React.FC<MastercardHeroProps> = ({
  totalDeals,
  activeTodayCount,
  lastUpdated
}) => {
  const { showToast } = useToast();
  const [calendarContext, setCalendarContext] = useState(getCalendarContext);
  const [countdown, setCountdown] = useState(getNextMastercardDay);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const [timeLeft, setTimeLeft] = useState(() => {
    const next = getNextMastercardDay();
    const diff = Math.max(0, next.targetDate.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / (3600 * 24)),
      hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: Math.floor(totalSeconds % 60)
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const next = getNextMastercardDay();
      setCountdown(next);
      setCalendarContext(getCalendarContext());

      const diff = Math.max(0, next.targetDate.getTime() - Date.now());
      const totalSeconds = Math.floor(diff / 1000);
      setTimeLeft({
        days: Math.floor(totalSeconds / (3600 * 24)),
        hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: Math.floor(totalSeconds % 60)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCoupon(true);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCoupon(false), 2000);
      })
      .catch(() => {
        showToast('העתקת הקופון נכשלה', 'warning');
      });
  };

  const formattedLastUpdated = (() => {
    if (!lastUpdated) return 'מעודכן';
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'מעודכן';
    }
  })();

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
      {/* Background ambient blurs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-yellow-500/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Brand Text & Status */}
        <div className="space-y-3.5 text-center lg:text-right max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-medium">
            <span className={calendarContext.dotClass} />
            <span>{calendarContext.todayText}</span>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-3">
            {/* Mastercard Interlocking Circles Motif */}
            <div className="relative w-10 h-7 flex items-center shrink-0">
              <span className="w-6 h-6 rounded-full bg-[#EB001B] absolute right-0 shadow-sm" />
              <span className="w-6 h-6 rounded-full bg-[#F79E1B] absolute left-0 opacity-90 shadow-sm" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              חגיגת המבצעים של{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-red-500">
                מאסטרקארד דיי
              </span>
            </h2>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            {calendarContext.statusExplanation}
          </p>

          <div className="flex items-center justify-center lg:justify-start gap-2 pt-1">
            <a
              href="https://github.com/elonuziel/mastercarday"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition font-medium"
            >
              <span>מבוסס על קטלוג mastercarday</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase text-center max-w-xs">
            {countdown.title}
          </div>

          <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
            {timeLeft.days > 0 && (
              <>
                <div className="countdown-box rounded-2xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[76px] backdrop-blur-md">
                  <span className="block text-2xl sm:text-3xl font-black text-white">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">ימים</span>
                </div>
                <span className="text-xl font-bold text-slate-500">:</span>
              </>
            )}

            <div className="countdown-box rounded-2xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[76px] backdrop-blur-md">
              <span className="block text-2xl sm:text-3xl font-black text-white">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-medium text-slate-400">שעות</span>
            </div>

            <span className="text-xl font-bold text-slate-500">:</span>

            <div className="countdown-box rounded-2xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[76px] backdrop-blur-md">
              <span className="block text-2xl sm:text-3xl font-black text-white">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-medium text-slate-400">דקות</span>
            </div>

            <span className="text-xl font-bold text-slate-500">:</span>

            <div className="countdown-box rounded-2xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[76px] backdrop-blur-md">
              <span className="block text-2xl sm:text-3xl font-black text-amber-400">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-medium text-slate-400">שניות</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Ribbon */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-red-400 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-white">{totalDeals}</div>
            <div className="text-[11px] text-slate-400">הטבות בקטלוג</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-emerald-400">{activeTodayCount}</div>
            <div className="text-[11px] text-slate-400">פעילות היום 🔥</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-amber-400 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <div>
              <div className="text-xs font-mono font-bold text-white tracking-wider">MASTERCARDAY</div>
              <div className="text-[11px] text-slate-400">קוד קופון ראשי</div>
            </div>
            <button
              onClick={() => handleCopyCode('MASTERCARDAY')}
              className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition"
              title="העתק קופון ראשי"
            >
              {copiedCoupon ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-blue-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-white">{formattedLastUpdated}</div>
            <div className="text-[11px] text-slate-400">עודכן לאחרונה</div>
          </div>
        </div>
      </div>
    </section>
  );
};
