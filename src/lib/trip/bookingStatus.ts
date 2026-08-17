import { bookingIsPerCity, bookingProviders } from '@/lib/booking';
import type { BookingKind, BookingStatus, Trip, TripPreferences } from './types';

/**
 * Reading and writing the booking state - **one implementation** for the
 * panel and for the agent.
 *
 * ## What changed and why
 *
 * Until now each booking kind had one state per trip. Netanel saw it on
 * screen: on a Bratislava + Vienna trip a single hotel is shown for all the
 * cities. **"We have lodging" is a sentence that cannot be answered
 * correctly on a multi-city trip** - it is true for one city and not the
 * other. Lodging and tickets are now stored per city; flight, eSIM,
 * insurance and car stay per trip, because they genuinely are per trip.
 *
 * ## Backward compatibility is the delicate part here
 *
 * Existing trips - in localStorage and in accounts - carry a single
 * `booking.stay`. Three behaviors, in this order:
 *
 * 1. **Read**: no record for the city ⇒ fall back to the legacy value. A
 *    trip marked "already booked" keeps looking booked in every city, and
 *    does not silently reset.
 * 2. **First write**: the legacy value is **spread across all the trip's
 *    cities** and only then the edit applies, and the legacy key is
 *    deleted. Without this, clearing a status in one city would "fall"
 *    back to the legacy value and read as a click that did not register.
 * 3. **Delete**: pressing the same status again clears this city only.
 *
 * The spread happens on write and not on load, deliberately: it is saved
 * with the trip along a path the user initiated, and there is no path where
 * merely loading changes data on disk.
 */

/** The kinds that belong to a city, per the config */
export const PER_CITY_KINDS: BookingKind[] = bookingProviders
  .filter((p) => bookingIsPerCity(p.kind))
  .map((p) => p.kind);

/** The kinds that belong to the trip as a whole */
export const TRIP_WIDE_KINDS: BookingKind[] = bookingProviders
  .filter((p) => !bookingIsPerCity(p.kind))
  .map((p) => p.kind);

/**
 * The status to display. `citySlug` is required for a per-city kind; without
 * it `undefined` is returned rather than a guess, because "which city's
 * hotel" is a question with no default answer.
 */
export function bookingStatusOf(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  citySlug?: string,
): BookingStatus | undefined {
  if (!bookingIsPerCity(kind)) return prefs?.booking?.[kind];
  if (!citySlug) return undefined;
  return prefs?.bookingByCity?.[kind]?.[citySlug] ?? prefs?.booking?.[kind];
}

/**
 * Toggling a status on/off. Returns a **patch** to the preferences, not a
 * trip - the same signature the panel and the agent already work with.
 *
 * Pressing the already-active status clears it, exactly as before.
 */
export function toggleBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[] },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  return writeBookingStatus(prefs, kind, status, { ...opts, toggle: true });
}

/**
 * Setting, without toggling off. This is what the agent uses: the traveler
 * said "we have a hotel in Vienna", and re-marking the same value must stay
 * "have" - not flip. The toggle-off is a UI gesture, not a conversational
 * one.
 */
export function setBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[] },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  return writeBookingStatus(prefs, kind, status, { ...opts, toggle: false });
}

function writeBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[]; toggle: boolean },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  const booking = { ...(prefs?.booking ?? {}) };
  const byCity: NonNullable<TripPreferences['bookingByCity']> = {
    ...(prefs?.bookingByCity ?? {}),
  };

  if (!bookingIsPerCity(kind)) {
    if (opts.toggle && booking[kind] === status) delete booking[kind];
    else booking[kind] = status;
    return { booking, bookingByCity: byCity };
  }

  const { citySlug, citySlugs } = opts;
  if (!citySlug) return { booking, bookingByCity: byCity };

  // The one-time spread of the legacy value, before touching anything
  const legacy = booking[kind];
  const cities: Record<string, BookingStatus> = { ...(byCity[kind] ?? {}) };
  if (legacy !== undefined) {
    for (const slug of citySlugs) if (cities[slug] === undefined) cities[slug] = legacy;
    delete booking[kind];
  }

  if (opts.toggle && cities[citySlug] === status) delete cities[citySlug];
  else cities[citySlug] = status;

  byCity[kind] = cities;
  return { booking, bookingByCity: byCity };
}

/**
 * How many items are still open (in the "still needed" sense) - the badge on
 * the section header.
 *
 * A per-city kind is counted **once per city**: two missing hotels on a
 * two-city trip are two things to do, not one.
 */
export function openBookingCount(trip: Trip | null): number {
  if (!trip) return 0;
  const prefs = trip.preferences;
  let n = 0;
  for (const kind of TRIP_WIDE_KINDS) if (bookingStatusOf(prefs, kind) === 'need') n += 1;
  for (const kind of PER_CITY_KINDS) {
    for (const slug of trip.citySlugs) {
      if (bookingStatusOf(prefs, kind, slug) === 'need') n += 1;
    }
  }
  return n;
}

/** Which cities are still open for a given kind - for a short label on the card */
export function citiesNeeding(trip: Trip | null, kind: BookingKind): string[] {
  if (!trip || !bookingIsPerCity(kind)) return [];
  return trip.citySlugs.filter((slug) => bookingStatusOf(trip.preferences, kind, slug) === 'need');
}
