import React from 'react';
import { MastercardCountdown } from '../MastercardCountdown';
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const MastercardTermsView: React.FC = () => {
  const steps = [
    {
      num: '1',
      title: 'החזקת כרטיס Mastercard',
      desc: 'ההטבות פתוחות לכל מחזיקי כרטיסי אשראי Mastercard תקפים שהונפקו בישראל.'
    },
    {
      num: '2',
      title: 'העתקת קוד הקופון',
      desc: 'מעתיקים בלחיצה אחת את קוד הקופון הייעודי (לרוב MASTERCARDAY).'
    },
    {
      num: '3',
      title: 'מימוש ב-10 לחודש',
      desc: 'מזינים את הקוד בקופת אתר הרשת ומשלמים בכרטיס המאסטרקארד שלכם.'
    }
  ];

  const faqs = [
    {
      q: 'מהו Mastercard Day?',
      a: 'חגיגת קניות והנחות חודשית הנערכת בכל 10 לחודש קלנדרי, הכוללת עשרות הטבות בלעדיות ברשתות מובילות בארץ ובעולם.'
    },
    {
      q: 'מי זכאי להטבות?',
      a: 'כל לקוח המחזיק בכרטיס אשראי Mastercard ישראלי בתוקף (חוץ בנקאי ובנקאי כאחד).'
    },
    {
      q: 'באילו שעות המבצעים תקפים?',
      a: 'המבצעים פעילים החל מחצות (00:00) ב-10 לחודש ועד השעה 23:59 באותו יום, אלא אם צוין אחרת בדף ההטבה.'
    },
    {
      q: 'האם ההטבות כוללות כפל מבצעים?',
      a: 'מרבית ההטבות כוללות כפל מבצעי אתר של הרשת, אך ללא כפל קופונים. יש לעיין בתנאי ההטבה הספציפית.'
    },
    {
      q: 'האם יש מינימום הזמנה?',
      a: 'חלק מההטבות מותנות במינימום רכישה (למשל הנחה של 200 ₪ ברכישה מעל 2,000 ₪). פרטי המינימום מפורטים בכל כרטיס הטבה.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Live Countdown Banner */}
      <MastercardCountdown />

      {/* How it works 3-step guide */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
            איך מממשים את הטבות Mastercard Day?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/60 relative"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center mb-3 shadow-md shadow-amber-500/20">
                {s.num}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                {s.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
            שאלות ותשובות נפוצות (FAQ)
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
            >
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                {faq.q}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Official Terms Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">תקנון כללי והבהרות:</span>
          <span>
            מתן ההטבה וטיב המוצרים והשירותים הינם באחריות בית העסק בלבד. המבצעים תקפים ברכישה מקוונת באתרים המשתתפים באמצעות כרטיס מאסטרקארד ישראלי בלבד. ט.ל.ח.
          </span>
        </div>
      </div>
    </div>
  );
};
