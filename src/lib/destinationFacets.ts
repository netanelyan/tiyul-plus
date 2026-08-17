import type { Continent } from '@/data/worldCountries';
import type { PlaceTag } from '@/lib/types';

/*
 * **This file deliberately does not touch the catalog, and that is not style
 * pedantry.** `DestinationBrowser` is a client component that imports from
 * here, and any value import from `@/data/destinations` would pull the whole
 * catalog (2MB, 492kB compressed) into the page's bundle - even though the
 * server already computes the cards and passes them as props. The building
 * itself sits in `destinationCards.ts`, which only the server imports.
 */

/**
 * The destination browser's facets: continent, vibe, and attraction prices.
 *
 * This file **derives** everything from the existing data and invents no new
 * field. That is the difference between a useful filter and a filter that
 * looks authoritative and lies, and every decision here is documented with
 * what it actually measures.
 *
 * Loaded through the page (server component), not on the client - it imports
 * the whole catalog, exactly like siteSearch.ts.
 */

/* ------------------------------------------------------------------ *
 * Continent
 * ------------------------------------------------------------------ */

export const CONTINENTS: Continent[] = [
  'אירופה',
  'אסיה',
  'אפריקה והמזרח התיכון',
  'אמריקה',
  'אוקיאניה',
];

/* ------------------------------------------------------------------ *
 * Vibe
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
 * When a destination "is" a certain vibe.
 *
 * Two simple approaches were tried on the real data and rejected:
 * - **An absolute number** ("at least 2 places with the tag"): 139 of the 150
 *   destinations got marked "nature". A chip returning 93% of the catalog is
 *   decoration, not a filter.
 * - **A fixed ratio** (25% of the places): nature dropped to 128 and history to
 *   113 - still too broad - while "nightlife" dropped to **zero**, because the
 *   catalog barely tags nightlife. A chip that always leads to an empty screen
 *   is worse than a chip that does not exist.
 *
 * The chosen rule normalizes itself: among destinations that have a place with
 * the tag **at all**, those whose ratio is in the top forty percent qualify.
 * The meaning is readable - "the destinations where this stands out most" -
 * and it holds both for a rare tag and for a common one, with no magic number
 * per tag.
 *
 * A chip that after all this still does not reach `VIBE_MIN_RESULTS`
 * destinations is simply not shown (see `availableVibes`), so the UI grows
 * with the data without a code change.
 */
/** Also consumed by destinationCards.ts (server-side card building) */
export const VIBE_TOP_SHARE = 0.4;
const VIBE_MIN_RESULTS = 5;

/* ------------------------------------------------------------------ *
 * Attraction prices - and explicitly NOT "how much the trip will cost"
 * ------------------------------------------------------------------ */

export type PriceBand = 'free' | 'low' | 'high';

export const PRICE_BANDS: { key: PriceBand; label: string; emoji: string }[] = [
  { key: 'free', label: 'הרבה חינם', emoji: '🎟️' },
  { key: 'low', label: 'אטרקציות זולות', emoji: '🐷' },
  { key: 'high', label: 'אטרקציות יקרות', emoji: '💎' },
];

/**
 * The band is derived from the places' `priceLevel` (0=free through 3), which
 * exists in 149 of the 150 destinations with at least 4 priced places.
 *
 * **What this is not:** it is not "a cheap destination". Flights and lodging
 * are most of a trip's cost and the catalog holds no data on them, so a
 * destination with free museums and expensive hotels would look "cheap" here.
 * That is why the labels speak about attractions and not the destination, and
 * there is an explanation line under the filter. Tagging Switzerland
 * "budget-friendly" because entry to the mountains is free would have been
 * exactly the kind of false confidence hard rule 2 exists to prevent.
 */

/* ------------------------------------------------------------------ *
 * Season - the mechanism exists, the data does not yet
 * ------------------------------------------------------------------ */

/**
 * The season filter is ready, but **the catalog has no season field at all** -
 * no recommended months, no climate, nothing. Deriving one from latitude or a
 * guess would be good-looking advice on a nonexistent basis, and that is
 * exactly what is forbidden here.
 *
 * So: the code reads an optional `bestMonths` field (month numbers 1-12), the
 * filter appears in the UI **only if at least one destination carries it**,
 * and today it is simply not shown. The moment the data session adds the
 * field, the filter turns itself on with no code change.
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
  /** For free-text search: name, local name, slug, country */
  haystack: string;
}


/**
 * Only vibes that have enough destinations to be useful. A chip returning two
 * or zero wastes space and disappoints - and when the catalog grows, it will
 * appear on its own.
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

/** All conditions AND-ed; multiple selected vibes = must satisfy all of them */
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
 * A count per continent tab, **given the other filters**. That way the number
 * on the tab says "how many you will find if you click", not a general number
 * that leads to an empty screen.
 */
export function continentCounts(cards: DestinationCard[], f: Facets): Record<string, number> {
  const out: Record<string, number> = { all: filterDestinations(cards, { ...f, continent: 'all' }).length };
  for (const c of CONTINENTS) {
    out[c] = filterDestinations(cards, { ...f, continent: c }).length;
  }
  return out;
}
