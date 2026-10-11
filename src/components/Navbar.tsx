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
    <header className="sticky top-0 z-100 bg-editorial-bg border-b-2 border-editorial-ink pt-safe">
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-8">
          {/* Brand */}
          <div 
            className="brand cursor-pointer select-none"
            onClick={() => setPrimaryTab('mega')}
          >
            <h1 className="font-syne text-3xl font-black uppercase tracking-tighter leading-[0.9]">
              ההטבות שלי
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-2">
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
              className="w-full bg-transparent border border-editorial-ink-faint rounded px-5 py-3 font-sans text-[13.5px] focus:outline-none focus:border-editorial-ink transition-colors"
            />
            
            {/* Smart Search Suggestions Popover */}
            {isFocused && (
              <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-lg border-2 border-editorial-ink shadow-xl p-3 space-y-3">
                {/* AI Search Quick Direct Action */}
                <button
                  type="button"
                  onClick={() => {
                    openChat(query);
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-md bg-editorial-bg border border-editorial-ink text-right cursor-pointer hover:bg-emerald-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-editorial-ink text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-editorial-ink flex items-center gap-1.5">
                        <span>סייר ההטבות AI</span>
                        {query ? <span className="text-emerald-700 truncate max-w-[140px]">: "{query}"</span> : null}
                      </div>
                      <div className="text-[10px] text-editorial-ink-muted">
                        {query ? 'קבל תשובה מפורטת והמלצות' : 'שאל כל שאלה על המועדונים'}
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </button>

                {!query.trim() ? (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-editorial-ink-muted mb-2">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-editorial-bg hover:bg-editorial-ink hover:text-white text-editorial-ink transition cursor-pointer font-mono text-[10px] uppercase border border-editorial-ink-faint"
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
                        <div className="text-[10px] font-mono uppercase tracking-wider text-editorial-ink-muted mb-1.5">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-editorial-ink-faint text-[11px] font-medium hover:bg-editorial-bg transition cursor-pointer"
                            >
                              <span>✨</span>
                              <span>{syn}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-editorial-ink-faint flex items-center justify-between text-[10px] font-mono text-editorial-ink-muted uppercase">
                      <span>Press Enter to Search</span>
                      <button 
                        onClick={() => setIsFocused(false)}
                        className="underline hover:text-editorial-ink"
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
          <div className="nav-actions flex justify-end gap-3">
            <button 
              onClick={() => setPrimaryTab('mega')}
              className={`font-mono text-[11px] uppercase tracking-wider border-2 border-editorial-ink px-4 py-2 transition-colors flex items-center gap-2 ${primaryTab === 'mega' ? 'bg-editorial-ink text-white' : 'bg-transparent text-editorial-ink hover:bg-editorial-bg'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              מגה חיפוש
            </button>
            <button 
              onClick={() => openChat(query)}
              className="font-mono text-[11px] uppercase tracking-wider border-2 border-editorial-ink px-4 py-2 bg-transparent text-editorial-ink hover:bg-editorial-bg transition-colors flex items-center gap-2"
            >
              <Bot className="w-3.5 h-3.5" />
              סייר AI
            </button>
            <button 
              onClick={() => setPrimaryTab('favorites')}
              className={`font-mono text-[11px] uppercase tracking-wider border-2 border-editorial-ink px-4 py-2 transition-colors flex items-center gap-2 ${primaryTab === 'favorites' ? 'bg-editorial-ink text-white' : 'bg-transparent text-editorial-ink hover:bg-editorial-bg'}`}
            >
              <Star className={`w-3.5 h-3.5 ${primaryTab === 'favorites' ? 'fill-current' : ''}`} />
              שמורים
              {favoritesCount > 0 && <span className="opacity-60">({favoritesCount})</span>}
            </button>
            
            {/* Minimal controls toggle */}
            <div className="flex border-2 border-editorial-ink">
              <button 
                onClick={toggleTheme}
                className="p-2 border-l border-editorial-ink hover:bg-editorial-bg transition-colors"
                title="Theme Toggle"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={toggleUiDensity}
                className="p-2 hover:bg-editorial-bg transition-colors"
                title="Density Toggle"
              >
                {uiDensity === 'clean' ? <Sparkles className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
