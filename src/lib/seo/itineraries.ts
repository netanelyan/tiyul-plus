/**
 * Itinerary landing pages - one per (destination x length), for the way Israelis
 * actually search.
 *
 * ## The gap this closes
 *
 * The site already had indexable destination, country and collection pages. What it
 * had nothing for was the query shape people actually type: **"maslul 5 yamim be-Roma" (a 5-day Rome itinerary)**,
 * "maslul 4 yamim be-Prag" (a 4-day Prague itinerary). A page about Rome is not a page about a five-day Rome
 * itinerary, and the second is what gets typed.
 *
 * ## Why these are not thin pages
 *
 * Google penalises mass-produced near-duplicates, and a city x length grid is
 * exactly the shape that earns that penalty if the pages are templates with a
 * number swapped. Every page here carries content that is genuinely unique to that
 * pair or that city, all of it already in the catalog and none of it generated:
 *
 * - the actual day-by-day stops for that length, with their real descriptions
 * - a map of those exact stops
 * - the real season line (`bestSeason`), per city
 * - the real kashrut note (`kosherOverview`), per city, including the honest
 *   "there is nothing here" ones
 * - direct flights from TLV (`practical.flights`), per city
 * - the editorial verdict, which names real drawbacks
 *
 * And one thing no competitor page has: a button that opens **that exact itinerary**
 * in the planner, editable. That is what turns a reader into a user in one tap, and
 * it is the reason these are landing pages rather than articles.
 *
 * ## Why the length is capped, not padded
 *
 * A length is offered only when the destination's curated itinerary actually has
 * that many days. Measured against the live catalog: 166 destinations have 3+ days,
 * 151 have 4+, 112 have 5+, and only 24 have 7+. Offering "7 days in Lisbon" when
 * three are curated would mean inventing four days, which hard rule 2 forbids - so
 * Lisbon simply has no 7-day page. Taking the FIRST n days is honest because the
 * itineraries are ordered deliberately (day 1 is the arrival city, days are packed
 * geographically), so the first three of six is a real three-day route.
 */

/**
 * The lengths worth a page. Not every integer: 1 and 2 days are a stopover rather
 * than a trip and nobody searches for a a 2-day "maslul" itinerary, 6 is
 * near-duplicate of 5 and 7 with nothing distinct to say, and past 7 the catalog has
 * 3 destinations in total.
 *
 * These four are also the numbers people type, which is the whole point of the page
 * type.
 */
export const ITINERARY_LENGTHS = [3, 4, 5, 7] as const;

export type ItineraryLength = (typeof ITINERARY_LENGTHS)[number];

export const isItineraryLength = (n: number): n is ItineraryLength =>
  (ITINERARY_LENGTHS as readonly number[]).includes(n);

export interface ItineraryPage {
  slug: string;
  days: ItineraryLength;
}

/**
 * Minimal shape - so this module never imports the catalog itself.
 *
 * `itineraryDays` rather than the itinerary array, because the two callers hold
 * different shapes of the same fact: the page has a full `Destination`
 * (`itinerary.length`) and the sitemap has a `DestinationSummary` (`days`, which the
 * provider already derived from exactly that). Normalising once here is what lets the
 * sitemap and `generateStaticParams` call the identical function - and they must, or
 * the submitted set and the built set drift into 404s.
 */
interface DestLike {
  slug: string;
  countrySlug: string;
  /** How many days the curated itinerary has. */
  itineraryDays: number;
}

/** Either catalog shape, normalised. */
export function toDestLike(
  d: { slug: string; countrySlug: string } & ({ days: number } | { itinerary: readonly unknown[] }),
): DestLike {
  return {
    slug: d.slug,
    countrySlug: d.countrySlug,
    itineraryDays: 'days' in d ? d.days : d.itinerary.length,
  };
}

/**
 * Every (destination, length) pair the catalog can honestly support.
 *
 * Deliberately NOT the set that ships - see `ROLLOUT_ORDER` and
 * `rolledOutItineraryPages`. This is the full space, used for validating an
 * incoming URL and for reporting how much room is left.
 */
export function allItineraryPages(destinations: readonly DestLike[]): ItineraryPage[] {
  const out: ItineraryPage[] = [];
  for (const d of destinations) {
    for (const days of ITINERARY_LENGTHS) {
      if (d.itineraryDays >= days) out.push({ slug: d.slug, days });
    }
  }
  return out;
}

/**
 * The market order Netanel set: the countries Israelis fly to most first, then the
 * winter risers. A page's value is its search demand, and demand follows flights -
 * so a 30-page first batch aimed at Greece and Italy is worth more than 30 pages
 * spread evenly over 83 countries.
 *
 * Countries rather than cities, because the demand is at the country level and the
 * cities follow from the catalog. A country not named here is not excluded - it is
 * simply later.
 */
export const ROLLOUT_ORDER: readonly string[] = [
  // The biggest markets by TLV traffic
  'greece',
  'usa',
  'uae',
  'italy',
  'cyprus',
  // The winter risers
  'thailand',
  'hungary',
  'romania',
  'czechia',
  'poland',
];

/**
 * How many pages are live. **30 to start, deliberately.**
 *
 * The instruction, and the reason it is a constant rather than "ship them all":
 * ship 30, confirm in Search Console that they index AND get impressions, then
 * scale in batches of 50. A domain with no authority that submits 453 near-sibling
 * pages at once is asking to be classified as a content farm; 30 that index and
 * earn impressions is evidence the shape works before it is repeated.
 *
 * Raising this is the whole rollout mechanism - no other change is needed.
 */
export const ITINERARY_ROLLOUT_LIMIT = 30;

/**
 * The pages that actually ship: **length-major, then market.** One length swept
 * across every destination before the next length starts.
 *
 * ## Why not city-major, which was the first version
 *
 * City-major took all four lengths of Athens, then all of Crete, and so on - and the
 * first 30 pages covered **three countries** (Greece 14, USA 11, UAE 5). Italy,
 * Cyprus and every winter riser got nothing, which is not the market spread the
 * rollout is for.
 *
 * Worse, it is the riskiest possible first batch: 3-, 4-, 5- and 7-day Athens are the
 * four most similar pages in the entire set, so a first submission designed to prove
 * "does this page type index" would instead have asked Google to judge a cluster of
 * near-duplicates. Length-major makes the first 30 thirty different cities.
 *
 * ## Why 5, then 4, then 3, then 7
 *
 * Five days is the most-searched length for a city break from Israel, so the sweep
 * that completes is the most valuable one. Seven is last because only 24 destinations
 * have a seven-day route at all.
 *
 * Stable: same input, same 30, so the sitemap does not churn between deploys and
 * `content-dates` does not re-date pages nothing changed on.
 */
export function rolledOutItineraryPages(
  destinations: readonly DestLike[],
  limit: number = ITINERARY_ROLLOUT_LIMIT,
): ItineraryPage[] {
  const LENGTH_ORDER: readonly number[] = [5, 4, 3, 7];
  const rank = (slug: string) => {
    const i = ROLLOUT_ORDER.indexOf(slug);
    return i === -1 ? ROLLOUT_ORDER.length : i;
  };

  const sorted = [...destinations].sort(
    (a, b) =>
      rank(a.countrySlug) - rank(b.countrySlug) ||
      // Alphabetical within a country, so the order cannot depend on catalog file order
      a.slug.localeCompare(b.slug),
  );

  /*
    **One page per city first - its single best length - and only then second lengths.**

    This took three attempts and each failure is worth recording, because they are the
    two ways a city x length grid goes wrong:

    1. **City-major** (all four lengths of Athens, then all of Crete) put the first 30
       pages in three countries, and made them the four most similar pages in the whole
       set. A first submission meant to answer "does this page type index" would have
       asked Google to judge a cluster of near-duplicates instead.
    2. **Length-major** (every city at 5 days, then every city at 4) fixed the
       duplication but reached Guatemala and Morocco before Cyprus and Romania - two of
       the ten markets the rollout exists to test - because the named markets have
       fewer than 30 destinations with a five-day route.

    Best-length-per-city gets both: 30 pages means 30 DIFFERENT cities, so there is no
    near-duplicate pair in the batch at all, and market order is honoured city by city
    rather than being spent on one country's second length.

    "Best" is the first length the city supports in LENGTH_ORDER - 5 where it exists,
    otherwise 4, otherwise 3. It is never 7 in this pass: a 7-day page is a deeper
    variant of a city already covered, which belongs to the second sweep.
  */
  const named = sorted.filter((d) => ROLLOUT_ORDER.includes(d.countrySlug));
  const rest = sorted.filter((d) => !ROLLOUT_ORDER.includes(d.countrySlug));

  const out: ItineraryPage[] = [];
  const seen = new Set<string>();
  const take = (slug: string, days: number) => {
    if (!isItineraryLength(days)) return false;
    const key = `${slug}/${days}`;
    if (seen.has(key)) return false;
    seen.add(key);
    out.push({ slug, days });
    return true;
  };

  // Pass 1: one page per city, best length, named markets before the rest.
  for (const group of [named, rest]) {
    for (const d of group) {
      if (out.length >= limit) return out;
      const best = LENGTH_ORDER.find((n) => n !== 7 && d.itineraryDays >= n);
      if (best !== undefined) take(d.slug, best);
    }
  }
  // Pass 2: the remaining lengths, same priority, only once every city has one page.
  for (const group of [named, rest]) {
    for (const days of LENGTH_ORDER) {
      for (const d of group) {
        if (out.length >= limit) return out;
        if (d.itineraryDays >= days) take(d.slug, days);
      }
    }
  }
  return out;
}

/** Is this exact page live? Used by the route to 404 anything not rolled out. */
export function isRolledOutItinerary(
  destinations: readonly DestLike[],
  slug: string,
  days: number,
): boolean {
  return rolledOutItineraryPages(destinations).some((p) => p.slug === slug && p.days === days);
}
