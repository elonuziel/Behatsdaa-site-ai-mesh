import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Clock } from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
}

function calculateTimeUntil10th(): TimeLeft {
  const now = new Date();
  const currentDay = now.getDate();

  // If today is the 10th
  if (currentDay === 10) {
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), 10, 23, 59, 59);
    const diff = Math.max(0, endOfDay.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days: 0, hours, minutes, seconds, isToday: true };
  }

  // Calculate target 10th
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();

  if (currentDay > 10) {
    // Next month's 10th
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const targetDate = new Date(targetYear, targetMonth, 10, 0, 0, 0);
  const diff = Math.max(0, targetDate.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isToday: false };
}

export const MastercardCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeUntil10th);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeUntil10th());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30 border border-amber-300/40 dark:border-amber-700/40 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Banner Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            {timeLeft.isToday ? (
              <Sparkles className="w-6 h-6 animate-pulse" />
            ) : (
              <Calendar className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                Mastercard Day
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                {timeLeft.isToday ? 'פעיל היום!' : 'ה-10 בחודש'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {timeLeft.isToday
                ? 'חגיגת הקניות בעיצומה! כל קודי הקופון וההנחות זמינים למימוש כעת'
                : 'עשרות קודי קופון והטבות ענק בלעדיות למחזיקי כרטיס מאסטרקארד'}
            </p>
          </div>
        </div>

        {/* Live Timer Countdown */}
        <div className="flex items-center gap-2 text-center shrink-0">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs pl-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft.isToday ? 'זמן שנותר לסיום:' : 'ספירה לאחור:'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            {!timeLeft.isToday && timeLeft.days > 0 && (
              <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 min-w-[42px] shadow-2xs">
                <span className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">
                  {timeLeft.days}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">ימים</span>
              </div>
            )}

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">שעות</span>
            </div>

            <span className="text-slate-400 font-bold">:</span>

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">דקות</span>
            </div>

            <span className="text-slate-400 font-bold">:</span>

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 min-w-[42px] shadow-2xs">
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">
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
