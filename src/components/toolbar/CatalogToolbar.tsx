import React, { useState } from 'react';
import { useSearch } from '../../context/SearchContext';
import { MyClubsPills } from '../MyClubsPills';
import {
  Store,
  Tag,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface CatalogToolbarProps {
  totalStoresCount: number;
  totalDealsCount: number;
  availableCards: Array<{ id: string; name: string; count: number }>;
  storeCategories: Array<{ name: string; count: number }>;
  contentTypeFilter: 'all' | 'stores' | 'deals';
  setContentTypeFilter: (type: 'all' | 'stores' | 'deals') => void;
}

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  totalStoresCount,
  totalDealsCount,
  availableCards,
  storeCategories,
  contentTypeFilter,
  setContentTypeFilter
}) => {
  const {
    viewMode,
    setViewMode,
    uiDensity,
    toggleUiDensity,
    selectedCategory,
    setSelectedCategory,
    selectedCard,
    setSelectedCard,
    sortBy,
    setSortBy,
    smartSearch,
    setSmartSearch,
    fuzzySearch,
    setFuzzySearch,
    searchInDesc,
    setSearchInDesc
  } = useSearch();

  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main Controls Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 ${uiDensity === 'clean' ? 'rounded-xl border border-slate-200/70 dark:border-slate-800/80 p-2' : 'rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3'} shadow-2xs`}>
        {/* 1. Choosing Between: All / Stores / Deals */}
        <div className={`flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 ${uiDensity === 'clean' ? 'rounded-lg' : 'rounded-xl border border-slate-200/70 dark:border-slate-700/70'}`}>
          <button
            type="button"
            onClick={() => setContentTypeFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              contentTypeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            הכל ({(totalStoresCount + totalDealsCount).toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setContentTypeFilter('stores')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              contentTypeFilter === 'stores'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>רשתות ({totalStoresCount.toLocaleString()})</span>
          </button>
          <button
            type="button"
            onClick={() => setContentTypeFilter('deals')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              contentTypeFilter === 'deals'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>מבצעים ({totalDealsCount.toLocaleString()})</span>
          </button>
        </div>

        {/* 2. Filters & View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Card & Category Filter Dropdowns (Inline in detailed mode, or inside Drawer in clean mode) */}
          {uiDensity === 'detailed' && (
            <>
              {/* Card Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedCard}
                  onChange={e => setSelectedCard(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[190px] truncate"
                >
                  <option value="all">💳 כל כרטיסי בהצדעה</option>
                  {availableCards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[170px] truncate"
                >
                  <option value="all">כל הקטגוריות</option>
                  {storeCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
          >
            <option value="discount">הנחה מרבית %</option>
            <option value="name">שם א-ת</option>
            <option value="relevant">התאמה לחיפוש</option>
          </select>

          {/* View Mode: Grid / Table */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              title="תצוגת כרטיסים"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="תצוגת טבלה"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Extra Filters Drawer Button */}
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isAdvancedFiltersOpen || (selectedCard !== 'all')
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="סינון מועדונים, כרטיסים והגדרות חיפוש"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">מסננים</span>
            {selectedCard !== 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Density Mode Switcher (Clean View vs Full View) */}
          <button
            type="button"
            onClick={toggleUiDensity}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
              uiDensity === 'clean'
                ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            }`}
            title={uiDensity === 'clean' ? 'מעבר לתצוגה מלאה ומפורטת (הצג הכל כפי שהיה)' : 'מעבר לתצוגה נקייה'}
          >
            {uiDensity === 'clean' ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>תצוגה מלאה</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>תצוגה נקייה</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {isAdvancedFiltersOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3.5 animate-in fade-in-50 duration-150">
          {/* In Clean Mode: Card & Category Filter Dropdowns inside Drawer */}
          {uiDensity === 'clean' && (
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">כרטיס נטען:</span>
                <select
                  value={selectedCard}
                  onChange={e => setSelectedCard(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-3 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer text-xs max-w-[200px] truncate"
                >
                  <option value="all">💳 כל כרטיסי בהצדעה</option>
                  {availableCards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCard !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCard('all')}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  איפוס כרטיס
                </button>
              )}
            </div>
          )}
          {/* Clubs Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MyClubsPills />
            <div className="text-xs text-slate-500 font-medium">
              חיפוש מקביל ב-3 מועדוני צרכנות מובילים
            </div>
          </div>

          {/* Search Engine Options */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>הגדרות מנוע חיפוש:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSmartSearch(!smartSearch)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  smartSearch
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>🧠 חיפוש חכם</span>
                <span className={`w-2 h-2 rounded-full ${smartSearch ? 'bg-white' : 'bg-slate-400'}`} />
              </button>

              <button
                type="button"
                onClick={() => setFuzzySearch(!fuzzySearch)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  fuzzySearch
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>🎯 חיפוש גמיש (Fuzzy)</span>
                <span className={`w-2 h-2 rounded-full ${fuzzySearch ? 'bg-white' : 'bg-slate-400'}`} />
              </button>

              <button
                type="button"
                onClick={() => setSearchInDesc(!searchInDesc)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  searchInDesc
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📝 חיפוש בתיאור ובתקנון</span>
                <span className={`w-2 h-2 rounded-full ${searchInDesc ? 'bg-white' : 'bg-slate-400'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
