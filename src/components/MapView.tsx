import React, { useState, useEffect, useRef } from 'react';
import { useGoogleMap } from '../hooks/useGoogleMap';
import { BillingStore } from '../types/billing';
import { Layers, Search, AlertCircle, Loader2 } from 'lucide-react';

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [allBillingStores, setAllBillingStores] = useState<BillingStore[]>([]);
  const [loadFullBilling, setLoadFullBilling] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [mapSearch, setMapSearch] = useState('');

  // Fetch billing dataset on-demand when user opens MapView
  useEffect(() => {
    if (allBillingStores.length > 0) return;

    setIsLoadingFull(true);
    fetch('./data/billing-index.json')
      .then(res => res.json())
      .then(data => {
        setAllBillingStores(data.stores || []);
        setIsLoadingFull(false);
      })
      .catch(err => {
        console.error('Failed to load billing index for map:', err);
        setIsLoadingFull(false);
      });
  }, [allBillingStores.length]);

  // Filter stores according to map search query & full billing toggle
  const displayedStores = React.useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (q) {
      return allBillingStores
        .filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
        )
        .slice(0, 500);
    }

    return loadFullBilling ? allBillingStores : allBillingStores.slice(0, 300);
  }, [allBillingStores, loadFullBilling, mapSearch]);

  const { isLoaded, loadError } = useGoogleMap(containerRef, displayedStores);

  return (
    <div className="relative w-full h-[calc(100vh-220px)] min-h-[500px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-900">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 right-4 left-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Search bar inside map */}
        <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-1 flex items-center gap-2 max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={mapSearch}
            onChange={e => setMapSearch(e.target.value)}
            placeholder="סינון סניף או עיר במפה..."
            className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1.5"
          />
        </div>

        {/* 10,000+ Billing Stores Toggle */}
        <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md px-4 py-2 flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={loadFullBilling}
              onChange={e => setLoadFullBilling(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>הצג 10,000+ חנויות ממעמד החיוב (טעינה לפי דרישה)</span>
            </span>
          </label>

          {isLoadingFull && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>טוען נתונים...</span>
            </div>
          )}

          {allBillingStores.length > 0 && !isLoadingFull && (
            <span className="text-[11px] text-slate-400">
              ({displayedStores.length.toLocaleString()} סניפים מוצגים)
            </span>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Map Loading / Error Fallbacks */}
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs z-5">
          <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            טוען מפת סניפים ומיקומים...
          </p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-900/95 z-5 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            לא ניתן היה להתחבר לשירות Google Maps
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-4">{loadError}</p>
          <div className="text-xs text-slate-400">
            ניתן עדיין לחפש ולצפות בכל 10,000+ החנויות וההנחות בלשונית "רשתות וחנויות".
          </div>
        </div>
      )}
    </div>
  );
};
