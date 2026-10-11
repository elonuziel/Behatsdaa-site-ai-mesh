import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff, HardDrive } from 'lucide-react';

interface OnlineStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  className = '',
  showDetails = true
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs ${className}`}
        role="status"
        aria-live="polite"
        title="מחובר לרשת — נתונים חיים ומעודכנים"
        dir="rtl"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-sans">
          {showDetails ? 'מחובר לרשת' : 'אונליין'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs animate-pulse transition-all ${className}`}
      role="status"
      aria-live="polite"
      title="אין חיבור אינטרנט — מוצגים נתונים שמורים מהמטמון המקומי"
      dir="rtl"
    >
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex items-center gap-1 text-[11px] font-sans">
        <span className="font-bold">לא מקוון</span>
        <span className="text-amber-600 dark:text-amber-400">•</span>
        <span className="inline-flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          נתונים מהמטמון המקומי
        </span>
      </div>
    </div>
  );
};
