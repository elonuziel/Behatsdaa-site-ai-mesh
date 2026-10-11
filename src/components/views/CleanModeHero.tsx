import React from 'react';
import { useSearch } from '../../context/SearchContext';
import { useChat } from '../../context/ChatContext';
import {
  Sparkles,
  Store,
  SlidersHorizontal,
  ChevronLeft,
  Bot
} from 'lucide-react';

interface CleanModeHeroProps {
  totalStoresCount: number;
  onShowAllShops: () => void;
}

const PRIMARY_CATEGORIES = [
  {
    name: 'מסעדות ובתי קפה',
    label: 'מסעדות ובתי קפה',
    icon: '🍕',
    color: 'from-amber-500/15 to-orange-500/10 border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300',
    count: '265+ מסעדות, פיצה ומשלוחים'
  },
  {
    name: 'אופנה ולייף סטייל',
    label: 'אופנה ולייף סטייל',
    icon: '👟',
    color: 'from-blue-500/15 to-indigo-500/10 border-blue-200/80 dark:border-blue-900/60 text-blue-800 dark:text-blue-300',
    count: '120+ רשתות ביגוד והנעלה'
  },
  {
    name: 'רשתות שיווק מזון ופארמה',
    label: 'סופרמרקט ומזון',
    icon: '🛒',
    color: 'from-emerald-500/15 to-teal-500/10 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300',
    count: 'שופרסל, קרפור, יוחננוף'
  },
  {
    name: 'חשמל וטכנולוגיה',
    label: 'מחשבים וחשמל',
    icon: '💻',
    color: 'from-purple-500/15 to-violet-500/10 border-purple-200/80 dark:border-purple-900/60 text-purple-800 dark:text-purple-300',
    count: 'KSP, אייבורי, סלולר'
  },
  {
    name: 'אירוח ונופש',
    label: 'תיירות ונופש',
    icon: '✈️',
    color: 'from-sky-500/15 to-cyan-500/10 border-sky-200/80 dark:border-sky-900/60 text-sky-800 dark:text-sky-300',
    count: '100+ מלונות, צימרים ונופש'
  },
  {
    name: 'בילוי ופנאי',
    label: 'בילוי, תרבות ומופעים',
    icon: '🎬',
    color: 'from-rose-500/15 to-pink-500/10 border-rose-200/80 dark:border-rose-900/60 text-rose-800 dark:text-rose-300',
    count: '150+ אטרקציות ומופעים'
  },
  {
    name: 'ספא וטיפולים משלימים',
    label: 'ספא ובריאות',
    icon: '💆',
    color: 'from-teal-500/15 to-emerald-500/10 border-teal-200/80 dark:border-teal-900/60 text-teal-800 dark:text-teal-300',
    count: '130+ חבילות ספא וכושר'
  },
  {
    name: 'רכישה אונליין',
    label: 'רכישה אונליין ושוברים',
    icon: '🎁',
    color: 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/80 dark:border-violet-900/60 text-violet-800 dark:text-violet-300',
    count: '70+ שוברים ואתרי קניות'
  },
];

const POPULAR_SEARCH_ITEMS = [
  { label: '🍕 פיצה ומסעדות', val: 'פיצה' },
  { label: '⛽ דלק ותחבורה', val: 'דלק' },
  { label: '🛒 שופרסל וקרפור', val: 'סופר' },
  { label: '👟 מגה ספורט', val: 'מגה ספורט' },
  { label: '🛍️ Terminal X', val: 'terminal x' },
  { label: '💻 KSP ומחשבים', val: 'ksp' },
  { label: '🎬 סינמה סיטי (33 ₪)', val: 'סינמה סיטי' },
  { label: '☕ קפה ומאפה', val: 'קפה' },
  { label: '📱 eSIM לחו״ל', val: 'esim' },
];

export const CleanModeHero: React.FC<CleanModeHeroProps> = ({
  totalStoresCount,
  onShowAllShops
}) => {
  const { setSelectedCategory, setQuery, toggleUiDensity } = useSearch();
  const { openChat } = useChat();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-2xs space-y-7 animate-in fade-in-50 duration-150">
      {/* Clean Mode Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>מצב נקי וממוקד</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white pt-1">
            במה תרצה לחסוך היום?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            החנויות מוסתרות כברירת מחדל לשמירה על ממשק נקי ומקצועי. בחר קטגוריה, חפש מותג, או פתח את כל הרשתות.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={onShowAllShops}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>הצג את כל {totalStoresCount.toLocaleString()} הרשתות</span>
          </button>

          <button
            type="button"
            onClick={toggleUiDensity}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="מעבר לתצוגה מפורטת מלאה המציגה את כל החנויות והסרגלים באופן קבוע"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">מצב מפורט</span>
          </button>
        </div>
      </div>

      {/* Category Cards with Colors & Icons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>בחר קטגוריה לפתיחת הרשתות וההנחות:</span>
          <span className="text-slate-400 font-normal">8 קטגוריות ראשיות</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRIMARY_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`p-3.5 rounded-2xl bg-gradient-to-br ${cat.color} border hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer text-right flex flex-col justify-between min-h-[96px] shadow-2xs group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{cat.icon}</span>
                <ChevronLeft className="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:-translate-x-0.5 transition" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {cat.label || cat.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {cat.count}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
          חיפושים נפוצים בלחיצה:
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {POPULAR_SEARCH_ITEMS.map(item => (
            <button
              key={item.val}
              type="button"
              onClick={() => setQuery(item.val)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/40 border border-indigo-200/70 dark:border-indigo-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                סייר AI חכם מבוסס Gemini
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-600 text-white">
                10,000+ עסקים
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              חיפוש חופשי בשפה טבעית בכל 10,000+ בתי העסק, הסניפים, הרשתות וההנחות במעמד החיוב.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openChat()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-center whitespace-nowrap"
        >
          שאל את סייר ה-AI
        </button>
      </div>
    </div>
  );
};
