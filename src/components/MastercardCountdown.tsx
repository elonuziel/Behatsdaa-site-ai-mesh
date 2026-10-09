import React, { useState, useEffect } from 'react';
import { getNextMastercardDay, getCalendarContext } from '../utils/mastercardValidity';
import { Clock } from 'lucide-react';

export const MastercardCountdown: React.FC = () => {
  const [countdown, setCountdown] = useState(getNextMastercardDay);
  const [calendarContext, setCalendarContext] = useState(getCalendarContext);

  const [timeLeft, setTimeLeft] = useState(() => {
    const next = getNextMastercardDay();
    const diff = Math.max(0, next.targetDate.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / (3600 * 24)),
      hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: Math.floor(totalSeconds % 60),
      isLive: next.isLive
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
        seconds: Math.floor(totalSeconds % 60),
        isLive: next.isLive
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600/10 via-amber-500/10 to-red-600/5 dark:from-red-950/40 dark:via-amber-950/30 dark:to-slate-900 border border-red-200/60 dark:border-red-900/40 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Banner Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-7 flex items-center shrink-0">
            <span className="w-6 h-6 rounded-full bg-[#EB001B] absolute right-0 shadow-sm" />
            <span className="w-6 h-6 rounded-full bg-[#F79E1B] absolute left-0 opacity-90 shadow-sm" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                Mastercard Day
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                timeLeft.isLive ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'
              }`}>
                {timeLeft.isLive ? 'פעיל כעת! 🔥' : 'בכל 10 בחודש'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {calendarContext.statusExplanation}
            </p>
          </div>
        </div>

        {/* Live Timer Countdown */}
        <div className="flex items-center gap-2 text-center shrink-0">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs pl-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{countdown.title.slice(0, 15)}...</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
            {timeLeft.days > 0 && (
              <>
                <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 min-w-[42px] shadow-2xs">
                  <span className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
                    {timeLeft.days}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">ימים</span>
                </div>
                <span className="text-slate-400 font-bold">:</span>
              </>
            )}

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">שעות</span>
            </div>

            <span className="text-slate-400 font-bold">:</span>

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">דקות</span>
            </div>

            <span className="text-slate-400 font-bold">:</span>

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-amber-500 leading-tight">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">שניות</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
