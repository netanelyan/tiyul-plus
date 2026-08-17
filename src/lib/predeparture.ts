import { countdown } from '@/lib/trip/dates';
import type { Trip } from '@/lib/trip/types';

/**
 * The "pre-departure check" - the site's first paid product.
 *
 * A shared file (client + server), **with no secret in it**: price,
 * product id, offer window and the report's shape. The price is set
 * **here only** and is actually read only by the server
 * (`server/paypal.ts` builds the order from this constant) - the client
 * shows it for display purposes, and no request leaving the browser
 * carries an amount.
 *
 * ## Why this is not a tier and not a subscription
 *
 * This is a one-time purchase **for a specific trip**, not a permission
 * that changes from `free` to `premium`. It has no connection to
 * `Plan`/`Tier` in `lib/plans.ts` and must never have one - no existing
 * feature is gated against this product.
 */

export const PRODUCT_ID = 'predeparture-check';

/** 29.90 ILS, Netanel's decision. Two digits after the point - that is what PayPal expects for ILS. */
export const PRICE_ILS = 29.9;
export const CURRENCY = 'ILS';

/** For display in the UI */
export const priceLabel = () => `${PRICE_ILS.toFixed(2)} ₪`;

/**
 * The offer window: how many days before departure the check is
 * considered "worth something". Outside this window (too far out, already
 * mid-trip, or the trip is over) the offer is simply not shown - it is
 * irrelevant, not "not yet available".
 *
 * 21 days was chosen because that is roughly the moment when weather,
 * closures and events start being things genuinely worth re-checking -
 * two-three weeks before a real trip, not three months out while the plan
 * will still move.
 */
export const OFFER_WINDOW_DAYS = 21;

export interface EligibilityResult {
  eligible: boolean;
  /** Why not, for debugging/tests - never shown to the user as-is */
  reason?: 'no-dates' | 'too-early' | 'in-progress-or-past';
}

/**
 * Whether it is worth offering the check for this trip **right now**.
 * Always checked against a real date supplied from outside (`todayISO`) -
 * not an internal `Date.now()` - so the display is deterministic in tests
 * and does not depend on the hydration clock.
 */
export function checkOfferEligibility(trip: Pick<Trip, 'startDate' | 'endDate'>, todayISO: string): EligibilityResult {
  if (!trip.startDate) return { eligible: false, reason: 'no-dates' };
  const cd = countdown(todayISO, trip.startDate, trip.endDate);
  if (!cd) return { eligible: false, reason: 'no-dates' };
  if (cd.kind === 'future') {
    return cd.days <= OFFER_WINDOW_DAYS ? { eligible: true } : { eligible: false, reason: 'too-early' };
  }
  if (cd.kind === 'today') return { eligible: true };
  return { eligible: false, reason: 'in-progress-or-past' };
}

/* ============ The report's shape ============ */

export interface ReportPlaceFlag {
  dayNumber: number;
  placeId: string;
  reason: 'not-in-catalog';
}

export interface ReportKosherNote {
  dayNumber: number;
  placeId: string;
  name: string;
  status: 'kosher' | 'not-kosher' | 'unknown';
  supervision?: string;
  lastChecked?: string;
  note: string;
}

export interface ReportCalendarFinding {
  name: string;
  impact: string;
  note: string;
  dates: string;
  dayNumbers: number[];
  sourceUrl: string;
}

export interface ReportItineraryStop {
  name: string;
  category: string;
  mustSee?: boolean;
  unknown?: boolean;
}

export interface ReportItineraryDay {
  dayNumber: number;
  cityName: string;
  date?: string;
  stops: ReportItineraryStop[];
}

export interface PreDepartureReport {
  generatedAt: string;
  tripName: string;
  startDate?: string;
  endDate?: string;
  placesChecked: number;
  placesFlagged: ReportPlaceFlag[];
  kosherChecked: number;
  kosherNotes: ReportKosherNote[];
  calendarFindings: ReportCalendarFinding[];
  routeOk: boolean;
  routeNote?: string;
  itinerary: ReportItineraryDay[];
}
