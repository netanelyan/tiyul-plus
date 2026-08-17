// ---------- Core domain types ----------
// Everything UI-facing is in Hebrew; nameLocal keeps the local-language name
// so it can be shown to taxi drivers / searched on Google Maps.

export type PlaceCategory =
  | 'attraction'
  | 'historic'
  | 'museum'
  | 'nature'
  | 'viewpoint'
  | 'cafe'
  | 'food'
  | 'market'
  | 'shopping'
  | 'kosher-food'
  | 'kosher-market';

// Explicit kashrut status for a place you eat at. **Required, and never a guess.**
// 'kosher' is said only of a place with reported supervision; 'not-kosher' of a
// place with no supervision or that serves what is forbidden; 'unknown' when it
// genuinely cannot be known - and that is shown to the user as such, never
// swallowed silently.
//
// **The status of kosher-* entries is derived, not written** (see kosherStatusOf
// in src/lib/categories.ts), so that no existing kosher entry is ever touched.
export type KosherStatus = 'kosher' | 'not-kosher' | 'unknown';

// A real source for an entry, with a date. The rule: no new food/market/shopping
// entry without a source. `checked` is the day the source was actually read - not
// the day the place opened and not an invented date.
export interface PlaceSource {
  url: string; // the URL that was actually read
  title: string; // what it is, in the source language or in English
  checked: string; // ISO date, YYYY-MM-DD
}

// Audience tags - a closed set, used both for filtering and for preference
// matching in the wizard's scoring
export type PlaceTag =
  | 'families'
  | 'nightlife'
  | 'romantic'
  | 'history'
  | 'art'
  | 'foodie'
  | 'outdoors';

// Kashrut details as reported by the source (Chabad house / the certifying
// body). Policy 2026-07-25: no per-entry verification system in the UI - the
// supervision is shown as a report (the "supervision: ..." line) alongside a
// general "verify with the venue" disclaimer. The lastChecked field stays in
// the data for compatibility and future use, but is not rendered and produces
// no warning badges. The only place that renders the status:
// src/components/KosherBadge.tsx.
export interface KosherVerification {
  source: string; // who determined it (curated / community / official)
  lastChecked: string; // ISO date or "pending-review"
  supervision: string; // the certifying body, in Hebrew
}

export interface Place {
  id: string;
  name: string; // Hebrew name
  nameLocal: string; // Local / English name (for Google Maps search, taxis)
  category: PlaceCategory;
  lat: number;
  lng: number;
  description: string; // Hebrew
  rating?: number; // 0-5, from provider (sample data = editorial estimate)
  durationMin?: number; // typical visit length
  kosherNote?: string; // hechsher / kashrut details, Hebrew
  kosherVerification?: KosherVerification; // the trust badge of kosher entries
  kosherStatus?: KosherStatus; // required for every category you eat at - see kosherStatusOf
  source?: PlaceSource; // where this came from and when it was checked
  externalUrl?: string; // deep link to Google Maps / TripAdvisor page
  photo?: string; // verified URL (Wikimedia/Unsplash); UI falls back to gradient
  priceLevel?: 0 | 1 | 2 | 3; // 0=free, 3=expensive
  tags?: PlaceTag[];
  mustSee?: boolean;
}

export interface DayPlan {
  day: number; // 1-based
  title: string; // Hebrew, e.g. an "old town and the cathedral" style day title
  placeIds: string[]; // ordered stops, referencing Place.id
  notes?: string; // Hebrew tips for the day
}

// Country-level facts: identical for every city in the country, so they live
// on the Country and cities reference them via countrySlug.
export interface CountryPractical {
  visa: string;
  currency: string;
  sim: string;
  payments: string;
}

export interface Country {
  slug: string;
  name: string; // Hebrew
  nameLocal: string; // Local / English name
  flag: string; // emoji
  tagline: string; // Hebrew one-liner
  summary: string; // Hebrew paragraph
  photo?: string; // hero photo URL (Unsplash); UI falls back to gradient
  practical: CountryPractical;
}

// City-level facts: specific to the city (its airport, its transit, its
// kosher scene). Country facts (visa, currency…) come from the Country.
export interface CityPractical {
  flights: string; // direct flights from TLV to this city's airport
  gettingAround: string;
  kosherOverview: string; // state of kosher food in the city
}

// The city's iconic wonder - shown on the first introduction card (homepage).
// Must point at a real, verified place; if there is none yet, leave a TODO
// rather than inventing a place that looks real (the project's iron rule).
export interface IconicLandmark {
  name: string; // Hebrew
  nameLocal: string;
  photo: string; // verified URL, same source/format as Place.photo
  blurb: string; // Hebrew, one-two factual sentences, no hours/price/kashrut
}

// ---------- Typical daily spend ----------
// **This block's rule: every number here is a quotation of a source, and the
// arithmetic happens in code.** We store exactly the three lines the source
// publishes for each travel style, and not a sum of them - so that every value
// appearing in the data is comparable against the page it was read from. The
// summing, rounding and multiplication by the number of days happen in
// `src/lib/trip/cost.ts`.
//
// **Lodging and flights are deliberately not stored here.** The source publishes
// them too; we do not copy them, so they cannot accidentally be included in a
// sum. Alcohol neither - it is an expense not everyone incurs, so it is not a
// "typical expense".
export interface DailyCostTier {
  transport: number; // local transport per day, per person
  food: number; // food per day, per person
  activities: number; // entries, tours and attractions per day, per person
}

export interface DailyCost {
  /** The local currency code as the source presented it (EUR, CZK, THB...) */
  currency: string;
  budget: DailyCostTier;
  mid: DailyCostTier;
  comfort: DailyCostTier;
  /** The page actually read and when - shown to the user, not just internal record-keeping */
  source: PlaceSource;
}

export interface Destination {
  slug: string;
  name: string; // Hebrew
  nameLocal: string;
  countrySlug: string; // references Country.slug
  flag: string; // emoji
  center: { lat: number; lng: number };
  zoom: number;
  tagline: string; // Hebrew one-liner
  summary: string; // Hebrew paragraph
  bestSeason: string;
  photo?: string; // hero photo URL (Unsplash); UI falls back to gradient
  iconicLandmark?: IconicLandmark;
  editorialRating?: EditorialRating;
  /**
   * Typical daily spend at this destination. **Optional on purpose**: a
   * destination without a figure shows no number, and gets no estimate. The
   * figure is attached to the destination in the provider layer
   * (`src/lib/providers/sample.ts`) from `src/data/dailyCosts.ts`.
   */
  dailyCost?: DailyCost;
  places: Place[];
  itinerary: DayPlan[];
  practical: CityPractical;
  dailyBudget?: DailyBudget; // daily on-the-ground cost - see DailyBudget
}

// An editorial rating by the tiyul+ team - explicitly NOT an average of real
// user reviews. Shown with transparent wording (the "team's recommendation"
// label) and without a star icon, so it cannot be confused with Place.rating
// (there: an editorial estimate per place; here: a score+reasoning at city level).
export interface EditorialRating {
  score: number; // 1-5
  verdict: string; // Hebrew, one sentence - why
}

// A traveler's typical daily cost at a destination - **on the ground only**:
// food, local transport, entries and small purchases. **Not including flights
// and not including lodging**, and that is the definition every entry here must
// meet. Most budget sources in the world publish a daily figure that includes
// lodging, so a number taken from them as-is does not measure the same thing.
//
// Why there are only two tiers: the source publishes three (backpacker /
// midrange / upscale), but its top tier is open-ended at the top ("100k+ JPY")
// or has no published lodging price that can be separated out. So `comfortable`
// stays empty at every destination - empty is the correct answer, not a guess.
// It must not be inferred from another city and no multiplier may be applied.
//
// Hard rules for every value here: one source per destination, at the scale of
// that same city only. Never derive a city from its neighbor, never project a
// national average onto a city, and never convert currency - the amount is
// recorded in the currency people actually pay in there.
export interface DailyBudget {
  currency: string; // ISO 4217, the currency paid in the city itself
  budget?: [number, number]; // a range; a single value is recorded as two identical ends
  midRange?: [number, number];
  comfortable?: [number, number]; // see the note above - empty on purpose
  // At what resolution the number was measured. 'country' = the source
  // publishes at country level only and the destination is a region inside it,
  // i.e. the number is coarser than the destination. Recorded explicitly so it
  // is not read as a measurement of that same city.
  scope?: 'city' | 'country';
  // true when the difference against the upper end of the lodging price came
  // out zero or negative, so only the lower end was subtracted. The result is
  // an upper bound (a single value), not a range.
  upperBoundOnly?: boolean;
  source: PlaceSource;
}

export interface DestinationSummary {
  slug: string;
  name: string;
  nameLocal: string;
  countrySlug: string;
  country: string; // Hebrew country name, resolved from countrySlug
  flag: string;
  tagline: string;
  days: number;
  kosherCount: number;
  photo?: string;
  editorialRating?: EditorialRating;
}

// ---------- Provider abstraction ----------
// The app talks only to this interface. Sample data ships in the repo;
// Google Places / TripAdvisor adapters enrich or replace it when API keys
// are configured. Swapping providers is a .env change, not a rewrite.

export interface PlacesProvider {
  readonly providerName: string;
  /** Countries are curated content - external providers delegate to sample. */
  getCountries(): Promise<Country[]>;
  getCountry(slug: string): Promise<Country | null>;
  getDestinations(): Promise<DestinationSummary[]>;
  getDestination(slug: string): Promise<Destination | null>;
  /** Free-text search within a destination (Hebrew or local language). */
  searchPlaces(slug: string, query: string): Promise<Place[]>;
}

// ── The calendar of what reshapes a trip ────────────────────────────────────
// This is not an events listing and we are not competing with Ticketmaster. The
// question it answers is "I am traveling to this city on these dates - what is
// worth my knowing".
//
// Two kinds of entries, and the second matters more:
//   'event'   - a big recurring thing that takes over the city (Oktoberfest,
//               carnival, holiday markets).
//   'closure' - a period when things are closed or unusual (national holidays,
//               fasts and religious observances, the month when half the city
//               goes on vacation).
//
// **The dates rule - the heart of this thing.** For every entry: either the
// exact dates for the coming year **were officially published**, and then they
// are recorded in `dates` with a link to the official source where they were
// read; or they were not published, and then **only a window in words**
// (`window`) is recorded, with `datesConfirmed: false`.
//
// **Never write a date that was derived, computed from last year, or
// remembered.** There is no middle ground. A window is a good answer; a wrong
// date is damage. The recurring trap is non-Gregorian calendars - Ramadan,
// Orthodox Easter, Tet, Dashain - where search results are full of computed
// dates that look official and are not.
//
// `recheckFrom` is when the official body usually publishes next year, so a
// future session knows when a window can become a date.
export type CalendarKind = 'event' | 'closure';
export type CalendarImpact = 'closures' | 'crowds' | 'both';

export interface CalendarDateRange {
  start: string; // ISO YYYY-MM-DD
  end: string; // ISO YYYY-MM-DD
}

export interface CalendarEntry {
  id: string;
  kind: CalendarKind;
  name: string; // Hebrew
  nameLocal: string;
  countrySlug: string;
  destinationSlugs?: string[]; // empty = affects the whole country
  datesConfirmed: boolean;
  dates?: CalendarDateRange[]; // only when officially published
  window?: string; // Hebrew, words only - when not published
  impact: CalendarImpact;
  note: string; // plain Hebrew: what this means in practice for the traveler
  recheckFrom?: string; // when it is worth checking again whether the dates were published
  source: PlaceSource;
}
