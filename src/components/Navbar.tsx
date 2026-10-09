import React, { useState, useRef, useEffect } from 'react';
import { useSearch, PrimaryTab } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { useChat } from '../context/ChatContext';
import { expandSmartTerms } from '../hooks/useMiniSearch';
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
  Flame,
  Bot,
  SlidersHorizontal
} from 'lucide-react';

const POPULAR_SEARCHES = [
  { label: 'פיצה', icon: '🍕' },
  { label: 'דלק', icon: '⛽' },
  { label: 'סופרמרקט', icon: '🛒' },
  { label: 'נעליים', icon: '👟' },
  { label: 'מלונות', icon: '🏨' },
  { label: 'קולנוע', icon: '🎬' },
  { label: 'eSIM', icon: '📱' },
  { label: 'KSP', icon: '💻' },
  { label: 'שובר', icon: '🎁' }
];

interface SubTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Navbar: React.FC = () => {
  const { query, setQuery, primaryTab, setPrimaryTab, subTab, setSubTab, uiDensity, toggleUiDensity } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const { favoritesCount } = useFavorites();
  const { openChat } = useChat();
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const smartSynonyms = React.useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    return expandSmartTerms(query.trim()).slice(0, 5);
  }, [query]);

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
          { id: 'ai-search', label: 'סייר AI וחיפוש חופשי', icon: <Bot className="w-3.5 h-3.5 text-indigo-500" />, badge: 'Gemini' },
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
          <div ref={searchContainerRef} className="flex-1 max-w-md min-w-[240px] relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setIsFocused(true);
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setIsFocused(false);
                }}
                placeholder="חיפוש רשת, מוצר, ספק או קופון בכל המועדונים..."
                className="w-full pl-9 pr-10 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-full border border-slate-200/80 dark:border-slate-700/80 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setIsFocused(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-3 cursor-pointer"
                  aria-label="נקה חיפוש"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Smart Search Suggestions Popover */}
            {isFocused && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 space-y-3 animate-in fade-in-50 duration-150">
                {/* AI Search Quick Direct Action */}
                <button
                  type="button"
                  onClick={() => {
                    openChat(query);
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-emerald-50/80 to-teal-50/90 dark:from-indigo-950/50 dark:via-emerald-950/40 dark:to-teal-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-right cursor-pointer hover:shadow-xs hover:border-indigo-400 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <span>סייר ההטבות AI (חיפוש חופשי)</span>
                        {query ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold truncate max-w-[140px]">
                            : "{query}"
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {query
                          ? 'קבל תשובה מפורטת והמלצות מותאמות אישית'
                          : 'שאל כל שאלה על רשתות, שוברים והנחות בכל המועדונים'}
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </button>

                {!query.trim() ? (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>חיפושים נפוצים:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SEARCHES.map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setQuery(item.label);
                            setIsFocused(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 transition cursor-pointer font-medium"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {smartSynonyms.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          <span>מילים נרדפות ותעתיקים קשורים:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {smartSynonyms.map(syn => (
                            <button
                              key={syn}
                              type="button"
                              onClick={() => {
                                setQuery(syn);
                                setIsFocused(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer font-medium border border-emerald-200/50 dark:border-emerald-800/50"
                            >
                              <span>✨</span>
                              <span>{syn}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>לחץ Enter לחיפוש בכל המועדונים</span>
                      <button
                        type="button"
                        onClick={() => setIsFocused(false)}
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                      >
                        סגור הצעות
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls: Density Mode Toggle, AI Assistant, Favorites & Theme Toggle */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Clean vs Detailed Mode Toggle */}
            <button
              type="button"
              onClick={toggleUiDensity}
              title={
                uiDensity === 'clean'
                  ? 'מצב נוכחי: תצוגה נקייה וממוקדת. לחץ כדי להציג את כל הסרגלים, המסננים והתגים המלאים'
                  : 'מצב נוכחי: תצוגה מפורטת ומלאה. לחץ כדי לחזור לתצוגה נקייה, מקצועית וממוקדת'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                uiDensity === 'clean'
                  ? 'bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              {uiDensity === 'clean' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">תצוגה נקייה</span>
                  <span className="sm:hidden">נקייה</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">תצוגה מלאה</span>
                  <span className="sm:hidden">הכל</span>
                </>
              )}
            </button>

            <button
              onClick={() => openChat(query)}
              title="סייר ההטבות והחיפוש החופשי עם Gemini"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">סייר AI</span>
              {uiDensity === 'detailed' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-600 text-white">
                  חדש
                </span>
              )}
            </button>

            <button
              onClick={() => setPrimaryTab('favorites')}
              title="מועדפים"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                primaryTab === 'favorites'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="p-1.5 md:p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:border-slate-700"
              aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Middle Row: Primary Club Tabs */}
        <div className="py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
          <nav className="flex items-center gap-1.5 md:gap-2 overflow-x-auto py-0.5 scrollbar-none">
            {primaryTabs.map(tab => {
              const isActive = primaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPrimaryTab(tab.id)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
                    isActive
                      ? tab.activeClasses
                      : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-750 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {uiDensity === 'detailed' && tab.badge && (
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

        {/* Bottom Row: Contextual Sub-Tabs (Shown in Detailed Mode or when primary tab is not mega) */}
        {uiDensity === 'detailed' && subTabs.length > 0 && (
          <div className="py-1.5 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-1 md:gap-1.5 overflow-x-auto scrollbar-none">
            {subTabs.map(sub => {
              const isActive = subTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSubTab(sub.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
