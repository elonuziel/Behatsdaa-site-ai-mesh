import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { useChat } from '../context/ChatContext';
import { expandSmartTerms } from '../hooks/useMiniSearch';
import {
  Sun,
  Moon,
  Globe,
  Star,
  Sparkles,
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

/**
 * Renders club navigation and search suggestions with theme, density, and chat controls.
 */
export const Navbar: React.FC = () => {
  const { query, setQuery, primaryTab, setPrimaryTab, uiDensity, toggleUiDensity } = useSearch();
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

  return (
    <header className="sticky top-0 z-100 bg-editorial-bg dark:bg-slate-900 border-b-2 border-editorial-ink dark:border-slate-800 text-editorial-ink dark:text-slate-100 pt-safe transition-colors duration-200 shadow-2xs">
      <div className={`max-w-[1600px] mx-auto px-4 sm:px-8 ${uiDensity === 'clean' ? 'py-3 sm:py-3.5' : 'py-6'} transition-all`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          {/* Brand */}
          <div 
            className="brand cursor-pointer select-none"
            onClick={() => setPrimaryTab('mega')}
          >
            <h1 className={`${uiDensity === 'clean' ? 'font-syne text-3xl font-black' : 'font-sans text-3xl font-black'} uppercase tracking-tighter leading-[0.9] text-editorial-ink dark:text-white`}>
              ההטבות שלי
            </h1>
            <p className={`${uiDensity === 'clean' ? 'font-mono text-[10px] uppercase tracking-widest' : 'font-sans text-xs'} text-editorial-ink-muted dark:text-slate-400 mt-1.5`}>
              My Perks · Meta Search Portal
            </p>
          </div>
          
          {/* Search Bar */}
          <div ref={searchContainerRef} className="relative w-full max-w-[500px]">
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              placeholder="חפש רשת, מוצר, ספק או קופון בכל המועדונים..."
              className={`w-full ${
                uiDensity === 'clean'
                  ? 'bg-white dark:bg-slate-800/90 rounded-xl px-4 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 shadow-2xs'
                  : 'bg-white/60 dark:bg-slate-800/80 border border-editorial-ink-faint dark:border-slate-700 rounded px-5 py-3 text-[13.5px]'
              } text-editorial-ink dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-editorial-ink dark:focus:border-slate-400 transition-colors`}
            />
            
            {/* Smart Search Suggestions Popover */}
            {isFocused && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-lg border-2 border-editorial-ink dark:border-slate-750 shadow-xl p-3 space-y-3">
                {/* AI Search Quick Direct Action */}
                <button
                  type="button"
                  onClick={() => {
                    openChat(query);
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-md bg-editorial-bg dark:bg-slate-800 border border-editorial-ink dark:border-slate-700 text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-750 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-editorial-ink dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-editorial-ink dark:text-white flex items-center gap-1.5">
                        <span>סייר ההטבות AI</span>
                        {query ? <span className="text-emerald-700 dark:text-emerald-400 truncate max-w-[140px]">: "{query}"</span> : null}
                      </div>
                      <div className="text-[10px] text-editorial-ink-muted dark:text-slate-400">
                        {query ? 'קבל תשובה מפורטת והמלצות' : 'שאל כל שאלה על המועדונים'}
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </button>

                {!query.trim() ? (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-editorial-ink-muted dark:text-slate-400 mb-2">
                      Popular Searches:
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-editorial-bg dark:bg-slate-800 hover:bg-editorial-ink hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-editorial-ink dark:text-slate-200 transition cursor-pointer font-mono text-[10px] uppercase border border-editorial-ink-faint dark:border-slate-700"
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
                        <div className="text-[10px] font-mono uppercase tracking-wider text-editorial-ink-muted dark:text-slate-400 mb-1.5">
                          Smart Suggestions:
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-editorial-ink-faint dark:border-slate-700 text-[11px] font-medium text-editorial-ink dark:text-slate-200 hover:bg-editorial-bg dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <span>✨</span>
                              <span>{syn}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-editorial-ink-faint dark:border-slate-700 flex items-center justify-between text-[10px] font-mono text-editorial-ink-muted dark:text-slate-400 uppercase">
                      <span>Press Enter to Search</span>
                      <button 
                        onClick={() => setIsFocused(false)}
                        className="underline hover:text-editorial-ink dark:hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav Actions */}
          <div className="nav-actions flex justify-end gap-2 sm:gap-3 flex-wrap">
            {/* In Detailed Mode: Full Tab Buttons */}
            {uiDensity === 'detailed' && (
              <>
                <button 
                  onClick={() => setPrimaryTab('mega')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    primaryTab === 'mega'
                      ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-600 dark:text-white dark:border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  מגה חיפוש
                </button>
                <button 
                  onClick={() => setPrimaryTab('favorites')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    primaryTab === 'favorites' 
                      ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-600 dark:text-white dark:border-emerald-500 shadow-xs' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${primaryTab === 'favorites' ? 'fill-current' : ''}`} />
                  שמורים
                  {favoritesCount > 0 && <span className="opacity-60">({favoritesCount})</span>}
                </button>
              </>
            )}

            {/* AI Search Action Button (Always available) */}
            <button 
              onClick={() => openChat(query)}
              className={
                uiDensity === 'clean'
                  ? 'px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs'
                  : 'px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs'
              }
            >
              <Bot className="w-3.5 h-3.5" />
              סייר AI
            </button>
            
            {/* View Mode Toggle Button (Clean View vs Full View) */}
            <button 
              onClick={toggleUiDensity}
              className={
                uiDensity === 'clean'
                  ? 'font-mono text-[11px] uppercase tracking-wider border-2 border-editorial-ink dark:border-slate-700 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 cursor-pointer'
                  : 'px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs'
              }
              title={uiDensity === 'clean' ? 'מעבר לתצוגה מלאה ומפורטת (הצג הכל כפי שהיה)' : 'מעבר לתצוגה נקייה'}
            >
              {uiDensity === 'clean' ? (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>תצוגה מלאה</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>תצוגה נקייה</span>
                </>
              )}
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className={
                uiDensity === 'clean'
                  ? 'border-2 border-editorial-ink dark:border-slate-700 p-2 text-editorial-ink dark:text-slate-200 hover:bg-editorial-bg dark:hover:bg-slate-800 transition-colors cursor-pointer'
                  : 'p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer shadow-2xs'
              }
              title="Theme Toggle"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
