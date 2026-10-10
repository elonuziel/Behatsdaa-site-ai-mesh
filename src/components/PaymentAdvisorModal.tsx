import React, { useEffect, useState } from 'react';
import { UnifiedStore } from '../types/store';
import { useClubs } from '../context/ClubContext';
import { usePaymentAdvisor } from '../hooks/usePaymentAdvisor';
import { ClubBadge } from './ClubBadge';
import { useToast } from '../context/ToastContext';
import {
  X,
  Sparkles,
  ExternalLink,
  Award,
  Copy,
  Check,
  Tag,
  AlertCircle,
  CreditCard,
  Filter
} from 'lucide-react';

interface PaymentAdvisorModalProps {
  slug: string | null;
  onClose: () => void;
  onSelectDeal?: (id: string) => void;
  onSelectCard?: (cardName: string) => void;
}

export const PaymentAdvisorModal: React.FC<PaymentAdvisorModalProps> = ({
  slug,
  onClose,
  onSelectDeal,
  onSelectCard
}) => {
  const { activeClubs } = useClubs();
  const { showToast } = useToast();

  const [store, setStore] = useState<UnifiedStore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setStore(null);
      return;
    }

    setIsLoading(true);
    fetch(`./data/stores/${encodeURIComponent(slug)}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: UnifiedStore) => {
        setStore(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load store detail:', err);
        setIsLoading(false);
      });
  }, [slug]);

  const strategy = usePaymentAdvisor(store, activeClubs);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => showToast('שגיאה בהעתקת הקוד', 'warning'));
  };

  const handleFilterByCard = (cardName: string) => {
    if (onSelectCard) {
      onSelectCard(cardName);
      onClose();
    }
  };

  if (!slug) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">טוען נתוני רשת ויועץ תשלום...</p>
          </div>
        ) : !store ? (
          <div className="py-16 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <p>לא נמצאו נתונים עבור רשת זו</p>
          </div>
        ) : (
          <div>
            {/* Header: Store Name & Clubs */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {(store.clubs || ['behatsdaa']).map(c => (
                <ClubBadge key={c} clubId={c} size="md" />
              ))}
              <span className="text-xs text-slate-400">{store.category}</span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {store.name}
                </h2>
                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                  >
                    <span>ביקור באתר הרשת</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {store.max_discount > 0 && (
                <div className="text-left shrink-0">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    עד {store.max_discount}%
                  </span>
                  <span className="block text-[11px] text-slate-500">חיסכון מרבי</span>
                </div>
              )}
            </div>

            {/* Advisor Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>יועץ מסלול תשלום חכם (Best Payment Strategy)</span>
              </div>

              {/* Best Option Card */}
              {strategy.bestOption ? (
                <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-2 border-emerald-500/80 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            ההמלצה המשתלמת ביותר
                          </span>
                          <ClubBadge clubId={strategy.bestOption.club} size="sm" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                          {strategy.bestOption.label}
                        </h4>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {strategy.bestOption.rate > 0
                          ? strategy.bestOption.rateType === 'percent'
                            ? `${strategy.bestOption.rate}%`
                            : `₪${strategy.bestOption.rate}`
                          : 'הטבה'}
                      </span>
                      <span className="block text-[10px] text-slate-500">הנחה</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 leading-relaxed">
                    💡 {strategy.recommendationText}
                  </p>

                  {/* Charge link if loaded card */}
                  {strategy.bestOption.type === 'loaded_card' && (
                    <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-300/80 dark:border-emerald-700/80">
                      <a
                        href={strategy.bestOption.url || "https://www.behatsdaa.org.il/card/chargingCard"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>טען/רכוש כרטיס נטען באתר בהצדעה 🔗</span>
                      </a>
                      {onSelectCard && strategy.bestOption.card_name && (
                        <button
                          onClick={() => handleFilterByCard(strategy.bestOption!.card_name!)}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold hover:bg-emerald-200 transition"
                        >
                          <Filter className="w-3 h-3" />
                          <span>סינון לפי כרטיס זה</span>
                        </button>
                      )}
                    </div>
                  )}

                  {strategy.bestOption.code && (
                    <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        קוד קופון: {strategy.bestOption.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(strategy.bestOption!.code!)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        {copiedCode === strategy.bestOption.code ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>הועתק!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>העתק</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  {strategy.recommendationText}
                </div>
              )}

              {/* Alternative Options */}
              {strategy.options.length > 1 && (
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                    אפשרויות תשלום נוספות עבור רשת זו:
                  </h4>
                  <div className="space-y-2">
                    {strategy.options.slice(1).map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ClubBadge clubId={opt.club} size="sm" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {opt.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {opt.rateType === 'percent' ? `${opt.rate}% הנחה` : `₪${opt.rate} הנחה`}
                          </span>
                          {opt.type === 'loaded_card' && (
                            <a
                              href={opt.url || "https://www.behatsdaa.org.il/card/chargingCard"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              טען כרטיס
                            </a>
                          )}
                          {opt.code && (
                            <button
                              onClick={() => handleCopyCode(opt.code!)}
                              className="p-1 text-slate-400 hover:text-emerald-600"
                              title="העתק קופון"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List of Store Rechargeable Cards with Direct Link & Filter */}
            {store.cards && store.cards.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    <span>כרטיסים נטענים המתאימים לרשת זו ({store.cards.length}):</span>
                  </h4>
                  <a
                    href="https://www.behatsdaa.org.il/card/chargingCard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>אתר הטעינה בהצדעה</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  {store.cards.map((c, i) => {
                    const cardName = typeof c === 'string' ? c : (c.card_name || 'כרטיס נטען');
                    const discount = typeof c === 'string' ? '' : (c.discount || (c.discount_numeric ? `${c.discount_numeric}%` : ''));
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {cardName}
                          </div>
                          {typeof c !== 'string' && c.notes && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {discount && (
                            <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                              {discount}
                            </span>
                          )}
                          <a
                            href="https://www.behatsdaa.org.il/card/chargingCard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                          >
                            טען כרטיס
                          </a>
                          {onSelectCard && (
                            <button
                              onClick={() => handleFilterByCard(cardName)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium hover:bg-emerald-100 hover:text-emerald-800 transition"
                              title="סינון הרשתות לפי כרטיס זה"
                            >
                              סינון
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked Deals */}
            {store.linked_deals && store.linked_deals.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>מבצעים ושוברים מקושרים לרשת זו:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {store.linked_deals.slice(0, 4).map(d => (
                    <button
                      key={d.id}
                      onClick={() => onSelectDeal && onSelectDeal(d.id)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs flex justify-between items-center text-right hover:border-amber-400 dark:hover:border-amber-500 transition cursor-pointer"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {d.title}
                      </span>
                      {d.price && (
                        <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0 mr-2">
                          ₪{d.price}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions / Terms */}
            {store.conditions && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-700 dark:text-slate-300">תנאים והגבלות: </span>
                {store.conditions}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
