import React from 'react';
import { MastercardDeal, getDealValidityStatus } from '../../utils/mastercardValidity';
import { useToast } from '../../context/ToastContext';
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react';

interface MastercardTableViewProps {
  deals: MastercardDeal[];
}

export const MastercardTableView: React.FC<MastercardTableViewProps> = ({ deals }) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedId(id);
        showToast(`קוד קופון "${code}" הועתק בהצלחה!`, 'success');
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => showToast('העתקת הקופון נכשלה', 'warning'));
  };

  const handleShare = (deal: MastercardDeal) => {
    const directUrl = deal.url || 'https://www.mastercard.com/il/he/%D7%90%D7%99%D7%A9%D7%99/find-a-card/card-benefits/mastercard-day.html';
    const textToShare = `${deal.brand} - ${deal.discount} במאסטרקארד דיי!\n${directUrl}`;
    if (navigator.share) {
      navigator.share({ title: deal.brand, text: textToShare, url: directUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(textToShare)
        .then(() => showToast(`פרטי ההטבה של ${deal.brand} הועתקו לשיתוף!`, 'success'))
        .catch(() => showToast('העתקה נכשלה', 'warning'));
    }
  };

  return (
    <div className="bg-white dark:bg-mc-cardDark rounded-2xl border border-slate-200/90 dark:border-mc-borderDark shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3.5 px-4">מותג / עסק</th>
              <th className="py-3.5 px-4">תוקף והפעלה</th>
              <th className="py-3.5 px-4">הנחה</th>
              <th className="py-3.5 px-4">מינימום קנייה</th>
              <th className="py-3.5 px-4">קוד קופון</th>
              <th className="py-3.5 px-4">עיקרי התנאים</th>
              <th className="py-3.5 px-4 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {deals.map(deal => {
              const vInfo = getDealValidityStatus(deal);
              const couponCode = deal.coupon || 'MASTERCARDAY';
              const directUrl = deal.url || 'https://www.mastercard.com/il/he/%D7%90%D7%99%D7%A9%D7%99/find-a-card/card-benefits/mastercard-day.html';
              const isCopied = copiedId === deal.id;

              return (
                <tr
                  key={deal.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition ${
                    vInfo.isExpired ? 'opacity-70' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {deal.brand}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${vInfo.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${vInfo.dotClass} ${vInfo.status === 'active_today' ? 'animate-pulse' : ''}`} />
                      <span>{vInfo.label}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300">
                      {deal.discount}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                    {deal.min_spend ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        מעל {deal.min_spend}
                      </span>
                    ) : (
                      <span className="text-slate-400">ללא מינימום</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs">
                      <span className="font-bold text-slate-800 dark:text-amber-400">{couponCode}</span>
                      <button
                        onClick={() => handleCopy(couponCode, deal.id)}
                        title="העתק קוד"
                        className="p-0.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={(deal.terms_bullets || []).join(' • ')}>
                    {(deal.terms_bullets || []).slice(0, 2).join(' • ') || deal.description || 'בכפוף לתקנון המלא'}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                        title="מעבר לאתר"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleShare(deal)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="שתף קישור"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
