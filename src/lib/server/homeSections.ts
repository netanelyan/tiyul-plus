import { sourceWidth } from '@/lib/server/photoCredit';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { HUBS, hubMembers } from '@/lib/seo/hubs';
import { promotedMembers } from '@/lib/seo/hubData';

/**
 * The data behind the homepage sections - server-only, because every function
 * here walks the whole catalog, and the catalog must never ship to the browser
 * (see the bundle work in the 2026-07-29 (ff)/(hh) session-log entries).
 *
 * **Every number rendered on the homepage comes from here, and none of them is
 * hand-written.** "33 places" on a Vienna tile is counted from Vienna's places
 * array, so a data session that adds ten places updates the homepage by itself.
 * The test next to this file asserts that against the real catalog.
 */

/**
 * The flagship cities: a **pinned** list rather than a computed one, and
 * deliberately not the previous random shuffle.
 *
 * The shuffle gave every one of 166 destinations an equal chance, which is
 * fair to the catalog and wrong for the homepage - it put a Finnish road and a
 * Lithuanian cathedral in the hero band as often as Rome. The hot grid on a
 * storefront is picked, not drawn. These eight are the cities Israelis
 * actually fly to (the flight-frequency data in the session log), and they
 * are the ones with enough places, photos and kosher coverage that a "33
 * places" tile is a real promise. Swapping one is a one-line edit.
 */
export const FLAGSHIP_SLUGS = [
  'vienna',
  'rome',
  'prague',
  'budapest',
  'athens',
  'bangkok',
  'dubai',
  'new-york',
] as const;

export interface FlagshipCard {
  slug: string;
  name: string;
  country: string;
  photo?: string;
  /** Original Commons width, so a dense screen gets the sharp variant. */
  photoW?: number;
  places: number;
  days: number;
  kosher: number;
  score?: number;
}

export function flagshipCards(): FlagshipCard[] {
  const out: FlagshipCard[] = [];
  for (const slug of FLAGSHIP_SLUGS) {
    const d = destinations.find((x) => x.slug === slug);
    if (!d) continue; // a renamed slug drops the tile rather than crashing the homepage
    const country = countries.find((c) => c.slug === d.countrySlug);
    out.push({
      slug: d.slug,
      name: d.name,
      country: country?.name ?? '',
      photo: d.iconicLandmark?.photo ?? d.photo,
      photoW: sourceWidth(d.iconicLandmark?.photo ?? d.photo) ?? undefined,
      places: d.places.length,
      days: d.itinerary.length,
      kosher: d.places.filter((p) => p.category.startsWith('kosher')).length,
      score: d.editorialRating?.score,
    });
  }
  return out;
}

export interface CountryTile {
  slug: string;
  name: string;
  flag: string;
  destinations: number;
  places: number;
}

/** How many country tiles the homepage shows - two rows of five on desktop. */
export const HOME_COUNTRY_TILES = 10;

/**
 * Countries ranked by how much we actually have on them (places, then
 * destinations) - the tiles say "5 destinations · 81 places", so ranking by
 * anything else would put a thin country above a rich one and make the number
 * on the tile look like a mistake.
 */
export function popularCountries(limit = HOME_COUNTRY_TILES): CountryTile[] {
  return countries
    .map((c) => {
      const ds = destinations.filter((d) => d.countrySlug === c.slug);
      return {
        slug: c.slug,
        name: c.name,
        flag: c.flag,
        destinations: ds.length,
        places: ds.reduce((n, d) => n + d.places.length, 0),
      };
    })
    .filter((c) => c.destinations > 0)
    .sort((a, b) => b.places - a.places || b.destinations - a.destinations || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}

export interface CollectionTile {
  slug: string;
  title: string;
  emoji: string;
  count: number;
}

/**
 * The collection hubs with their member counts. The count is computed exactly
 * the way `/collections` computes it - against the promoted set - so the
 * number on the homepage tile equals the number on the hub page it opens.
 */
export function collectionTiles(): CollectionTile[] {
  const members = promotedMembers();
  return HUBS.map((hub) => ({
    slug: hub.slug,
    title: hub.title,
    emoji: hub.emoji,
    count: hubMembers(hub, members).length,
  })).filter((t) => t.count > 0);
}
