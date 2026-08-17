import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { categoryMeta } from '@/lib/categories';
import { normalizeQuery } from '@/lib/citySearch';

/**
 * Site-wide search: cities, countries and places - by Hebrew name, local name or slug.
 *
 * This file imports all of the data, so it is loaded only through a dynamic import
 * (see `SiteSearch.tsx`) - so the catalog does not enter every page's bundle merely
 * because of a search button in the navigation.
 */

export type SearchKind = 'city' | 'country' | 'place';

export interface SearchResult {
  kind: SearchKind;
  key: string;
  title: string;
  /** The context line under the name (country / city + category) */
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

/** Built once per module load (the data is static) */
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
        // ?place= opens the destination page and scrolls to / highlights the place itself
        href: `/destinations/${d.slug}?place=${encodeURIComponent(p.id)}`,
        haystack: [p.name, p.nameLocal, p.id, d.name].map(normalizeQuery).join(' | '),
      });
    }
  }

  cached = out;
  return out;
}

/**
 * Simple, predictable ranking: a match at the start of a name > a match at the start
 * of a word > any containment, and within the same level - countries, cities, then
 * places. No fuzzy scoring that surprises.
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
 * A cap **per kind separately**, rather than a single cap of 24 for everything.
 *
 * Why: searching "Vienna" returned one city followed by 23 places in Vienna - every
 * cafe, every market and every kosher restaurant. Someone typing a city name is
 * looking for the city, and perhaps a few standout points; a wall of twenty rows is
 * not a rich result, it is a search that is hard to read. Separating the caps keeps
 * the country and the city always visible, even when the city has twenty matching
 * places.
 */
const KIND_CAPS: Record<SearchKind, number> = { country: 4, city: 8, place: 6 };

export interface SearchHits {
  results: SearchResult[];
  /** How many were dropped above the cap, per kind - so the UI can say so honestly */
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

/** Kept for compatibility; returns only the rows */
export function searchSite(index: SearchResult[], query: string): SearchResult[] {
  return searchSiteHits(index, query).results;
}

/**
 * What to show while the field is still empty.
 *
 * The previous empty state was a paragraph of explanation and nothing to click - a
 * search layer that opens and shows documentation. Here there is a real starting
 * point: the destinations with the highest editorial rating, which is an existing
 * field in the data rather than a choice invented here. A destination with no rating
 * simply does not appear.
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

  // One destination per country. Without this the opening rows fill up with two
  // highly-rated continents, and the list looks like one shelf of the catalog rather
  // than its breadth.
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
