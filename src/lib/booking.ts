// ---------- The booking layer ----------
//
// This file's iron rule: **the agent never generates links**. The model decides
// only *what* to talk about (flights? lodging? tickets?) and stores the user's
// answer via the set_booking_status tool. The link itself is composed here,
// deterministically, from the config below - so an address, an affiliate id or
// a price cannot be invented.
//
// Commercial honesty (carried over from services.ts): as of today there is no
// real affiliate integration in the code. As long as `affiliate` is null, the
// button points at the provider's public site - with no invented tracking
// parameters. When a real affiliate id arrives, fill in `affiliate` (template +
// env var name) and no component changes.

import type { BookingKind } from './trip/types';

export type { BookingKind };

/**
 * Affiliate ids. Must be read as static access to `process.env.NEXT_PUBLIC_*`
 * so Next inlines them on the client side too (dynamic access by key is not
 * inlined and always returns undefined in the browser). All empty today - see
 * `.env.example`; the moment a real id exists, add it there and in Vercel.
 */
const AFFILIATE_IDS: Record<string, string | undefined> = {
  skyscanner: process.env.NEXT_PUBLIC_AFFILIATE_SKYSCANNER,
  booking: process.env.NEXT_PUBLIC_AFFILIATE_BOOKING,
  getyourguide: process.env.NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE,
  airalo: process.env.NEXT_PUBLIC_AFFILIATE_AIRALO,
};

export interface BookingAffiliate {
  /** The link template. {ID} = the affiliate id, {QUERY} = destination/city URL-encoded. */
  template: string;
  /** The key in AFFILIATE_IDS. Empty/missing => fall back to publicUrl. */
  idKey: keyof typeof AFFILIATE_IDS;
  /**
   * Whether the template is a **redirect wrapper** (an affiliate network that
   * receives the real destination encoded inside a parameter, e.g.
   * `awin1.com/cread.php?...&ued=<encoded>`).
   *
   * This is not a technical detail that can be skipped: search parameters
   * (dates, guests) must sit on the **destination URL**, and pasting them onto
   * the wrapper means sending them to the affiliate network and not to the
   * provider - i.e. a link that looks filled-in and lands on an empty search.
   * When adding a wrapped provider, mark true here and the parameters will not
   * be appended.
   */
  wrapped?: boolean;
}

export interface BookingProvider {
  kind: BookingKind;
  emoji: string;
  /**
   * Whether the booking belongs to a **city** rather than the trip.
   *
   * A hotel is bought in one city. "We have lodging" on a Bratislava+Vienna
   * trip is a sentence that cannot be answered correctly, and that is what
   * Netanel saw on the screen. A flight, eSIM, insurance and a car are for
   * the whole trip and not for any city in particular.
   *
   * The rule is marked explicitly rather than derived from the config, but
   * **a test ensures it matches whichever provider's search takes `{QUERY}`**
   * - i.e. a provider that searches a specific place. The two things cannot
   * drift apart silently.
   */
  perCity?: boolean;
  /** Title in Hebrew */
  title: string;
  /** A short Hebrew sentence - what this gives the traveler */
  blurb: string;
  /** The button label */
  cta: string;
  /** The agent's question - short, non-pushy wording, for one-time use */
  question: string;
  /** Provider name for display; null = no provider chosen yet ("coming soon") */
  provider: string | null;
  affiliate: BookingAffiliate | null;
  /**
   * Public search at the provider. {QUERY} is replaced with the destination's
   * English/Latin name. Without {QUERY} - it is simply the provider's homepage.
   * null => no provider => the card is in "coming soon" state.
   */
  publicUrl: string | null;
}

export const bookingProviders: BookingProvider[] = [
  {
    kind: 'flights',
    emoji: '✈️',
    title: 'טיסות',
    blurb: 'השוואת מחירים לטיסות מנתב"ג ליעד.',
    cta: 'חיפוש טיסות',
    question: 'כבר יש לכם טיסות ליעד, או שכדאי שאזכיר לחפש?',
    provider: 'Skyscanner',
    affiliate: null,
    // Homepage only: a flight deep-link requires airport codes not in the
    // data, and we will not invent a URL format.
    publicUrl: 'https://www.skyscanner.co.il/',
  },
  {
    kind: 'stay',
    perCity: true,
    emoji: '🏨',
    title: 'לינה',
    blurb: 'מלונות ודירות באזור הימים שתכננתם.',
    cta: 'חיפוש לינה',
    question: 'סגרתם לינה, או שתרצו שאפנה אתכם לחיפוש?',
    provider: 'Booking.com',
    affiliate: null,
    publicUrl: 'https://www.booking.com/searchresults.html?ss={QUERY}',
  },
  {
    kind: 'activities',
    perCity: true,
    emoji: '🎟️',
    title: 'כרטיסים ופעילויות',
    blurb: 'דילוגי תור, סיורים וחוויות - להזמין מראש.',
    cta: 'חיפוש חוויות',
    question: 'רוצים שאסמן אילו אטרקציות במסלול כדאי להזמין מראש?',
    provider: 'GetYourGuide',
    affiliate: null,
    publicUrl: 'https://www.getyourguide.com/s/?q={QUERY}',
  },
  {
    kind: 'esim',
    emoji: '📶',
    title: 'eSIM וגלישה',
    blurb: 'חבילת גלישה מקומית - מופעלת עוד לפני הנחיתה.',
    cta: 'חיפוש eSIM',
    question: 'יש לכם פתרון גלישה לחו"ל, או שנסתכל על eSIM?',
    provider: 'Airalo',
    affiliate: null,
    // Homepage: each country's slug at the provider is not documented on our side.
    publicUrl: 'https://www.airalo.com/',
  },
  {
    kind: 'insurance',
    emoji: '🛡️',
    title: 'ביטוח נסיעות',
    blurb: 'כיסוי רפואי וביטול - לפי אורך הטיול והפעילויות.',
    cta: 'חיפוש ביטוח נסיעות',
    question: 'דאגתם לביטוח נסיעות?',
    provider: 'World Nomads',
    affiliate: null,
    // Homepage: no affiliate id yet, and World Nomads has no destination-
    // dependent slug documented on our side - exactly like eSIM/flights below.
    publicUrl: 'https://www.worldnomads.com/',
  },
  {
    kind: 'car',
    emoji: '🚗',
    title: 'השכרת רכב',
    blurb: 'רכב לימי הטיול - חופש לצאת מחוץ לעיר.',
    cta: 'חיפוש רכב',
    question: 'המסלול יוצא מחוץ לעיר - תרצו שנבדוק רכב?',
    provider: 'Rentalcars.com',
    affiliate: null,
    // Homepage: a car rental is for the whole trip and not one city (perCity
    // is not marked above), so there is no {QUERY} to append - the same
    // decision as flights and eSIM.
    publicUrl: 'https://www.rentalcars.com/',
  },
];

export const bookingProvider = (kind: BookingKind): BookingProvider | undefined =>
  bookingProviders.find((p) => p.kind === kind);

/** Whether this kind is stored and displayed per city */
export const bookingIsPerCity = (kind: BookingKind): boolean =>
  Boolean(bookingProvider(kind)?.perCity);

/** Whether the provider's search takes a place - the basis for the test that pins `perCity` to reality */
export const bookingSearchTakesPlace = (kind: BookingKind): boolean => {
  const p = bookingProvider(kind);
  if (!p) return false;
  return Boolean(p.affiliate?.template.includes('{QUERY}') || p.publicUrl?.includes('{QUERY}'));
};

/**
 * Composes the outbound link. Entirely deterministic: there is no input from
 * the model here besides the booking kind, and the destination comes from the
 * trip's local data.
 *
 * @param query destination name to search at the provider (Latin, e.g. "Rome").
 *   Empty => homepage.
 * @param params additional search parameters (dates, guests). Appended **only**
 *   to a real search URL: with no destination there is nothing to filter, and
 *   on an affiliate network's redirect wrapper they would be sent to the wrong
 *   address (see `BookingAffiliate.wrapped`). Every value here is derived from
 *   the trip, not from the model - see `bookingSearch.ts`.
 * @returns a URL, or null if there is no provider yet ("coming soon" state).
 */
export function buildBookingUrl(
  kind: BookingKind,
  query?: string,
  params?: Record<string, string>,
): string | null {
  const p = bookingProvider(kind);
  if (!p) return null;

  const q = encodeURIComponent((query ?? '').trim());

  /** Appends parameters via the URL API, so encoding and special chars are not hand-written */
  const withParams = (url: string, allow: boolean): string => {
    if (!allow || !params || !q) return url;
    const entries = Object.entries(params).filter(([, v]) => v);
    if (entries.length === 0) return url;
    const u = new URL(url);
    for (const [k, v] of entries) u.searchParams.set(k, v);
    return u.toString();
  };

  if (p.affiliate) {
    const id = AFFILIATE_IDS[p.affiliate.idKey];
    // Without a real id there is no affiliate link - we do not invent one
    if (id) {
      const url = p.affiliate.template.replace('{ID}', id).replace('{QUERY}', q);
      return withParams(url, !p.affiliate.wrapped);
    }
  }

  if (!p.publicUrl) return null;
  if (!p.publicUrl.includes('{QUERY}')) return p.publicUrl;
  // With no destination to search - return to the site root rather than sending an empty search
  if (!q) return new URL(p.publicUrl).origin;
  return withParams(p.publicUrl.replace('{QUERY}', q), true);
}

/** Whether the provider exists yet (somewhere to point at) or the card is in "coming soon" state */
export const bookingAvailable = (kind: BookingKind): boolean =>
  buildBookingUrl(kind) !== null;

/** Whether the link is a real affiliate one (affects the link's rel and the disclosure) */
export function bookingIsAffiliate(kind: BookingKind): boolean {
  const p = bookingProvider(kind);
  return Boolean(p?.affiliate && AFFILIATE_IDS[p.affiliate.idKey]);
}

export const BOOKING_STATUS_LABELS: Record<'have' | 'need' | 'not_needed', string> = {
  have: 'כבר סגור',
  need: 'עוד צריך',
  not_needed: 'לא רלוונטי',
};
