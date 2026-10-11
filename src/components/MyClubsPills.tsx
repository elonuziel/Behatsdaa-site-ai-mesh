import React from 'react';
import { useClubs } from '../context/ClubContext';
import { CLUBS, ClubId } from '../types/club';
import { Check, ShieldCheck, Clock } from 'lucide-react';

/**
 * Renders toggleable pills for each club alongside a summary of each club's last-updated date.
 */
export const MyClubsPills: React.FC = () => {
  const { activeClubs, toggleClub, resetAllClubs } = useClubs();

  const clubsList: ClubId[] = ['behatsdaa', 'uniq', 'mastercard'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>My Clubs:</span>
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
                title={`${config.name} (${isActive ? 'Active' : 'Inactive'}) — Last updated on ${config.lastUpdatedFormatted}`}
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
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isActive ? 'bg-black/15 text-white/90' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  title={`Last update date: ${config.lastUpdatedFormatted}`}
                >
                  {config.lastUpdatedFormatted}
                </span>
              </button>
            );
          })}
        </div>

        {activeClubs.size < 3 && (
          <button
            onClick={resetAllClubs}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline px-1 py-0.5"
            title="Select all clubs"
          >
            Select All
          </button>
        )}
      </div>

      {/* Per-Club Last Updated Summary */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-600 dark:text-slate-300">Last updated:</span>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px]">
          <span title={`בהצדעה updated on ${CLUBS.behatsdaa.lastUpdatedFormatted}`} className="text-emerald-700 dark:text-emerald-300 font-sans">
            בהצדעה: <span className="font-mono">{CLUBS.behatsdaa.lastUpdatedFormatted}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span title={`UNIQ updated on ${CLUBS.uniq.lastUpdatedFormatted}`} className="text-purple-700 dark:text-purple-300 font-sans">
            UNIQ: <span className="font-mono">{CLUBS.uniq.lastUpdatedFormatted}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span title={`Mastercard Day updated on ${CLUBS.mastercard.lastUpdatedFormatted}`} className="text-amber-700 dark:text-amber-300 font-sans">
            Mastercard: <span className="font-mono">{CLUBS.mastercard.lastUpdatedFormatted}</span>
          </span>
        </span>
      </div>
    </div>
  );
};
