import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { categoryMeta } from '@/lib/categories';
import { normalizeQuery } from '@/lib/citySearch';

/**
 * חיפוש כלל-אתרי: ערים, מדינות ומקומות - בעברית, בשם המקומי או ב-slug.
 *
 * הקובץ הזה מייבא את כל הדאטה, ולכן הוא נטען בייבוא דינמי בלבד (ראו
 * `SiteSearch.tsx`) - כדי שהקטלוג לא ייכנס ל-bundle של כל עמוד באתר
 * רק בגלל כפתור חיפוש בניווט.
 */

export type SearchKind = 'city' | 'country' | 'place';

export interface SearchResult {
  kind: SearchKind;
  key: string;
  title: string;
  /** שורת ההקשר מתחת לשם (מדינה / עיר + קטגוריה) */
  subtitle: string;
  flag?: string;
  href: string;
  haystack: string;
}

const KIND_WEIGHT: Record<SearchKind, number> = { country: 0, city: 1, place: 2 };

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  country: 'מדינות',
  city: 'ערים',
  place: 'מקומות',
};

/** נבנה פעם אחת לכל טעינת מודול (הדאטה סטטית) */
let cached: SearchResult[] | null = null;

export function buildSearchIndex(): SearchResult[] {
  if (cached) return cached;
  const countryName = new Map(countries.map((c) => [c.slug, c.name]));
  const out: SearchResult[] = [];

  for (const c of countries) {
    const cities = destinations.filter((d) => d.countrySlug === c.slug);
    out.push({
      kind: 'country',
      key: `country:${c.slug}`,
      title: c.name,
      subtitle: cities.length === 1 ? 'עיר אחת בקטלוג' : `${cities.length} ערים בקטלוג`,
      flag: c.flag,
      href: `/countries/${c.slug}`,
      haystack: [c.name, c.nameLocal, c.slug].map(normalizeQuery).join(' | '),
    });
  }

  for (const d of destinations) {
    const country = countryName.get(d.countrySlug) ?? '';
    out.push({
      kind: 'city',
      key: `city:${d.slug}`,
      title: d.name,
      subtitle: country,
      flag: d.flag,
      href: `/destinations/${d.slug}`,
      haystack: [d.name, d.nameLocal, d.slug, country].map(normalizeQuery).join(' | '),
    });

    for (const p of d.places) {
      out.push({
        kind: 'place',
        key: `place:${d.slug}:${p.id}`,
        title: p.name,
        subtitle: `${categoryMeta[p.category]?.label ?? ''} · ${d.name}`,
        flag: d.flag,
        // ?place= פותח את דף היעד וגולל/מדגיש את המקום עצמו
        href: `/destinations/${d.slug}?place=${encodeURIComponent(p.id)}`,
        haystack: [p.name, p.nameLocal, p.id, d.name].map(normalizeQuery).join(' | '),
      });
    }
  }

  cached = out;
  return out;
}

/**
 * דירוג פשוט וצפוי: התאמה בתחילת שם > התאמה בתחילת מילה > הכלה כלשהי,
 * ובתוך אותה רמה - מדינות, ערים ואז מקומות. בלי ניקוד מטושטש שמפתיע.
 */
function score(r: SearchResult, q: string): number {
  const title = normalizeQuery(r.title);
  if (title.startsWith(q)) return 0;
  if (title.includes(` ${q}`)) return 1;
  if (title.includes(q)) return 2;
  if (r.haystack.includes(` ${q}`) || r.haystack.startsWith(q)) return 3;
  return 4;
}

/**
 * תקרה **לכל סוג בנפרד**, ולא תקרה אחת של 24 לכולם.
 *
 * למה: חיפוש "וינה" החזיר עיר אחת ואחריה 23 מקומות בווינה - כל בית קפה,
 * כל שוק וכל מסעדה כשרה. מי שמקליד שם של עיר מחפש את העיר, ואולי כמה
 * נקודות בולטות; קיר של עשרים שורות הוא לא תוצאה עשירה, הוא חיפוש שקשה
 * לקרוא. הפרדת התקרות שומרת על המדינה והעיר תמיד גלויות, גם כשלעיר יש
 * עשרים מקומות שתואמים.
 */
const KIND_CAPS: Record<SearchKind, number> = { country: 4, city: 8, place: 6 };

export interface SearchHits {
  results: SearchResult[];
  /** כמה הושמטו מעל התקרה, לפי סוג - כדי שה-UI יוכל להגיד זאת בכנות */
  omitted: number;
}

export function searchSiteHits(index: SearchResult[], query: string): SearchHits {
  const q = normalizeQuery(query);
  if (q.length < 2) return { results: [], omitted: 0 };
  const ranked = index
    .filter((r) => r.haystack.includes(q))
    .map((r) => ({ r, s: score(r, q) }))
    .sort((a, b) => a.s - b.s || KIND_WEIGHT[a.r.kind] - KIND_WEIGHT[b.r.kind])
    .map((x) => x.r);

  const taken: Record<SearchKind, number> = { country: 0, city: 0, place: 0 };
  const results: SearchResult[] = [];
  let omitted = 0;
  for (const r of ranked) {
    if (taken[r.kind] < KIND_CAPS[r.kind]) {
      taken[r.kind] += 1;
      results.push(r);
    } else {
      omitted += 1;
    }
  }
  return { results, omitted };
}

/** נשמר לתאימות; מחזיר רק את השורות */
export function searchSite(index: SearchResult[], query: string): SearchResult[] {
  return searchSiteHits(index, query).results;
}

/**
 * מה מציגים כשהשדה עוד ריק.
 *
 * המצב הריק הקודם היה פסקת הסבר ("מחפשים לפי שם בעברית...") ושום דבר
 * ללחוץ עליו - שכבת חיפוש שנפתחת ומראה תיעוד. כאן יש התחלה אמיתית:
 * היעדים עם הדירוג העריכתי הגבוה ביותר, שזה נתון קיים בדאטה ולא בחירה
 * שהומצאה כאן. יעד בלי דירוג פשוט לא מופיע.
 */
export function popularDestinations(index: SearchResult[], count = 6): SearchResult[] {
  const byKey = new Map(
    destinations
      .filter((d) => typeof d.editorialRating?.score === 'number')
      .map((d) => [`city:${d.slug}`, { score: d.editorialRating!.score, country: d.countrySlug }]),
  );
  const ranked = index
    .filter((r) => byKey.has(r.key))
    .sort((a, b) => byKey.get(b.key)!.score - byKey.get(a.key)!.score);

  // יעד אחד לכל מדינה. בלי זה שורות הפתיחה מתמלאות בשתי יבשות עם דירוג
  // גבוה, והרשימה נראית כמו מדף אחד של הקטלוג ולא כמו הרוחב שלו.
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of ranked) {
    const country = byKey.get(r.key)!.country;
    if (seen.has(country)) continue;
    seen.add(country);
    out.push(r);
    if (out.length >= count) break;
  }
  return out;
}
