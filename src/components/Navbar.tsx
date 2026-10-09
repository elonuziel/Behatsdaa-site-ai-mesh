import React from 'react';
import { useSearch, MainTab } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import { MyClubsPills } from './MyClubsPills';
import {
  Search,
  X,
  Sun,
  Moon,
  Store,
  Tag,
  MapPin,
  Wallet,
  Sparkles,
  CreditCard
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { query, setQuery, activeTab, setActiveTab } = useSearch();
  const { theme, toggleTheme } = useTheme();

  const navTabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'הכל', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'stores', label: 'רשתות וחנויות', icon: <Store className="w-4 h-4" /> },
    { id: 'deals', label: 'מבצעים ושוברים', icon: <Tag className="w-4 h-4" /> },
    { id: 'map', label: 'מפת סניפים', icon: <MapPin className="w-4 h-4" /> },
    { id: 'wallets', label: 'ארנקים ותקרות', icon: <Wallet className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                <span>ההטבות שלי</span>
                <span className="text-[11px] font-normal text-slate-400">| My Perks</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                בהצדעה · UNIQ · Mastercard Day
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="חיפוש רשת, מוצר, עיר או קופון..."
                className="w-full pl-9 pr-10 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-full border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-3"
                  aria-label="נקה חיפוש"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sub-Header: Club Filters and Tabs */}
        <div className="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <MyClubsPills />

          {/* Main Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
