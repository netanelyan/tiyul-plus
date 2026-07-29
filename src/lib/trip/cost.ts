import type { DailyBudget, DailyCost, DailyCostTier, PlaceSource } from '@/lib/types';
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

/**
 * מה שצריך לדעת על עיר כדי לחשב. **שני מקורות, בכוונה.**
 *
 * `dailyCost` (src/data/dailyCosts.ts) מחזיק את שלוש שורות הקטגוריות
 * שהמקור מפרסם לכל סגנון, ולכן אפשר לגזור ממנו גם "בנוח" וגם טווח
 * שאפשר להסביר. `dailyBudget` (בתוך הקטלוג) מחזיק טווח מפורסם לשתי
 * מדרגות בלבד ומכסה הרבה יותר יעדים. **הראשון קודם כשהוא קיים**, כי
 * הוא מכסה את שלושת הסגנונות; השני מרחיב את הכיסוי מ-21 ל-71 יעדים.
 *
 * שניהם עומדים באותה הגדרה - הוצאה על הקרקע, בלי טיסות ובלי לינה -
 * ולכן מותר לסכם אותם יחד. כל מה ש**שונה** ביניהם נשמר בשורה עצמה
 * (`basis`, `scope`, `upperBoundOnly`) ומוצג, במקום להיטשטש בסכום.
 */
export interface CostCity {
  name: string;
  dailyCost?: DailyCost;
  dailyBudget?: DailyBudget;
}

/** 'components' = חיבור שורות הקטגוריות · 'published' = טווח שהמקור פרסם */
export type CostBasis = 'components' | 'published';

interface ResolvedDaily {
  currency: string;
  low: number;
  high: number;
  source: PlaceSource;
  basis: CostBasis;
  scope: 'city' | 'country';
  upperBoundOnly: boolean;
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
  source: PlaceSource;
  basis: CostBasis;
  /** 'country' = המקור מפרסם ברמת המדינה, כלומר גס יותר מהעיר */
  scope: 'city' | 'country';
  /** הערך הוא חסם עליון ("עד"), לא טווח - ראה DailyBudget */
  upperBoundOnly: boolean;
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
  /** הבסיסים שבשימוש בפועל - קובע איזה הסבר על הטווח מותר להציג */
  bases: CostBasis[];
  /** יש שורה שהמקור שלה מודד ברמת המדינה ולא ברמת העיר */
  hasCountryScope: boolean;
  /** יש שורה שהיא חסם עליון ולא טווח - הסכום נקרא "עד" */
  hasUpperBound: boolean;
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

/**
 * הנתון של עיר לסגנון מסוים, מאיזה משני המקורות שיש לה - או null.
 *
 * **null הוא תשובה תקינה ושכיחה**, ולא רק כשאין לעיר נתון בכלל:
 * ל-`dailyBudget` אין מדרגת "בנוח" באף יעד (המקור מפרסם מדרגה עליונה
 * פתוחה מלמעלה, ואי אפשר להפחית ממנה לינה), ולכן עיר שנשענת עליו לא
 * מציגה מספר כשנבחר "בנוח". זה בדיוק הכלל של הפיצ׳ר - אין נתון, אין
 * הערכה - רק שהפעם הוא חל על צירוף של עיר וסגנון ולא על עיר שלמה.
 */
export function resolveDaily(city: CostCity | undefined, style: TravelStyle): ResolvedDaily | null {
  if (city?.dailyCost) {
    const { low, high } = perDayRange(city.dailyCost, style);
    return {
      currency: city.dailyCost.currency,
      low,
      high,
      source: city.dailyCost.source,
      basis: 'components',
      scope: 'city',
      upperBoundOnly: false,
    };
  }
  const b = city?.dailyBudget;
  if (!b) return null;
  const range = style === 'budget' ? b.budget : style === 'mid' ? b.midRange : b.comfortable;
  if (!range) return null;
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return {
    currency: b.currency,
    low,
    high,
    source: b.source,
    basis: 'published',
    scope: b.scope ?? 'city',
    upperBoundOnly: b.upperBoundOnly === true,
  };
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

  const bases = new Set<CostBasis>();

  for (const { citySlug, days } of daysPerCity(trip)) {
    const city = cities[citySlug];
    const cityName = city?.name ?? citySlug;
    const daily = resolveDaily(city, style);
    if (!daily) {
      missing.push({ citySlug, cityName, days });
      continue;
    }
    const totalLow = daily.low * days;
    const totalHigh = daily.high * days;
    lines.push({
      citySlug,
      cityName,
      days,
      currency: daily.currency,
      perDayLow: daily.low,
      perDayHigh: daily.high,
      totalLow,
      totalHigh,
      source: daily.source,
      basis: daily.basis,
      scope: daily.scope,
      upperBoundOnly: daily.upperBoundOnly,
    });
    checked.add(daily.source.checked);
    bases.add(daily.basis);
    const acc = totals.get(daily.currency) ?? { currency: daily.currency, low: 0, high: 0 };
    acc.low += totalLow;
    acc.high += totalHigh;
    totals.set(daily.currency, acc);
  }

  return {
    style,
    lines,
    missing,
    totals: [...totals.values()],
    complete: missing.length === 0 && lines.length > 0,
    checked: [...checked].sort(),
    bases: [...bases],
    hasCountryScope: lines.some((l) => l.scope === 'country'),
    hasUpperBound: lines.some((l) => l.upperBoundOnly),
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
