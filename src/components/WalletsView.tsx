import React, { useEffect, useState } from 'react';
import { WalletsInfoData, WalletItem } from '../types/wallet';
import { ViewModeToggle } from './ViewModeToggle';
import { useSearch } from '../context/SearchContext';
import { CreditCard, Shield, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export const WalletsView: React.FC = () => {
  const { viewMode } = useSearch();
  const [data, setData] = useState<WalletsInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data/wallets_info.json')
      .then(res => res.json())
      .then((json: WalletsInfoData) => {
        setData(json);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load wallets_info:', err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">טוען נתוני ארנקים דיגיטליים ותקרות...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
        <p>לא ניתן היה לטעון את נתוני הארנקים כעת</p>
      </div>
    );
  }

  const caps = data.metadata.general_caps;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      {/* Top Caps Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-semibold">תקרה חודשית (כללי)</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₪{caps.monthly_cap_general.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">חודש קלנדרי לארנקי רשתות</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-semibold">תקרה חודשית (פייטר)</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₪{caps.monthly_cap_fighter.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">כרטיס פייטר למשרתים פעילים</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-semibold">תקרת יתרה רגעית</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₪{caps.instant_balance_cap.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">ניתן לטעון מחדש לאחר מימוש</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">טעינה מינימלית</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₪{caps.min_reload}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">מינימום להזמנת טעינה</p>
        </div>
      </div>

      {/* 6 Digital Wallets Section */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            6 הארנקים הדיגיטליים של מועדון בהצדעה
          </h3>
          <ViewModeToggle />
        </div>

        {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ארנק דיגיטלי</th>
                    <th className="py-3 px-4">הנחה בטעינה</th>
                    <th className="py-3 px-4">רשתות מכבדות</th>
                    <th className="py-3 px-4">תקרה חודשית</th>
                    <th className="py-3 px-4">תקרה רגעית</th>
                    <th className="py-3 px-4">תחום ושימוש</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {data.wallets.map((wallet: WalletItem) => (
                    <tr key={wallet.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">
                          {wallet.short_name || wallet.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {wallet.description}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {wallet.discount}% הנחה
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {wallet.stores_count} רשתות
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        ₪{wallet.monthly_cap.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        ₪{wallet.instant_cap.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={wallet.category_scope}>
                        {wallet.category_scope}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.wallets.map((wallet: WalletItem) => (
              <div
                key={wallet.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      {wallet.discount}% הנחה בטעינה
                    </span>
                    <span className="text-xs text-slate-500">
                      {wallet.stores_count} רשתות מכבדות
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">
                    {wallet.short_name || wallet.name}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {wallet.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>תקרה חודשית:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₪{wallet.monthly_cap.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>תקרה רגעית:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₪{wallet.instant_cap.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-1 text-slate-400 truncate" title={wallet.category_scope}>
                    תחום: {wallet.category_scope}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Rules Accordion */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          כללים, הגבלות וכפל מבצעים
        </h3>

        <div className="space-y-3">
          {data.metadata.general_rules.map(rule => {
            const isExpanded = expandedRule === rule.id;
            return (
              <div
                key={rule.id}
                className="border border-slate-100 dark:border-slate-700/60 rounded-xl p-3.5 transition"
              >
                <button
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  className="w-full flex items-center justify-between text-right font-medium text-sm text-slate-800 dark:text-slate-200"
                >
                  <span>{rule.title}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isExpanded && (
                  <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700/40 pt-2">
                    {rule.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
