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

export function searchSite(index: SearchResult[], query: string, limit = 24): SearchResult[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  return index
    .filter((r) => r.haystack.includes(q))
    .map((r) => ({ r, s: score(r, q) }))
    .sort((a, b) => a.s - b.s || KIND_WEIGHT[a.r.kind] - KIND_WEIGHT[b.r.kind])
    .slice(0, limit)
    .map((x) => x.r);
}
