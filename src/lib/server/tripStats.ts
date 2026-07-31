import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * שרת בלבד - **צבירה של שורות טיולים למספרים**, בלי גישה לרשת.
 *
 * מופרד מהנתיב בכוונה: זה החלק שאפשר לבדוק, ומספר שגוי בלוח מצב הוא
 * החלטה עסקית שגויה. הפונקציות כאן טהורות - נכנסות שורות, יוצאים
 * מספרים.
 *
 * **מה הלוח יכול לראות, ומה לא.** רק טיולים של משתמשים **מחוברים**
 * מסונכרנים ל-`user_trips`; טיול של מבקר אנונימי חי ב-localStorage
 * בלבד ואינו קיים בשרת. זו לא השמטה - זו התוצאה של לא לעקוב אחרי מי
 * שלא נרשם, וחשוב שהמספרים ייקראו ככה ולא כ"כל הטיולים בעולם".
 */

export interface TripRow {
  user_id: string;
  id: string;
  updated_at: string;
  data: unknown;
}

/** הצורה המינימלית שהצבירה מסתמכת עליה. שורה פגומה פשוט לא נספרת. */
interface TripShape {
  name?: unknown;
  citySlugs?: unknown;
  createdAt?: unknown;
  days?: unknown;
  pins?: unknown;
}

const COUNTRY_OF = new Map(destinations.map((d) => [d.slug, d.countrySlug]));
const CITY_NAME = new Map(destinations.map((d) => [d.slug, d.name]));
const COUNTRY_NAME = new Map(countries.map((c) => [c.slug, c.name]));

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface TripSummary {
  userId: string;
  id: string;
  name: string;
  citySlugs: string[];
  days: number;
  stops: number;
  pins: number;
  createdDay: string;
  updatedAt: string;
}

/** שורה גולמית → סיכום, או null אם היא לא נראית כמו טיול */
export function summarize(row: TripRow): TripSummary | null {
  const t = (row?.data ?? null) as TripShape | null;
  // `Array.isArray` אינו קישוט: `typeof [] === 'object'`, ובלעדיו שורה
  // פגומה שמחזיקה מערך הייתה נספרת כטיול אמיתי עם אפס ימים - כלומר
  // מזייפת את המונה ואת החציון גם יחד. נתפס בבדיקה.
  if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
  const days = Array.isArray(t.days) ? t.days : [];
  const citySlugs = Array.isArray(t.citySlugs) ? t.citySlugs.filter((s) => typeof s === 'string') : [];
  const created = typeof t.createdAt === 'number' ? t.createdAt : Date.parse(row.updated_at);
  return {
    userId: row.user_id,
    id: row.id,
    name: typeof t.name === 'string' ? t.name : '(ללא שם)',
    citySlugs: citySlugs as string[],
    days: days.length,
    stops: days.reduce(
      (n: number, d: unknown) =>
        n + (Array.isArray((d as { placeIds?: unknown })?.placeIds) ? (d as { placeIds: unknown[] }).placeIds.length : 0),
      0,
    ),
    pins: Array.isArray(t.pins) ? t.pins.length : 0,
    createdDay: isoDay(Number.isFinite(created) ? (created as number) : Date.now()),
    updatedAt: row.updated_at,
  };
}

export interface Aggregates {
  trips: number;
  travelers: number;
  withStops: number;
  /** אורך טיול טיפוסי - חציון, כי טיול חריג אחד מזיז ממוצע */
  medianDays: number;
  medianStops: number;
  perDay: { day: string; trips: number }[];
  topCities: { slug: string; label: string; trips: number }[];
  topCountries: { slug: string; label: string; trips: number }[];
}

const median = (xs: number[]): number =>
  xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function top<T>(counts: Map<string, number>, label: (k: string) => string, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, trips]) => ({ slug, label: label(slug), trips })) as T;
}

export function aggregate(rows: TripSummary[], days = 30): Aggregates {
  const cities = new Map<string, number>();
  const nations = new Map<string, number>();
  const perDay = new Map<string, number>();

  // שלד של כל הימים בטווח, כדי שיום בלי טיולים יוצג כאפס ולא ייעלם
  for (let i = days - 1; i >= 0; i--) {
    perDay.set(isoDay(Date.now() - i * 86_400_000), 0);
  }

  for (const t of rows) {
    if (perDay.has(t.createdDay)) perDay.set(t.createdDay, (perDay.get(t.createdDay) ?? 0) + 1);
    // עיר נספרת פעם אחת לטיול, גם אם יש בה חמישה ימים
    for (const slug of new Set(t.citySlugs)) {
      cities.set(slug, (cities.get(slug) ?? 0) + 1);
    }
    /*
      **וגם המדינה פעם אחת לטיול.** טיול רומא+ונציה הוא טיול אחד
      לאיטליה, לא שניים; ספירה לפי עיר הייתה הופכת את "לאן מתכננים"
      למדד של כמה ערים יש למדינה בקטלוג. נתפס בבדיקה.
    */
    const seenCountries = new Set<string>();
    for (const slug of new Set(t.citySlugs)) {
      const c = COUNTRY_OF.get(slug);
      if (c) seenCountries.add(c);
    }
    for (const c of seenCountries) nations.set(c, (nations.get(c) ?? 0) + 1);
  }

  return {
    trips: rows.length,
    travelers: new Set(rows.map((r) => r.userId)).size,
    withStops: rows.filter((r) => r.stops > 0).length,
    medianDays: median(rows.map((r) => r.days)),
    medianStops: median(rows.map((r) => r.stops)),
    perDay: [...perDay.entries()].map(([day, trips]) => ({ day, trips })),
    topCities: top(cities, (s) => CITY_NAME.get(s) ?? s, 12),
    topCountries: top(nations, (s) => COUNTRY_NAME.get(s) ?? s, 12),
  };
}

/* ============================================================
   תצוגת טיול בודד לאדמין - קריאה בלבד
   ============================================================ */

/**
 * הטיול כפי שהאדמין רואה אותו: **שמות, לא מזהים**.
 *
 * הפענוח נעשה כאן בשרת ולא בדפדפן, מאותה סיבה שדף הטיול המשותף מקבל
 * את הערים כ-props: הקטלוג הוא ~2MB, ואין שום סיבה שאזור הניהול יגרור
 * אותו לדפדפן כדי להפוך `vie-stephansdom` ל"קתדרלת סנט סטפן".
 *
 * מקום שאינו בקטלוג (עיר שנחקרה אוטומטית, למשל) מוצג לפי המזהה שלו
 * ומסומן `unknown` - זה מה שבאמת שמור, ולהסתיר אותו יהיה שקר קטן.
 */
export interface TripViewStop {
  id: string;
  name: string;
  category?: string;
  mustSee?: boolean;
  unknown?: boolean;
}

export interface TripViewDay {
  n: number;
  citySlug: string;
  cityName: string;
  countryName: string | null;
  stops: TripViewStop[];
  notes?: string;
}

export interface TripView {
  name: string;
  startDate?: string;
  endDate?: string;
  createdAt?: number;
  days: TripViewDay[];
  pins: { name: string; kind: string; located: boolean; citySlug?: string }[];
  preferences: { label: string; value: string }[];
}

const PLACE_OF = new Map(
  destinations.flatMap((d) => d.places.map((p) => [p.id, p] as const)),
);

/** רק העדפות שנקבעו בפועל. שדה ריק אינו "לא", הוא "לא נשאל". */
const PREF_LABELS: Record<string, [string, Record<string, string>]> = {
  party: ['מי נוסע', { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'לבד' }],
  pace: ['קצב', { relaxed: 'רגוע', packed: 'עמוס' }],
  budget: ['תקציב', { low: 'חסכוני', medium: 'בינוני', high: 'גבוה' }],
  shopping: ['שופינג', { more: 'יותר', normal: 'רגיל', less: 'פחות' }],
  travelStyle: ['סגנון', { budget: 'חסכוני', mid: 'בינוני', comfort: 'נוח' }],
};

export function tripView(data: unknown): TripView | null {
  const t = (data ?? null) as
    | {
        name?: unknown;
        days?: unknown;
        pins?: unknown;
        startDate?: unknown;
        endDate?: unknown;
        createdAt?: unknown;
        preferences?: Record<string, unknown>;
      }
    | null;
  if (!t || typeof t !== 'object') return null;

  const rawDays = Array.isArray(t.days) ? t.days : [];
  const days: TripViewDay[] = rawDays.map((d, i) => {
    const day = (d ?? {}) as { citySlug?: unknown; placeIds?: unknown; notes?: unknown };
    const slug = typeof day.citySlug === 'string' ? day.citySlug : '';
    const dest = destinations.find((x) => x.slug === slug);
    const ids = Array.isArray(day.placeIds) ? day.placeIds.filter((x) => typeof x === 'string') : [];
    return {
      n: i + 1,
      citySlug: slug,
      cityName: dest?.name ?? slug,
      countryName: dest ? (COUNTRY_NAME.get(dest.countrySlug) ?? null) : null,
      stops: (ids as string[]).map((id) => {
        const p = PLACE_OF.get(id);
        return p
          ? { id, name: p.name, category: p.category, mustSee: p.mustSee }
          : { id, name: id, unknown: true };
      }),
      notes: typeof day.notes === 'string' && day.notes.trim() ? day.notes : undefined,
    };
  });

  const prefs = (t.preferences ?? {}) as Record<string, unknown>;
  const preferences: { label: string; value: string }[] = [];
  for (const [key, [label, map]] of Object.entries(PREF_LABELS)) {
    const v = prefs[key];
    if (typeof v === 'string' && map[v]) preferences.push({ label, value: map[v] });
  }
  if (prefs.kosher === true) preferences.push({ label: 'כשרות', value: 'כן' });
  if (prefs.shabbatAware === true) preferences.push({ label: 'שבת', value: 'מתחשב' });

  return {
    name: typeof t.name === 'string' ? t.name : '(ללא שם)',
    startDate: typeof t.startDate === 'string' ? t.startDate : undefined,
    endDate: typeof t.endDate === 'string' ? t.endDate : undefined,
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : undefined,
    days,
    pins: (Array.isArray(t.pins) ? t.pins : []).map((p) => {
      const pin = (p ?? {}) as Record<string, unknown>;
      return {
        name: typeof pin.name === 'string' ? pin.name : '(ללא שם)',
        kind: typeof pin.kind === 'string' ? pin.kind : 'other',
        located: Number.isFinite(pin.lat) && Number.isFinite(pin.lng),
        citySlug: typeof pin.citySlug === 'string' ? pin.citySlug : undefined,
      };
    }),
    preferences,
  };
}
