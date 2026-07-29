'use client';

import type { Destination } from '@/lib/types';

/**
 * הערים של הטיולים השמורים, על הדיסק, כדי שהמסלול ייפתח בלי רשת.
 *
 * **למה זה קיים בכלל.** `cityData.ts` שמר את הערים במפה ברמת המודול,
 * כלומר בזיכרון הטאב. זה פתר את הרוחב פס, אבל ברגע שהמשתמש סוגר את
 * האפליקציה ופותח אותה בלי רשת, אין לו שמות עצירות, אין תיאורים ואין
 * קואורדינטות - הטיול נשמר, אבל התוכן שהוא מצביע עליו נעלם. מי שעומד
 * ברחוב בעיר זרה בלי דאטה מקבל מסך טעינה שלא ייגמר.
 *
 * **מה נשמר, ובמכוון לא יותר מזה:** רק ערים שטיול שמור באמת נוגע בהן.
 * לא הקטלוג, לא ערים שנצפו בדפדוף, ולא טיולים שנמחקו. `prune()` נקרא
 * עם רשימת ה-slugs החיה ומוחק כל מה שמחוצה לה, כך שהאחסון לא גדל עם
 * הזמן אלא עוקב אחרי מה שיש למשתמש בפועל.
 *
 * **`cachedAt` אינו קישוט.** תוכן שנשמר לפני שבוע מוצג למשתמש בלי
 * רשת, וכולל מידע כשרות. המסך חייב לדעת מתי זה נשמר כדי לומר זאת.
 */

const KEY = 'tiyul-plus:cities:v1';
/** תקרה שפויה: טיול נוגע ב-1-6 ערים; 20 מכסה כמה טיולים במקביל */
const MAX_CITIES = 20;

export interface StoredCity {
  city: Destination;
  /** מתי נשמר (ms) - מוצג למשתמש כשהוא קורא ללא רשת */
  cachedAt: number;
}

type Store = Record<string, StoredCity>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Store = {};
    for (const [slug, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = v as Partial<StoredCity>;
      // רשומה פגומה נזרקת בשקט ולא מפילה את המסך - היא תיטען שוב
      // ברגע שתהיה רשת, ובלי רשת העיר הזאת פשוט תיחשב חסרה.
      if (e && typeof e.cachedAt === 'number' && e.city && typeof e.city === 'object') {
        const city = e.city as Destination;
        if (city.slug === slug && Array.isArray(city.places)) out[slug] = { city, cachedAt: e.cachedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // המכסה מלאה: מוותרים על השמירה ולא על המסך. האפליקציה ממשיכה
    // לעבוד עם הרשת בדיוק כמו קודם; רק המצב הלא-מקוון נפגע.
  }
}

export function loadCities(): Store {
  return read();
}

/** מחזיר את כל הערים השמורות כמפה של slug → Destination */
export function storedCities(): Record<string, Destination> {
  const out: Record<string, Destination> = {};
  for (const [slug, e] of Object.entries(read())) out[slug] = e.city;
  return out;
}

/** מתי נשמרה העיר הזאת, או null אם אינה שמורה */
export function cachedAt(slug: string): number | null {
  return read()[slug]?.cachedAt ?? null;
}

/**
 * התאריך הישן ביותר מבין הערים שנמסרו - זה מה שראוי להציג, כי
 * הוותק של המסך הוא הוותק של הפריט הישן ביותר שמופיע בו.
 */
export function oldestCachedAt(slugs: string[]): number | null {
  const store = read();
  const times = slugs.map((s) => store[s]?.cachedAt).filter((t): t is number => typeof t === 'number');
  return times.length ? Math.min(...times) : null;
}

export function saveCities(cities: Destination[], now = Date.now()): void {
  if (cities.length === 0) return;
  const store = read();
  for (const city of cities) if (city?.slug) store[city.slug] = { city, cachedAt: now };
  write(capped(store));
}

/** הישנות ביותר יוצאות ראשונות כשעוברים את התקרה */
function capped(store: Store): Store {
  const entries = Object.entries(store);
  if (entries.length <= MAX_CITIES) return store;
  const keep = entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt).slice(0, MAX_CITIES);
  return Object.fromEntries(keep);
}

/**
 * משאיר רק ערים שרשימת ה-slugs מכילה. נקרא עם הערים של הטיולים
 * השמורים, כך שמחיקת טיול מפנה גם את התוכן שלו - "לא מטמנים את
 * הקטלוג" הוא כלל שצריך לאכוף, לא רק להצהיר.
 */
export function pruneCities(keepSlugs: string[]): void {
  const keep = new Set(keepSlugs);
  const store = read();
  let changed = false;
  for (const slug of Object.keys(store)) {
    if (!keep.has(slug)) {
      delete store[slug];
      changed = true;
    }
  }
  if (changed) write(store);
}

/** כמה מקום זה תופס בפועל, בבתים (UTF-16 כפי ש-localStorage סופר) */
export function storageBytes(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return (window.localStorage.getItem(KEY)?.length ?? 0) * 2;
  } catch {
    return 0;
  }
}

/** לטסטים בלבד */
export function __clearCityStore(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
