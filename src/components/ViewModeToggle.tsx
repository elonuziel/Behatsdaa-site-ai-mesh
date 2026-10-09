import React from 'react';
import { useSearch } from '../context/SearchContext';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';

interface ViewModeToggleProps {
  className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ className = '' }) => {
  const { viewMode, setViewMode } = useSearch();

  return (
    <div className={`flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <button
        type="button"
        onClick={() => setViewMode('grid')}
        title="תצוגת כרטיסים"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
          viewMode === 'grid'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">כרטיסים</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode('table')}
        title="תצוגת טבלה"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
          viewMode === 'table'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <TableIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">טבלה</span>
      </button>
    </div>
  );
};
