import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { WORLD_COUNTRIES, type Continent } from '@/data/worldCountries';
import type { PlaceTag } from '@/lib/types';
import {
  SEASONS,
  VIBES,
  VIBE_TOP_SHARE,
  type DestinationCard,
  type PriceBand,
} from '@/lib/destinationFacets';

/**
 * בניית כרטיסי היעדים מהקטלוג - **צד שרת בלבד.**
 *
 * הופרד מ-`destinationFacets.ts` מסיבת ביצועים מדודה: הדפדפן הוריד את
 * כל הקטלוג בכל עמוד באתר רק כדי לסנן רשימה שהשרת כבר חישב. הסינון,
 * הטיפוסים והקבועים נשארו שם (לקוח); כל מה שקורא `destinations` נמצא
 * כאן, ומיובא אך ורק מ-`app/countries/page.tsx`.
 */
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

function priceBand(levels: number[]): PriceBand | null {
  if (levels.length < 4) return null;
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  if (avg < 1) return 'free';
  if (avg < 1.75) return 'low';
  return 'high';
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
