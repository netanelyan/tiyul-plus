/**
 * Turning somebody's private trip into a page the whole internet may read.
 *
 * ## The rule this file exists to enforce
 *
 * A trip is the most personal object this product holds. It carries who is
 * coming, where they are sleeping, what they wrote to each other, and the exact
 * fortnight their home is empty. **Publishing is opt-in, and what gets published
 * is not the trip - it is a reconstruction of the trip from the catalog.**
 *
 * So this does not "remove fields from a Trip". It builds a new object out of
 * the only two things that are not the traveler's: **which catalog city** and
 * **which catalog place ids**. Everything a reader sees on the public page -
 * names, descriptions, photos, the day summaries, the cost - is then looked up
 * from the catalog at render time. That direction matters: a denylist of
 * sensitive fields silently leaks whatever gets added to `Trip` next, and
 * `Trip` has grown pins, preferences and booking state since it was written.
 *
 * What is therefore *structurally* impossible to publish, rather than merely
 * stripped:
 *
 * | not carried          | why it is dangerous                          |
 * |----------------------|----------------------------------------------|
 * | `name`               | free text - surnames, private jokes          |
 * | `days[].notes`       | free text, per day                           |
 * | `pins`               | **the hotel, and sometimes the home address** |
 * | `preferences`        | kosher/Shabbat observance, party, budget      |
 * | `startDate`/`endDate`| the exact window a house stands empty         |
 * | `id`, `updatedAt`    | correlatable back to the owner's own trip     |
 *
 * Comments, votes and RSVPs never appear here at all: they live in the
 * `trip_group_*` tables, keyed by invite, and nothing in this path reads them.
 *
 * ## Dates become a month
 *
 * "15-29 August" is a burglary window. "August" is the single most useful fact
 * for a reader deciding whether this itinerary fits their trip - weather, crowds,
 * and whether the fountains are on. So the month survives and the days do not,
 * and the month is derived from `startDate` only, never from the end.
 */
import type { Trip } from './types';

/** The stored public snapshot. Bumped if the shape ever changes. */
export const PUBLIC_TRIP_VERSION = 1;

/**
 * The minimum a page needs before it is worth putting in front of a search
 * engine. Below this it still publishes - the owner asked - but as `noindex`.
 *
 * Eight is the brief's number, and it is a sensible one: a 2-3 stop trip is a
 * list, not an itinerary, and a search result that opens onto one teaches Google
 * that this site publishes thin pages.
 */
export const MIN_STOPS_TO_INDEX = 8;

export interface PublicDay {
  citySlug: string;
  placeIds: string[];
}

export interface PublicTripSnapshot {
  v: typeof PUBLIC_TRIP_VERSION;
  days: PublicDay[];
  /** `YYYY-MM`, or null. Never a day - see the header. */
  month: string | null;
}

/** What the caller needs to know to resolve a place id - the catalog, narrowed. */
export interface CatalogLookup {
  /** Place ids that exist in this city, or undefined if the city is unknown. */
  placeIdsOf(citySlug: string): Set<string> | undefined;
}

/**
 * The public snapshot of a trip, built from the catalog outward.
 *
 * Every place id is checked against the city it claims to be in. A stop that is
 * not a catalog place is **dropped** rather than rendered - the brief asks for
 * this, and it is also what makes the "only verified places" promise true: the
 * agent can add a traveler's own pin to a day, and a pin is free text they typed.
 *
 * A day left with no surviving stops is kept as an empty day, because dropping it
 * would renumber every day after it and the public page would claim a four-day
 * trip is three. An empty day renders as a rest day, which is honest.
 */
export function toPublicSnapshot(trip: Trip, catalog: CatalogLookup): PublicTripSnapshot {
  const days: PublicDay[] = [];
  for (const day of trip.days ?? []) {
    const known = catalog.placeIdsOf(day.citySlug);
    // An unknown city cannot validate its stops, so none of them survive.
    const placeIds = known ? (day.placeIds ?? []).filter((id) => known.has(id)) : [];
    days.push({ citySlug: day.citySlug, placeIds });
  }
  return { v: PUBLIC_TRIP_VERSION, days, month: monthOf(trip.startDate) };
}

/**
 * `YYYY-MM` from a `YYYY-MM-DD`, or null.
 *
 * Validated by shape rather than by `Date`, deliberately: `new Date('2026-13-40')`
 * does not throw, it rolls over into the next year, so parsing would turn a corrupt
 * value into a confident wrong month.
 */
export function monthOf(startDate: string | undefined): string | null {
  if (typeof startDate !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(startDate);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2]}`;
}

/** Catalog stops that survived the strip. The number the index gate reads. */
export const stopCount = (snap: PublicTripSnapshot): number =>
  snap.days.reduce((n, d) => n + d.placeIds.length, 0);

/** The city a page is "about": the one with the most days, ties broken by first appearance. */
export function primaryCity(snap: PublicTripSnapshot): string | null {
  const byCity = new Map<string, number>();
  for (const d of snap.days) byCity.set(d.citySlug, (byCity.get(d.citySlug) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [slug, n] of byCity) {
    if (n > bestN) {
      best = slug;
      bestN = n;
    }
  }
  return best;
}

/**
 * Whether this page may be indexed.
 *
 * **Not whether it may be published** - the owner decides that, and this function
 * never gates the publish itself. It decides only what the page tells crawlers and
 * whether the trips sitemap lists it. The two were conflated in the brief; keeping
 * them apart is what makes "opt-in" mean opt-in.
 */
export function indexable(snap: PublicTripSnapshot, catalog: CatalogLookup): boolean {
  if (stopCount(snap) < MIN_STOPS_TO_INDEX) return false;
  const city = primaryCity(snap);
  return Boolean(city && catalog.placeIdsOf(city));
}

/* ---------------------------------------------------------------- *
 * The slug
 * ---------------------------------------------------------------- */

/**
 * No `i`, `l`, `o`, `0` or `1`. The same alphabet the share codes use, for the
 * same reason: these ids get read aloud and typed by hand.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SHORT_ID_LEN = 8;

/** A short id. Lower-case only, so the slug survives a case-insensitive round trip. */
export function newShortId(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < SHORT_ID_LEN; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/**
 * `/trips/<city>-<days>-<shortid>`.
 *
 * The city slug and day count are in the URL because a URL is read by people and
 * quoted in search results, and "rome-5-k7m2pq9x" says what the page is before it
 * loads. The short id is what makes it unique - two people can both publish a
 * five-day Rome trip, and neither should be able to guess the other's URL.
 */
export const buildSlug = (citySlug: string, dayCount: number, shortId: string): string =>
  `${citySlug}-${dayCount}-${shortId}`;

/** The shape `buildSlug` produces, for validating a slug off the wire before it reaches the database. */
export const SLUG_SHAPE = new RegExp(`^[a-z0-9-]{1,80}-\\d{1,3}-[${ALPHABET}]{${SHORT_ID_LEN}}$`);

export const isPublicTripSlug = (slug: string): boolean =>
  typeof slug === 'string' && SLUG_SHAPE.test(slug);

/* ---------------------------------------------------------------- *
 * Reading a stored snapshot back
 * ---------------------------------------------------------------- */

/**
 * Parse a snapshot that came out of the database.
 *
 * Re-validated rather than trusted, even though we wrote it: the row is JSON, the
 * catalog moves underneath it, and this value is about to be rendered on a public
 * page. A place that has since left the catalog is dropped here exactly as it
 * would have been at publish time, so a page can never name something we no
 * longer hold data for.
 */
export function parseSnapshot(raw: unknown, catalog: CatalogLookup): PublicTripSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== PUBLIC_TRIP_VERSION || !Array.isArray(o.days)) return null;

  const days: PublicDay[] = [];
  for (const d of o.days) {
    if (!d || typeof d !== 'object') return null;
    const day = d as Record<string, unknown>;
    if (typeof day.citySlug !== 'string') return null;
    const ids = Array.isArray(day.placeIds) ? day.placeIds.filter((x): x is string => typeof x === 'string') : [];
    const known = catalog.placeIdsOf(day.citySlug);
    days.push({ citySlug: day.citySlug, placeIds: known ? ids.filter((id) => known.has(id)) : [] });
  }
  const month = typeof o.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(o.month) ? o.month : null;
  return { v: PUBLIC_TRIP_VERSION, days, month };
}

/** The Hebrew month name, for the one date fact a public page carries. */
const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** The month name from a `YYYY-MM`. The year is dropped on purpose - see below. */
export function monthLabel(month: string | null): string | null {
  if (!month) return null;
  const n = Number(month.slice(5, 7));
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  /*
    The year is deliberately not shown. The useful fact is the season - what the
    weather and the crowds are like - and that repeats every year, whereas a year
    makes a perfectly good itinerary look stale to a reader in eighteen months'
    time. It also narrows the window a published trip describes, which is the
    thing this module is careful about everywhere else.
  */
  return MONTHS_HE[n - 1];
}
