import type { DailyCost, DailyCostTier } from '@/lib/types';
import type { Trip } from './types';

/**
 * החשבון של עלות הטיול. **כל מה שקורה כאן הוא חיבור וכפל על נתונים
 * שמורים** - אין כאן הערכה, אין תחזית, ואין שום מקום שבו מודל שפה
 * נוגע במספר. הקלט הוא הטבלה שהמקור פרסם (`DailyCost`) ומספר הימים
 * שהטיול מקצה לכל עיר; הפלט הוא בדיוק הסכום של אלה.
 */

/** סגנון הנסיעה שהמטייל בחר. נבחר פעם אחת, ידנית, ולא נגזר משום דבר. */
export type TravelStyle = 'budget' | 'mid' | 'comfort';

export const TRAVEL_STYLES: { id: TravelStyle; label: string; hint: string }[] = [
  { id: 'budget', label: 'חסכוני', hint: 'אוכל רחוב ותחבורה ציבורית' },
  { id: 'mid', label: 'ביניים', hint: 'מסעדות רגילות, כניסה לאתרים' },
  { id: 'comfort', label: 'בנוח', hint: 'מסעדות טובות, מוניות, סיורים' },
];

export function isTravelStyle(v: unknown): v is TravelStyle {
  return v === 'budget' || v === 'mid' || v === 'comfort';
}

/** מה שצריך לדעת על עיר כדי לחשב - שם לתצוגה, ואולי נתון עלות. */
export interface CostCity {
  name: string;
  dailyCost?: DailyCost;
}

export interface CityCostLine {
  citySlug: string;
  cityName: string;
  days: number;
  currency: string;
  /** ליום, לאדם: המינימום (תחבורה ואוכל) והמקסימום (ועוד כניסות) */
  perDayLow: number;
  perDayHigh: number;
  /** מוכפל במספר הימים של העיר הזאת בטיול */
  totalLow: number;
  totalHigh: number;
  source: DailyCost['source'];
}

export interface CurrencyTotal {
  currency: string;
  low: number;
  high: number;
}

export interface TripCost {
  style: TravelStyle;
  /** ערים עם נתון, לפי סדר ההופעה הראשונה שלהן בטיול */
  lines: CityCostLine[];
  /** ערים בטיול שאין להן נתון - מוצגות בשמן, בלי שום מספר */
  missing: { citySlug: string; cityName: string; days: number }[];
  /** סכום לכל מטבע. טיול בכמה מטבעות לא מסוכם למספר אחד. */
  totals: CurrencyTotal[];
  /** false ברגע שיש ולו עיר אחת בלי נתון - הסכום מוצג כחלקי */
  complete: boolean;
  /** תאריכי הבדיקה של המקורות שבשימוש, ממוינים */
  checked: string[];
}

function tierOf(cost: DailyCost, style: TravelStyle): DailyCostTier {
  return style === 'budget' ? cost.budget : style === 'mid' ? cost.mid : cost.comfort;
}

/**
 * הטווח היומי, ושני הקצוות שלו הם עובדה ולא מרווח ביטחון שהמצאנו:
 * התחתון הוא תחבורה ואוכל - מה שמוציאים בכל יום בלי יוצא מן הכלל -
 * והעליון מוסיף את שורת הכניסות והאטרקציות, כלומר יום שיש בו כניסה
 * בתשלום. בפועל טיול הוא תערובת של שני סוגי הימים, ולכן טווח.
 */
export function perDayRange(cost: DailyCost, style: TravelStyle): { low: number; high: number } {
  const t = tierOf(cost, style);
  const low = t.transport + t.food;
  return { low, high: low + t.activities };
}

/** כמה ימים הטיול מקצה לכל עיר, לפי סדר ההופעה הראשונה. */
export function daysPerCity(trip: Pick<Trip, 'days'>): { citySlug: string; days: number }[] {
  const order: string[] = [];
  const count = new Map<string, number>();
  for (const d of trip.days) {
    if (!count.has(d.citySlug)) order.push(d.citySlug);
    count.set(d.citySlug, (count.get(d.citySlug) ?? 0) + 1);
  }
  return order.map((citySlug) => ({ citySlug, days: count.get(citySlug) ?? 0 }));
}

/**
 * החישוב המלא. `cities` הוא מה שהמסך כבר טען ממילא (`useCityData`),
 * כך שאין כאן שום קריאה לרשת ושום צד-אפקט.
 *
 * עיר שאין לה נתון **לא נופלת מהסכום בשקט**: היא נכנסת ל-`missing`,
 * `complete` הופך ל-false, והממשק חייב לומר את זה. זה הכלל היחיד כאן
 * שאינו אריתמטיקה, והוא הסיבה שהפונקציה מחזירה גם את מה שחסר.
 */
export function tripCost(
  trip: Pick<Trip, 'days'>,
  style: TravelStyle,
  cities: Record<string, CostCity | undefined>,
): TripCost {
  const lines: CityCostLine[] = [];
  const missing: TripCost['missing'] = [];
  const totals = new Map<string, CurrencyTotal>();
  const checked = new Set<string>();

  for (const { citySlug, days } of daysPerCity(trip)) {
    const city = cities[citySlug];
    const cost = city?.dailyCost;
    const cityName = city?.name ?? citySlug;
    if (!cost) {
      missing.push({ citySlug, cityName, days });
      continue;
    }
    const { low, high } = perDayRange(cost, style);
    const totalLow = low * days;
    const totalHigh = high * days;
    lines.push({
      citySlug,
      cityName,
      days,
      currency: cost.currency,
      perDayLow: low,
      perDayHigh: high,
      totalLow,
      totalHigh,
      source: cost.source,
    });
    checked.add(cost.source.checked);
    const acc = totals.get(cost.currency) ?? { currency: cost.currency, low: 0, high: 0 };
    acc.low += totalLow;
    acc.high += totalHigh;
    totals.set(cost.currency, acc);
  }

  return {
    style,
    lines,
    missing,
    totals: [...totals.values()],
    complete: missing.length === 0 && lines.length > 0,
    checked: [...checked].sort(),
  };
}

/**
 * עיגול לתצוגה. שני שיקולים נגדיים, וזה הפשרה ביניהם: מצד אחד
 * "14,708.32 פורינט" משדר דיוק שלא קיים - הנתון במקור הוא ממוצע של
 * דיווחים. מצד שני **המספר המוצג צריך להישאר ניתן לשחזור ביד** מול
 * הטבלה במקור, אחרת "כל תא הוא ציטוט והסכום הוא חשבון" מפסיק להיות
 * בדיק. לכן מתחת ל-1,000 לא מעגלים בכלל (סכום של שלמים נשאר שלם),
 * ומעל זה העיגול מתגסה. פעולה על התצוגה בלבד - `TripCost` מחזיק את
 * הערך המדויק.
 */
export function roundForDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  const step = abs >= 10000 ? 1000 : abs >= 1000 ? 100 : 1;
  return Math.round(value / step) * step;
}

/** סימן המטבע כפי שהמקור הציג אותו. מטבע לא מוכר מוצג בקוד שלו. */
const CURRENCY_LABEL: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CZK: 'Kč',
  HUF: 'Ft',
  PLN: 'zł',
  THB: '฿',
  AED: 'AED',
  GEL: 'GEL',
  ILS: '₪',
};

export function currencyLabel(code: string): string {
  return CURRENCY_LABEL[code] ?? code;
}

/**
 * מספר אחד עם המטבע. הפורמט מכוון להיקרא בתוך שורה בעברית: הפרדת
 * אלפים בפסיק, והמטבע צמוד למספר - הצמד כולו מוגש ב-LTR מבודד בממשק,
 * אחרת שני מספרים שנפגשים בשורה RTL נדבקים זה לזה (הבאג של "יום 110
 * באוגוסט" מהתאריכים).
 */
export function formatAmount(value: number, currency: string): string {
  const label = currencyLabel(currency);
  const n = roundForDisplay(value).toLocaleString('en-US');
  return label.length === 1 ? `${label}${n}` : `${n} ${label}`;
}

/** טווח, אחרי עיגול. אם שני הקצוות מתעגלים לאותו מספר - מוצג מספר אחד. */
export function formatRange(low: number, high: number, currency: string): string {
  const a = roundForDisplay(low);
  const b = roundForDisplay(high);
  if (a === b) return formatAmount(a, currency);
  return `${formatAmount(a, currency)}-${formatAmount(b, currency)}`;
}
