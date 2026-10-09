export interface MastercardDeal {
  id: string;
  brand: string;
  title: string;
  discount: string;
  discount_numeric?: number;
  discount_type?: string;
  ongoing_discount?: string;
  min_spend?: string;
  min_spend_numeric?: number;
  coupon?: string;
  url?: string;
  image?: string;
  category?: string;
  validity?: string;
  validity_code?: string;
  valid_days?: number[];
  terms_bullets?: string[];
  description?: string;
  updated_at?: string;
}

export interface DealValidityInfo {
  status: 'active_today' | 'upcoming' | 'expired';
  label: string;
  subLabel?: string;
  activeDiscount: string;
  badgeClass: string;
  dotClass: string;
  isExpired: boolean;
  isTiered?: boolean;
}

export function getDealValidityStatus(deal: MastercardDeal, date: Date = new Date()): DealValidityInfo {
  const todayDay = date.getDate();
  const vCode = deal.validity_code || 'only_10th';
  const validDays = Array.isArray(deal.valid_days) && deal.valid_days.length > 0 ? deal.valid_days : null;

  // 1. Tiered Deals (Airalo, VOYE): Peak on 10-11, ongoing discount rest of month
  if (vCode === '10_11th_and_all_month' || deal.ongoing_discount) {
    const ongoingText = deal.ongoing_discount || 'הנחה לכל החודש';
    const isPeak = todayDay === 10 || todayDay === 11;
    if (isPeak) {
      return {
        status: 'active_today',
        label: `בתוקף היום! (${deal.discount} שיא)`,
        subLabel: `${ongoingText} בשאר החודש`,
        activeDiscount: deal.discount,
        badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/50',
        dotClass: 'bg-emerald-300',
        isExpired: false,
        isTiered: true
      };
    } else {
      return {
        status: 'active_today',
        label: `בתוקף היום! (${ongoingText})`,
        subLabel: `${deal.discount} ב-10-11 בחודש`,
        activeDiscount: ongoingText,
        badgeClass: 'bg-emerald-600/90 text-white border-emerald-500/50',
        dotClass: 'bg-emerald-300',
        isExpired: false,
        isTiered: true
      };
    }
  }

  // 2. Exact valid_days support (Hollandia [10, 11], Soltam [8..15], Lenovo [10..13], Walla Shops [9..11])
  if (validDays) {
    const isAllMonth = validDays.length >= 28;
    const minDay = Math.min(...validDays);
    const maxDay = Math.max(...validDays);
    if (validDays.includes(todayDay)) {
      const label = isAllMonth ? 'בתוקף היום! (כל החודש)' : `בתוקף היום! (${deal.validity || ''})`;
      return {
        status: 'active_today',
        label: label.trim(),
        activeDiscount: deal.discount,
        badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/50',
        dotClass: 'bg-emerald-300',
        isExpired: false
      };
    } else if (todayDay > maxDay) {
      return {
        status: 'expired',
        label: 'פג תוקף לחודש זה',
        activeDiscount: deal.discount,
        badgeClass: 'bg-slate-700/90 text-slate-300 border-slate-600',
        dotClass: 'bg-slate-400',
        isExpired: true
      };
    } else {
      return {
        status: 'upcoming',
        label: `החל מ-${minDay} בחודש`,
        activeDiscount: deal.discount,
        badgeClass: 'bg-amber-500/90 text-slate-950 border-amber-400',
        dotClass: 'bg-amber-300',
        isExpired: false
      };
    }
  }

  // 3. Fallback: All Month deals
  if (vCode === 'all_month') {
    return {
      status: 'active_today',
      label: 'בתוקף היום! (כל החודש)',
      activeDiscount: deal.discount,
      badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/50',
      dotClass: 'bg-emerald-300',
      isExpired: false
    };
  }

  // 4. Fallback: 10_11th deals
  if (vCode === '10_11th') {
    if (todayDay === 10 || todayDay === 11) {
      return {
        status: 'active_today',
        label: 'בתוקף היום! (10-11 בחודש)',
        activeDiscount: deal.discount,
        badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/50',
        dotClass: 'bg-emerald-300',
        isExpired: false
      };
    } else if (todayDay > 11) {
      return {
        status: 'expired',
        label: 'פג תוקף לחודש זה',
        activeDiscount: deal.discount,
        badgeClass: 'bg-slate-700/90 text-slate-300 border-slate-600',
        dotClass: 'bg-slate-400',
        isExpired: true
      };
    } else {
      return {
        status: 'upcoming',
        label: 'החל מ-10-11 בחודש',
        activeDiscount: deal.discount,
        badgeClass: 'bg-amber-500/90 text-slate-950 border-amber-400',
        dotClass: 'bg-amber-300',
        isExpired: false
      };
    }
  }

  // 5. Fallback: 10th Only deals
  if (todayDay === 10) {
    return {
      status: 'active_today',
      label: 'בתוקף היום בלבד!',
      activeDiscount: deal.discount,
      badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/50',
      dotClass: 'bg-emerald-300',
      isExpired: false
    };
  } else if (todayDay > 10) {
    return {
      status: 'expired',
      label: 'פג תוקף לחודש זה',
      activeDiscount: deal.discount,
      badgeClass: 'bg-slate-700/90 text-slate-300 border-slate-600',
      dotClass: 'bg-slate-400',
      isExpired: true
    };
  } else {
    return {
      status: 'upcoming',
      label: 'החל מה-10 בחודש',
      activeDiscount: deal.discount,
      badgeClass: 'bg-amber-500/90 text-slate-950 border-amber-400',
      dotClass: 'bg-amber-300',
      isExpired: false
    };
  }
}

export const HEBREW_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function getNextMastercardDay() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Day 1: 10th at 10:00:00 through 23:59:59
  const day1Start = new Date(currentYear, currentMonth, 10, 10, 0, 0);
  const day1End = new Date(currentYear, currentMonth, 10, 23, 59, 59);
  // Day 2: 11th until 23:59:59
  const day2End = new Date(currentYear, currentMonth, 11, 23, 59, 59);

  if (now >= day1Start && now <= day1End) {
    return {
      isLive: true,
      targetDate: day1End,
      title: '🔥 יום מאסטרקארד בשיאו! הטבות ה-10 בחודש מסתיימות הלילה בעוד:'
    };
  }
  if (now > day1End && now <= day2End) {
    return {
      isLive: true,
      targetDate: day2End,
      title: '⚡ יום 2 של יום מאסטרקארד! הטבות ה-10-11 מסתיימות הלילה בעוד:'
    };
  }
  if (now < day1Start) {
    const monthName = HEBREW_MONTH_NAMES[currentMonth];
    return {
      isLive: false,
      targetDate: day1Start,
      title: `ספירה לאחור לפתיחה (10 ב${monthName} ב-10:00)`
    };
  }
  // 12th onwards: countdown to the 10th of next month at 10:00 AM
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthName = HEBREW_MONTH_NAMES[nextMonth];
  return {
    isLive: false,
    targetDate: new Date(nextYear, nextMonth, 10, 10, 0, 0),
    title: `ספירה לאחור ל-10 ב${nextMonthName} ב-10:00`
  };
}

export function getCalendarContext() {
  const now = new Date();
  const todayDay = now.getDate();
  const dateFormatted = now.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  let statusExplanation = '';
  let dotClass = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';

  if (todayDay === 10) {
    dotClass = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
    statusExplanation = '🔥 יום מאסטרקארד בשיאו! כל 44 ההטבות והקופונים פעילים וממתינים למימוש היום.';
  } else if (todayDay === 11) {
    dotClass = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
    statusExplanation = '⚡ יום 2 של יום מאסטרקארד! הטבות מובילות (כגון Hollandia, VOYE, Airalo, Soltam, Lenovo ו-Walla Shops) עדיין בתוקף היום ומסתיימות הלילה בחצות!';
  } else if (todayDay > 11) {
    dotClass = 'w-2 h-2 rounded-full bg-slate-400';
    statusExplanation = 'הטבות מתמשכות (כמו Airalo, VOYE ו-Booking) פעילות בכל ימות החודש. מבצעי ה-10 בחודש יתחדשו במלואם ב-10 לחודש הבא.';
  } else {
    dotClass = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    statusExplanation = 'מתכוננים ל-10 בחודש הקרוב! מבצעי ה-10 בחודש ייפתחו ב-10:00 בבוקר.';
  }

  return {
    todayText: `היום: ${dateFormatted} (יום ${todayDay} בחודש)`,
    dotClass,
    statusExplanation
  };
}
