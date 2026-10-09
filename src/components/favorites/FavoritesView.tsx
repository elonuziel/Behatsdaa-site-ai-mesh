import React from 'react';
import { UnifiedStore } from '../../types/store';
import { UnifiedDeal } from '../../types/deal';
import { useFavorites } from '../../context/FavoritesContext';
import { useSearch } from '../../context/SearchContext';
import { StoreCard } from '../StoreCard';
import { DealCard } from '../DealCard';
import { TableView } from '../TableView';
import { DealsTableView } from '../DealsTableView';
import { ViewModeToggle } from '../ViewModeToggle';
import {
  Star,
  Store,
  Tag,
  Sparkles,
  Trash2
} from 'lucide-react';

interface FavoritesViewProps {
  stores: UnifiedStore[];
  deals: UnifiedDeal[];
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  stores,
  deals,
  onSelectStore,
  onSelectDeal
}) => {
  const { isFavorite, clearAllFavorites } = useFavorites();
  const { subTab, viewMode } = useSearch();

  const savedStores = stores.filter(s => isFavorite('store', String(s.id)));
  const savedDeals = deals.filter(d => isFavorite('deal', String(d.id)));

  const totalSaved = savedStores.length + savedDeals.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-6 md:p-8 shadow-md border border-amber-400/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <Star className="w-6 h-6 fill-white text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black">הפריטים השמורים שלי (מועדפים)</h2>
            <p className="text-xs md:text-sm text-amber-100">
              רשתות ומבצעים שסימנתם בכוכב לגישה מהירה ונוחה
            </p>
          </div>
        </div>

        {totalSaved > 0 && (
          <button
            onClick={() => {
              if (window.confirm('האם אתה בטוח שברצונך לנקות את כל המועדפים?')) {
                clearAllFavorites();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>נקה הכל</span>
          </button>
        )}
      </div>

      {/* View Mode & Filter Sub-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>
            נשמרו{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{savedStores.length}</strong> רשתות ו-
            <strong className="text-slate-900 dark:text-white font-bold">{savedDeals.length}</strong> מבצעים
          </span>
        </div>

        {/* View mode toggle */}
        <ViewModeToggle />
      </div>

      {totalSaved === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto">
            <Star className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            טרם שמרתם פריטים במועדפים
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            לחצו על סמל הכוכב (⭐) בכל כרטיס רשת או שובר כדי לשמור אותו כאן לגישה מיידית.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Saved Stores */}
          {(subTab === 'all' || subTab === 'stores') && savedStores.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  רשתות שמורות ({savedStores.length})
                </h3>
              </div>

              {viewMode === 'table' ? (
                <TableView stores={savedStores} onSelect={slug => onSelectStore(slug)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedStores.map(store => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      onSelect={slug => onSelectStore(slug)}
                      onSelectDeal={id => onSelectDeal(id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Saved Deals */}
          {(subTab === 'all' || subTab === 'deals') && savedDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  שוברים ומבצעים שמורים ({savedDeals.length})
                </h3>
              </div>

              {viewMode === 'table' ? (
                <DealsTableView
                  deals={savedDeals}
                  onSelectDeal={id => onSelectDeal(id)}
                  onSelectStore={slug => onSelectStore(slug)}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onSelect={id => onSelectDeal(id)}
                      onSelectStore={slug => onSelectStore(slug)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
