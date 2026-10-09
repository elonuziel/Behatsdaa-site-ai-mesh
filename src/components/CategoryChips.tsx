import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CategoryItem {
  name: string;
  count: number;
}

interface CategoryChipsProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  totalCount: number;
  compact?: boolean;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalCount,
  compact = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/carousel my-3">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0"
        aria-label="גלול שמאלה"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Chips Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 text-xs"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All Categories Chip */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 ${
            compact ? 'px-3 py-1 text-xs rounded-xl' : 'px-3.5 py-1.5 rounded-full'
          } font-medium whitespace-nowrap transition-all shadow-2xs shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white font-bold shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span>הכל</span>
          {compact ? (
            <span className={`text-[11px] ${selectedCategory === 'all' ? 'text-emerald-100' : 'text-slate-400'}`}>
              ({totalCount.toLocaleString()})
            </span>
          ) : (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700/80 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              {totalCount.toLocaleString()}
            </span>
          )}
        </button>

        {/* Individual Category Chips */}
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-1.5 ${
                compact ? 'px-2.5 py-1 text-xs rounded-xl' : 'px-3.5 py-1.5 rounded-full'
              } font-medium whitespace-nowrap transition-all shadow-2xs shrink-0 ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <span>{cat.name}</span>
              {compact ? (
                <span className={`text-[11px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  ({cat.count})
                </span>
              ) : (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-emerald-700/80 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        aria-label="גלול ימינה"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
