export type ClubId = 'behatsdaa' | 'uniq' | 'mastercard';

export interface ClubConfig {
  id: ClubId;
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  activeBg: string;
  accentColor: string;
  description: string;
  lastUpdated: string;
  lastUpdatedFormatted: string;
}

export const CLUBS: Record<ClubId, ClubConfig> = {
  behatsdaa: {
    id: 'behatsdaa',
    name: 'מועדון בהצדעה',
    shortName: 'בהצדעה',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
    accentColor: '#10b981',
    description: 'הטבות וארנקים נטענים לחיילי מילואים ומשוחררים',
    lastUpdated: '2026-10-07T03:53:21Z',
    lastUpdatedFormatted: '07.10.2026'
  },
  uniq: {
    id: 'uniq',
    name: 'מועדון UNIQ',
    shortName: 'UNIQ',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-700',
    activeBg: 'bg-purple-600 text-white border-purple-600',
    accentColor: '#8b5cf6',
    description: 'מועדון האקדמאים - 15% הנחה בטעינה ומבצעי רשת',
    lastUpdated: '2026-10-11T09:47:04Z',
    lastUpdatedFormatted: '11.10.2026'
  },
  mastercard: {
    id: 'mastercard',
    name: 'Mastercard Day',
    shortName: 'Mastercard Day',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700',
    activeBg: 'bg-amber-500 text-white border-amber-500',
    accentColor: '#f59e0b',
    description: 'חגיגת קניות והנחות בלעדיות ב-10 לכל חודש',
    lastUpdated: '2026-10-11T12:37:18Z',
    lastUpdatedFormatted: '11.10.2026'
  }
};
