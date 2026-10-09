import React from 'react';
import { useSearch, PrimaryTab } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
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
  CreditCard,
  Star,
  Globe,
  GraduationCap,
  Scale,
  Gift,
  Receipt,
  Clock,
  Zap,
  Flame
} from 'lucide-react';

interface SubTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Navbar: React.FC = () => {
  const { query, setQuery, primaryTab, setPrimaryTab, subTab, setSubTab } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const { favoritesCount } = useFavorites();

  const primaryTabs: {
    id: PrimaryTab;
    label: string;
    icon: React.ReactNode;
    color: string;
    activeClasses: string;
    badge?: string;
  }[] = [
    {
      id: 'mega',
      label: 'מגה חיפוש',
      icon: <Globe className="w-4 h-4 text-emerald-500" />,
      color: 'emerald',
      activeClasses: 'bg-emerald-600 text-white shadow-emerald-600/25 border-emerald-600'
    },
    {
      id: 'behatsdaa',
      label: 'בהצדעה',
      icon: <span className="text-sm">🎖️</span>,
      color: 'teal',
      activeClasses: 'bg-teal-600 text-white shadow-teal-600/25 border-teal-600',
      badge: '1,042'
    },
    {
      id: 'uniq',
      label: 'UNIQ',
      icon: <GraduationCap className="w-4 h-4 text-purple-400" />,
      color: 'purple',
      activeClasses: 'bg-purple-600 text-white shadow-purple-600/25 border-purple-600',
      badge: '15%'
    },
    {
      id: 'mastercard',
      label: 'Mastercard Day',
      icon: <CreditCard className="w-4 h-4 text-amber-400" />,
      color: 'amber',
      activeClasses: 'bg-amber-500 text-white shadow-amber-500/25 border-amber-500',
      badge: 'ה-10 בחודש'
    },
    {
      id: 'favorites',
      label: 'מועדפים',
      icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
      color: 'amber',
      activeClasses: 'bg-amber-500 text-white shadow-amber-500/25 border-amber-500',
      badge: favoritesCount > 0 ? String(favoritesCount) : undefined
    }
  ];

  // Sub-tabs depending on the active primary tab
  const getSubTabs = (): SubTabItem[] => {
    switch (primaryTab) {
      case 'mega':
        return [
          { id: 'all', label: 'חיפוש אוניברסלי', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'comparison', label: 'השוואת מועדונים (מטריקס)', icon: <Scale className="w-3.5 h-3.5 text-emerald-500" /> },
          { id: 'map', label: 'מפת כל הסניפים', icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: 'top-deals', label: 'מבצעי שיא', icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> }
        ];
      case 'behatsdaa':
        return [
          { id: 'stores', label: 'רשתות וכרטיסים', icon: <Store className="w-3.5 h-3.5" />, badge: '1,042' },
          { id: 'deals', label: 'מבצעים ושוברים', icon: <Tag className="w-3.5 h-3.5" />, badge: '1,670' },
          { id: 'billing', label: 'מעמד החיוב', icon: <CreditCard className="w-3.5 h-3.5 text-teal-500" />, badge: '10,000+' },
          { id: 'map', label: 'מפת סניפים', icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: 'wallets', label: 'ארנקים ותקרות', icon: <Wallet className="w-3.5 h-3.5" />, badge: '6' }
        ];
      case 'uniq':
        return [
          { id: 'tab-a', label: 'כרטיס נטען 15%', icon: <CreditCard className="w-3.5 h-3.5 text-purple-400" />, badge: '31 רשתות' },
          { id: 'tab-b', label: 'שוברים והטבות', icon: <Gift className="w-3.5 h-3.5 text-purple-400" />, badge: '97' },
          { id: 'tab-c', label: 'הנחות מותגים', icon: <Tag className="w-3.5 h-3.5 text-purple-400" />, badge: '110' },
          { id: 'tab-d', label: 'מעמד החיוב', icon: <Receipt className="w-3.5 h-3.5 text-purple-400" />, badge: '119' }
        ];
      case 'mastercard':
        return [
          { id: 'deals', label: 'כל ההטבות', icon: <Tag className="w-3.5 h-3.5 text-amber-500" />, badge: '44' },
          { id: 'active-today', label: 'פעיל היום (ה-10)', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
          { id: 'terms', label: 'טיימר ואיך זה עובד', icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> }
        ];
      case 'favorites':
        return [
          { id: 'all', label: 'כל השמורים', icon: <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> },
          { id: 'stores', label: 'רשתות', icon: <Store className="w-3.5 h-3.5" /> },
          { id: 'deals', label: 'שוברים ומבצעים', icon: <Tag className="w-3.5 h-3.5" /> }
        ];
      default:
        return [];
    }
  };

  const subTabs = getSubTabs();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setPrimaryTab('mega')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                <span>ההטבות שלי</span>
                <span className="text-[11px] font-normal text-slate-400">| My Perks</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                מגה חיפוש · בהצדעה · UNIQ · Mastercard Day
              </p>
            </div>
          </div>

          {/* Persistent Mega Search Bar */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="חיפוש רשת, מוצר, ספק או קופון בכל המועדונים..."
                className="w-full pl-9 pr-10 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-full border border-slate-200/80 dark:border-slate-700/80 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition shadow-2xs"
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

          {/* Controls: Theme Toggle & Quick Favorites */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrimaryTab('favorites')}
              title="מועדפים"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                primaryTab === 'favorites'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="hidden sm:inline">שמורים</span>
              {favoritesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    primaryTab === 'favorites' ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:border-slate-700"
              aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Middle Row: Primary Club Tabs */}
        <div className="py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
          <nav className="flex items-center gap-2 overflow-x-auto py-0.5">
            {primaryTabs.map(tab => {
              const isActive = primaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPrimaryTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
                    isActive
                      ? tab.activeClasses
                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-750 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Row: Contextual Sub-Tabs */}
        {subTabs.length > 0 && (
          <div className="py-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-1.5 overflow-x-auto">
            {subTabs.map(sub => {
              const isActive = subTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSubTab(sub.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sub.icon}
                  <span>{sub.label}</span>
                  {sub.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                        isActive
                          ? 'bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
