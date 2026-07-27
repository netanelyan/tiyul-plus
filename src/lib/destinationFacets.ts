import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { WORLD_COUNTRIES, type Continent } from '@/data/worldCountries';
import type { PlaceTag } from '@/lib/types';

/**
 * הפאסטים של דפדפן היעדים: יבשת, אופי, ומחירי אטרקציות.
 *
 * הקובץ הזה **גוזר** הכל מהדאטה הקיימת ולא ממציא שום שדה חדש. זה
 * ההבדל בין פילטר שימושי לפילטר שנראה סמכותי ומשקר, וכל החלטה כאן
 * מתועדת עם מה שהיא באמת מודדת.
 *
 * נטען דרך העמוד (server component) ולא בלקוח - הוא מייבא את כל
 * הקטלוג, בדיוק כמו siteSearch.ts.
 */

/* ------------------------------------------------------------------ *
 * יבשת
 * ------------------------------------------------------------------ */

/**
 * היבשות מגיעות מ-WORLD_COUNTRIES, שנבנה לדרכון המדינות באזור האישי.
 * ההצמדה היא לפי קוד ISO2 שנגזר מאימוג׳י הדגל, ובגיבוי לפי שם.
 *
 * 81 מתוך 83 מדינות הקטלוג נמצאו כך. השתיים שלא - עומאן ובהוטן - יושבות
 * כאן כ-override ולא כתיקון ב-`worldCountries.ts`, כי `src/data/*` בבעלות
 * סשן הדאטה המקביל ועריכה שם מתנגשת. אם הן יתווספו שם, ה-override פשוט
 * יהפוך למיותר ולא ישבור כלום.
 */
const CONTINENT_OVERRIDES: Record<string, Continent> = {
  oman: 'אפריקה והמזרח התיכון',
  bhutan: 'אסיה',
};

function flagToCode(flag?: string): string | null {
  if (!flag) return null;
  const cps = [...flag].map((c) => c.codePointAt(0) ?? 0);
  if (cps.length < 2 || cps.some((c) => c < 0x1f1e6 || c > 0x1f1ff)) return null;
  return cps.map((c) => String.fromCharCode(c - 0x1f1e6 + 97)).join('');
}

export const CONTINENTS: Continent[] = [
  'אירופה',
  'אסיה',
  'אפריקה והמזרח התיכון',
  'אמריקה',
  'אוקיאניה',
];

/* ------------------------------------------------------------------ *
 * אופי
 * ------------------------------------------------------------------ */

export const VIBES: { key: PlaceTag; label: string; emoji: string }[] = [
  { key: 'outdoors', label: 'טבע', emoji: '🏔️' },
  { key: 'history', label: 'היסטוריה', emoji: '🏛️' },
  { key: 'families', label: 'משפחות', emoji: '👨‍👩‍👧' },
  { key: 'foodie', label: 'אוכל', emoji: '🍽️' },
  { key: 'romantic', label: 'רומנטי', emoji: '💛' },
  { key: 'art', label: 'אמנות', emoji: '🎨' },
  { key: 'nightlife', label: 'חיי לילה', emoji: '🌃' },
];

/**
 * מתי יעד "הוא" אופי מסוים.
 *
 * שתי גישות פשוטות נבדקו ונפסלו על הדאטה האמיתית:
 * - **מספר מוחלט** ("לפחות 2 מקומות עם התגית"): 139 מתוך 150 היעדים
 *   סומנו כ"טבע". צ׳יפ שמחזיר 93% מהקטלוג הוא קישוט, לא פילטר.
 * - **יחס קבוע** (25% מהמקומות): טבע ירד ל-128 והיסטוריה ל-113 - עדיין
 *   רחב מדי - ואילו "חיי לילה" ירד ל-**אפס**, כי הקטלוג כמעט לא מתייג
 *   חיי לילה. צ׳יפ שמוביל תמיד למסך ריק גרוע מצ׳יפ שלא קיים.
 *
 * הכלל שנבחר מנרמל את עצמו: מבין היעדים שיש בהם **בכלל** מקום עם התגית,
 * נבחרים אלה שהיחס שלהם בשליש-ארבעים העליון. המשמעות קריאה - "היעדים
 * שבהם זה הכי בולט" - והיא נכונה גם לתגית נדירה וגם לתגית שכיחה, בלי
 * מספר קסם לכל תגית בנפרד.
 *
 * צ׳יפ שאחרי כל זה עדיין לא מגיע ל-`VIBE_MIN_RESULTS` יעדים פשוט לא
 * מוצג (ראו `availableVibes`), כך שהממשק גדל עם הדאטה בלי שינוי קוד.
 */
const VIBE_TOP_SHARE = 0.4;
const VIBE_MIN_RESULTS = 5;

/* ------------------------------------------------------------------ *
 * מחירי אטרקציות - ובמפורש לא "כמה יעלה הטיול"
 * ------------------------------------------------------------------ */

export type PriceBand = 'free' | 'low' | 'high';

export const PRICE_BANDS: { key: PriceBand; label: string; emoji: string }[] = [
  { key: 'free', label: 'הרבה חינם', emoji: '🎟️' },
  { key: 'low', label: 'אטרקציות זולות', emoji: '🐷' },
  { key: 'high', label: 'אטרקציות יקרות', emoji: '💎' },
];

/**
 * הרצועה נגזרת מ-`priceLevel` של המקומות (0=חינם עד 3), שקיים ב-149
 * מתוך 150 היעדים עם לפחות 4 מקומות מתומחרים.
 *
 * **מה זה לא:** זה לא "יעד זול". טיסה ולינה הן רוב עלות הטיול ואין עליהן
 * שום נתון בקטלוג, כך שיעד עם מוזיאונים חינמיים ומלונות יקרים ייראה כאן
 * "זול". לכן גם התוויות מדברות על אטרקציות ולא על היעד, ויש שורת הסבר
 * מתחת לפילטר. לתייג את שווייץ כ"חסכונית" כי הכניסה להרים חינם היה
 * בדיוק סוג הביטחון השקרי שחוק קשיח 2 קיים כדי למנוע.
 */
function priceBand(levels: number[]): PriceBand | null {
  if (levels.length < 4) return null;
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  if (avg < 1) return 'free';
  if (avg < 1.75) return 'low';
  return 'high';
}

/* ------------------------------------------------------------------ *
 * עונה - המנגנון קיים, הדאטה עדיין לא
 * ------------------------------------------------------------------ */

/**
 * הפילטר לפי עונה מוכן, אבל **אין בקטלוג שום שדה עונה** - לא חודשים
 * מומלצים, לא אקלים, כלום. גזירה מקו רוחב או מניחוש הייתה עצה טובה
 * למראה על בסיס לא קיים, וזה בדיוק מה שאסור כאן.
 *
 * לכן: הקוד קורא שדה אופציונלי `bestMonths` (מספרי חודשים 1-12), הפילטר
 * מופיע בממשק **רק אם לפחות יעד אחד נושא אותו**, והיום הוא פשוט לא מוצג.
 * ברגע שסשן הדאטה יוסיף את השדה, הפילטר נדלק לבד בלי שינוי קוד.
 */
export const SEASONS: { key: string; label: string; emoji: string; months: number[] }[] = [
  { key: 'winter', label: 'חורף', emoji: '❄️', months: [12, 1, 2] },
  { key: 'spring', label: 'אביב', emoji: '🌸', months: [3, 4, 5] },
  { key: 'summer', label: 'קיץ', emoji: '☀️', months: [6, 7, 8] },
  { key: 'autumn', label: 'סתיו', emoji: '🍂', months: [9, 10, 11] },
];

/* ------------------------------------------------------------------ */

export interface DestinationCard {
  slug: string;
  name: string;
  nameLocal: string;
  country: string;
  countrySlug: string;
  flag?: string;
  photo?: string;
  landmark?: string;
  days: number;
  places: number;
  kosher: number;
  rating?: number;
  continent: Continent | null;
  vibes: PlaceTag[];
  price: PriceBand | null;
  seasons: string[];
  /** לחיפוש חופשי: שם, שם מקומי, slug, מדינה */
  haystack: string;
}

/** נבנה פעם אחת לכל טעינת מודול - הדאטה סטטית */
let cached: DestinationCard[] | null = null;

export function buildDestinationCards(): DestinationCard[] {
  if (cached) return cached;

  const byCode = new Map(WORLD_COUNTRIES.map((w) => [w.code, w.continent]));
  const byName = new Map(WORLD_COUNTRIES.map((w) => [w.name, w.continent]));
  const countryBySlug = new Map(countries.map((c) => [c.slug, c]));

  cached = destinations.map((d) => {
    const country = countryBySlug.get(d.countrySlug);
    const continent =
      CONTINENT_OVERRIDES[d.countrySlug] ??
      byCode.get(flagToCode(country?.flag) ?? '') ??
      (country ? byName.get(country.name) : undefined) ??
      null;

    const levels: number[] = [];
    for (const p of d.places) if (typeof p.priceLevel === 'number') levels.push(p.priceLevel);

    const months = (d as { bestMonths?: number[] }).bestMonths ?? [];
    const seasons = SEASONS.filter((s) => s.months.some((m) => months.includes(m))).map((s) => s.key);

    return {
      slug: d.slug,
      name: d.name,
      nameLocal: d.nameLocal,
      country: country?.name ?? '',
      countrySlug: d.countrySlug,
      flag: d.flag ?? country?.flag,
      photo: d.iconicLandmark?.photo ?? d.photo,
      landmark: d.iconicLandmark?.name,
      days: d.itinerary.length,
      places: d.places.length,
      kosher: d.places.filter((p) => p.category === 'kosher-food' || p.category === 'kosher-market')
        .length,
      rating: d.editorialRating?.score,
      continent,
      vibes: [] as PlaceTag[], // ממולא בשלב שני, אחרי שכל היעדים ידועים
      price: priceBand(levels),
      seasons,
      haystack: [d.name, d.nameLocal, d.slug, country?.name ?? '', country?.nameLocal ?? '']
        .join(' | ')
        .toLowerCase(),
    };
  });

  // שלב שני: האופי נקבע ביחס לשאר הקטלוג, ולכן אפשר לחשב אותו רק אחרי
  // שכל היעדים נבנו.
  const shares = new Map<string, Map<PlaceTag, number>>();
  for (const d of destinations) {
    const m = new Map<PlaceTag, number>();
    for (const p of d.places) for (const t of p.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    for (const [t, n] of m) m.set(t, n / d.places.length);
    shares.set(d.slug, m);
  }
  for (const v of VIBES) {
    const withTag = cached
      .map((c) => ({ slug: c.slug, share: shares.get(c.slug)?.get(v.key) ?? 0 }))
      .filter((x) => x.share > 0)
      .sort((a, b) => b.share - a.share);
    const take = Math.ceil(withTag.length * VIBE_TOP_SHARE);
    const chosen = new Set(withTag.slice(0, take).map((x) => x.slug));
    for (const c of cached) if (chosen.has(c.slug)) c.vibes.push(v.key);
  }

  return cached;
}

/**
 * רק אופיים שיש להם מספיק יעדים כדי להיות שימושיים. צ׳יפ שמחזיר שניים
 * או אפס מבזבז מקום ומאכזב - וכשהקטלוג יגדל, הוא יופיע מעצמו.
 */
export function availableVibes(cards: DestinationCard[]): PlaceTag[] {
  return VIBES.map((v) => v.key).filter(
    (k) => cards.filter((c) => c.vibes.includes(k)).length >= VIBE_MIN_RESULTS,
  );
}

export interface Facets {
  continent: Continent | 'all';
  vibes: PlaceTag[];
  price: PriceBand | null;
  season: string | null;
  query: string;
}

export const EMPTY_FACETS: Facets = {
  continent: 'all',
  vibes: [],
  price: null,
  season: null,
  query: '',
};

/** כל התנאים ב-AND; מספר אופיים נבחרים = חייב לענות על כולם */
export function filterDestinations(cards: DestinationCard[], f: Facets): DestinationCard[] {
  const q = f.query.trim().toLowerCase();
  return cards.filter((c) => {
    if (f.continent !== 'all' && c.continent !== f.continent) return false;
    if (f.vibes.length > 0 && !f.vibes.every((v) => c.vibes.includes(v))) return false;
    if (f.price && c.price !== f.price) return false;
    if (f.season && !c.seasons.includes(f.season)) return false;
    if (q && !c.haystack.includes(q)) return false;
    return true;
  });
}

/**
 * מונה לכל טאב יבשת, **בהינתן שאר הפילטרים**. כך המספר על הטאב אומר
 * "כמה תמצאו אם תלחצו", ולא מספר כללי שמוביל למסך ריק.
 */
export function continentCounts(cards: DestinationCard[], f: Facets): Record<string, number> {
  const out: Record<string, number> = { all: filterDestinations(cards, { ...f, continent: 'all' }).length };
  for (const c of CONTINENTS) {
    out[c] = filterDestinations(cards, { ...f, continent: c }).length;
  }
  return out;
}
