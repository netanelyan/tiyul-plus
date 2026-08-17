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
 * Building the destination cards from the catalog - **server side only.**
 *
 * Separated from `destinationFacets.ts` for a measured performance reason: the browser
 * downloaded the entire catalog on every page of the site merely to filter a list the
 * server had already computed. The filtering, the types and the constants stayed there
 * (client); everything that reads `destinations` is here, and is imported only from
 * `app/countries/page.tsx`.
 */
/**
 * The continents come from WORLD_COUNTRIES, which was built for the country passport in
 * the account area. The match is by ISO2 code derived from the flag emoji, with a
 * fallback by name.
 *
 * 81 of the catalog's 83 countries were found this way. The two that were not - Oman and
 * Bhutan - sit here as an override rather than as a fix in `worldCountries.ts`, because
 * `src/data/*` is owned by the parallel data session and editing there conflicts. If they
 * are added there, the override simply becomes redundant and breaks nothing.
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

/** Built once per module load - the data is static */
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
      vibes: [] as PlaceTag[], // filled in a second pass, once every destination is known
      price: priceBand(levels),
      seasons,
      haystack: [d.name, d.nameLocal, d.slug, country?.name ?? '', country?.nameLocal ?? '']
        .join(' | ')
        .toLowerCase(),
    };
  });

  // Second pass: the character is determined relative to the rest of the catalog, so it
  // can only be computed once every destination has been built.
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
