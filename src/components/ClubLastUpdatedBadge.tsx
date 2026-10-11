import React from 'react';
import { useClubs } from '../context/ClubContext';
import { ClubId, CLUBS } from '../types/club';
import { Clock, RefreshCw } from 'lucide-react';

interface ClubLastUpdatedBadgeProps {
  clubId?: ClubId;
  variant?: 'header' | 'footer' | 'pill' | 'banner';
  className?: string;
  showAll?: boolean;
}

/**
 * Displays the last-updated date for a single club, or a combined summary for all clubs,
 * rendered in one of several visual variants (header, footer, pill, or banner).
 */
export const ClubLastUpdatedBadge: React.FC<ClubLastUpdatedBadgeProps> = ({
  clubId,
  variant = 'header',
  className = '',
  showAll = false
}) => {
  const { lastUpdatedFormatted, lastUpdated } = useClubs();

  // If showAll is true or no single clubId provided, render all clubs update status
  if (showAll || !clubId) {
    if (variant === 'footer') {
      return (
        <div
          className={`flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
          dir="rtl"
        >
          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>עדכון נתונים אחרון:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
              בהצדעה: {lastUpdatedFormatted.behatsdaa}
            </span>
            <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60">
              UNIQ: {lastUpdatedFormatted.uniq}
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
              Mastercard Day: {lastUpdatedFormatted.mastercard}
            </span>
          </div>
        </div>
      );
    }

    // Default multi-club header/banner style
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 shadow-2xs ${className}`}
        dir="rtl"
      >
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">עודכן לאחרונה:</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">בהצדעה ({lastUpdatedFormatted.behatsdaa})</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-purple-600 dark:text-purple-400 font-medium">UNIQ ({lastUpdatedFormatted.uniq})</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-amber-600 dark:text-amber-400 font-medium">Mastercard ({lastUpdatedFormatted.mastercard})</span>
      </div>
    );
  }

  // Single club badge
  const config = CLUBS[clubId];
  const dateStr = lastUpdatedFormatted[clubId] || config.lastUpdatedFormatted;
  const isoDate = lastUpdated[clubId] || config.lastUpdated;

  if (variant === 'footer') {
    return (
      <div
        className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-slate-200/60 dark:border-slate-800/60 ${className}`}
        dir="rtl"
      >
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>נתוני {config.name} עודכנו לאחרונה בתאריך:</span>
        <time dateTime={isoDate} className="font-mono font-bold text-slate-700 dark:text-slate-200">
          {dateStr}
        </time>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${config.badgeBg} ${config.badgeText} border ${config.borderClass} ${className}`}
        title={`נתוני ${config.name} עודכנו לאחרונה ב-${dateStr}`}
        dir="rtl"
      >
        <Clock className="w-3 h-3 shrink-0" />
        <span>עודכן: {dateStr}</span>
      </span>
    );
  }

  // Variant === 'header'
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-medium border shadow-2xs transition-colors ${config.badgeBg} ${config.badgeText} ${config.borderClass} ${className}`}
      title={`נתוני מועדון ${config.name} מעודכנים לתאריך ${dateStr}`}
      dir="rtl"
    >
      <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span>עודכן לאחרונה:</span>
      <time dateTime={isoDate} className="font-mono font-bold">
        {dateStr}
      </time>
    </div>
  );
};
