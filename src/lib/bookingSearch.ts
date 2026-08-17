// ---------- Prefilled provider search (lodging / experiences) ----------
//
// ## The rule this whole file exists for
//
// When a traveler asks for help with a hotel or tickets, the answer is **a
// real search at a real provider, with their details already filled in** -
// and not numbers, hotel names or availability claims from the model. Hence:
//
// - **There is no textual or numeric input from the model here.** The
//   `booking_search` tool receives exactly two things from the model: which
//   kind of search, and which city. Everything else - dates, guest count,
//   budget, kashrut - is derived from `Trip` (what the traveler themselves
//   said or chose in the UI) and from our data.
// - **The model cannot type a number even if it wants to**, because the tool
//   has no numeric parameter. This is not a prompt prohibition but the
//   absence of a field.
// - The URL itself is assembled in `src/lib/booking.ts`, from the config,
//   like every other booking link on the site.
//
// ## Restaurants are not here, deliberately
//
// Food stays our curated catalog (with its kashrut info and caveats) and
// with no price search at all. `SearchKind` is a closed union of two, so
// there is no value through which "restaurant" could be passed.
//
// ## What is NOT sent to the provider, and why
//
// Only parameters the providers themselves generate in their public search
// URLs are sent. **A price filter is not sent**: its format at Booking is
// undocumented (`nflt=...`), and guessing a URL format is exactly what this
// project has already paid dearly for. Instead, the budget the traveler
// stated is shown on the card as text, with a line saying the filtering is
// done on the provider's site. A wrong parameter would fail silently (the
// provider simply ignores it) - while still showing the traveler "filtered
// by your budget", i.e. a promise that was not kept.

import { buildBookingUrl, bookingIsAffiliate, bookingProvider } from './booking';
import { addDays, dayDate, formatHebrewRange } from './trip/dates';
import type { Trip, TripPreferences } from './trip/types';

/** The two search kinds the agent can open. Restaurants are not on the list - see above. */
export type SearchKind = 'stay' | 'activities';

export const SEARCH_KINDS: SearchKind[] = ['stay', 'activities'];

/**
 * What the user sees. Built **entirely on the server** from the trip and
 * the data, and sent ready-made to the client - so the rendering has no way
 * to add a number of its own.
 */
export interface BookingSearchCard {
  kind: SearchKind;
  /** the card title, in Hebrew */
  title: string;
  /** the button label */
  cta: string;
  /** the provider name, shown next to the button */
  provider: string;
  url: string;
  /** a genuine affiliate link (affects rel and the disclosure wording) */
  isAffiliate: boolean;
  cityLabel: string;
  /** "what I understood from the request" - every chip is derived from the trip, none from the model */
  understood: string[];
  /** what did not go into the URL and is therefore set on the provider's site */
  onProvider: string[];
}

const KIND_COPY: Record<SearchKind, { title: string; cta: string }> = {
  // No "the cheapest" and no "the best price" here: we do not scan all
  // providers and cannot make such a claim. See the test in
  // priceGuard.test.ts that scans the whole codebase and makes sure that
  // wording does not creep back in.
  stay: { title: 'חיפוש מלונות ולינה', cta: 'פתיחת החיפוש' },
  activities: { title: 'חיפוש כרטיסים, סיורים וחוויות', cta: 'פתיחת החיפוש' },
};

const BUDGET_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'תקציב חסכוני',
  medium: 'תקציב בינוני',
  high: 'תקציב מרווח',
};

/**
 * The stay range **in a specific city**, derived from the order of the
 * trip's days.
 *
 * This is the heart of "already filled in": on a multi-city trip, the
 * check-in dates in Vienna are the dates of the days actually IN Vienna -
 * not the dates of the whole trip. The derivation is from `startDate` + the
 * day number, exactly as everywhere else on the site, so it cannot fall out
 * of sync with the day order.
 *
 * Check-out is **the day after** the last day in the city: whoever sleeps
 * there on the night of day 8 leaves on the 9th. Three days in a city are
 * three nights, and that is what the provider expects.
 */
export function cityStayRange(
  trip: Trip | null,
  citySlug: string,
): { checkIn: string; checkOut: string } | null {
  if (!trip?.startDate) return null;
  const indexes = trip.days
    .map((d, i) => (d.citySlug === citySlug ? i : -1))
    .filter((i) => i >= 0);
  if (indexes.length === 0) return null;
  const checkIn = dayDate(trip, indexes[0]);
  const lastDay = dayDate(trip, indexes[indexes.length - 1]);
  if (!checkIn || !lastDay) return null;
  const checkOut = addDays(lastDay, 1);
  return checkOut ? { checkIn, checkOut } : null;
}

/**
 * Number of adults, **only when it is unambiguous**.
 *
 * `party` is the only signal we have, and it does not always state a number:
 * "friends" could be two or five, and "family" does not say how many
 * children. In those cases nothing is sent and the card says the guest
 * count is set at the provider - better than inventing two children for
 * somebody.
 */
export function adultsFromParty(party: TripPreferences['party']): number | null {
  if (party === 'solo') return 1;
  if (party === 'couple') return 2;
  return null;
}

/**
 * The parameters sent to the provider. The parameter names are those the
 * providers themselves generate in their search URLs, and deliberately
 * **the minimum**: destination, dates, guests.
 *
 * Not verified over the network from this environment (booking.com and
 * getyourguide are blocked here), so what was chosen is the set that fails
 * safely: a parameter the provider does not recognize is simply ignored and
 * the traveler gets a less prefilled search - not a wrong claim. Real
 * verification is one click on the button from a normal network.
 */
function providerParams(
  kind: SearchKind,
  range: { checkIn: string; checkOut: string } | null,
  adults: number | null,
): Record<string, string> {
  if (kind !== 'stay') return {}; // for GetYourGuide only `q` is verified on our side
  const params: Record<string, string> = {};
  if (range) {
    params.checkin = range.checkIn;
    params.checkout = range.checkOut;
  }
  if (adults) params.group_adults = String(adults);
  return params;
}

/**
 * Builds the card. Fully deterministic: the same trip + the same city + the
 * same kind always return the same URL and the same chips.
 *
 * @param cityQuery the city's Latin name from our data (e.g. "Rome")
 * @param cityLabel the Hebrew name, for display
 */
export function buildSearchCard(
  trip: Trip | null,
  kind: SearchKind,
  citySlug: string,
  cityQuery: string,
  cityLabel: string,
  extra: { kosher?: boolean; accessible?: boolean } = {},
): BookingSearchCard | null {
  const provider = bookingProvider(kind);
  if (!provider?.provider) return null; // no provider chosen - nothing to show

  const range = cityStayRange(trip, citySlug);
  const prefs = trip?.preferences ?? {};
  const adults = adultsFromParty(prefs.party);
  const url = buildBookingUrl(kind, cityQuery, providerParams(kind, range, adults));
  if (!url) return null;

  const understood: string[] = [cityLabel];
  const onProvider: string[] = [];

  if (kind === 'stay') {
    if (range) understood.push(formatHebrewRange(range.checkIn, range.checkOut));
    else onProvider.push('תאריכים');
    if (adults) understood.push(adults === 1 ? 'נוסע אחד' : `${adults} מבוגרים`);
    else onProvider.push('מספר אורחים');
  }

  // The budget is shown as what the traveler said, and is not filtered in the URL - see the explanation at the top of the file
  const budget = prefs.budget;
  if (budget) {
    understood.push(BUDGET_LABEL[budget]);
    onProvider.push('סינון לפי מחיר');
  }
  // Kashrut and accessibility: the providers have no documented parameter we
  // know of, so they are stated as an understood constraint - and explicitly
  // marked as something filtered on the provider's site. A promise we cannot
  // keep in the URL will not be written as if it were kept.
  const kosher = extra.kosher ?? prefs.kosher;
  if (kosher) {
    understood.push('מטבח כשר');
    onProvider.push('סינון כשרות');
  }
  if (extra.accessible) {
    understood.push('נגישות');
    onProvider.push('סינון נגישות');
  }

  return {
    kind,
    title: KIND_COPY[kind].title,
    cta: KIND_COPY[kind].cta,
    provider: provider.provider,
    url,
    isAffiliate: bookingIsAffiliate(kind),
    cityLabel,
    understood,
    onProvider,
  };
}

/**
 * The disclosure. **Mandatory, not optional** - shown on every search card.
 *
 * The wording is correct in both states: as long as no affiliate ID is in
 * the environment the link points to the public site and we receive
 * nothing, hence "may" - not "receive".
 */
export const SEARCH_DISCLOSURE =
  'הקישור מוביל לאתר הזמנות חיצוני, ואנחנו עשויים לקבל עמלה - זה לא משפיע על מה שאנחנו מציעים. המחיר והזמינות נקבעים שם.';
