import React from 'react';
import { useClubs } from '../context/ClubContext';
import { CLUBS, ClubId } from '../types/club';
import { Check, ShieldCheck } from 'lucide-react';

export const MyClubsPills: React.FC = () => {
  const { activeClubs, toggleClub, resetAllClubs } = useClubs();

  const clubsList: ClubId[] = ['behatsdaa', 'uniq', 'mastercard'];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>המועדונים שלי:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {clubsList.map(clubId => {
          const config = CLUBS[clubId];
          const isActive = activeClubs.has(clubId);

          return (
            <button
              key={clubId}
              onClick={() => toggleClub(clubId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm border ${
                isActive
                  ? `${config.activeBg} ring-2 ring-offset-1 ring-emerald-500/20 dark:ring-offset-slate-900 shadow-md scale-102`
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-400'
              }`}
              title={`${config.name} (${isActive ? 'פעיל' : 'כבוי'})`}
              aria-pressed={isActive}
            >
              <span
                className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border text-[10px] ${
                  isActive
                    ? 'bg-white/20 border-white/60 text-white'
                    : 'border-slate-400 dark:border-slate-500 text-transparent'
                }`}
              >
                {isActive && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span>{config.shortName}</span>
            </button>
          );
        })}
      </div>

      {activeClubs.size < 3 && (
        <button
          onClick={resetAllClubs}
          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline px-1 py-0.5"
          title="בחר את כל המועדונים"
        >
          בחר הכל
        </button>
      )}
    </div>
  );
};
