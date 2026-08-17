// ---------- The trip model ----------
// A "trip" is the site's central object: an ordered list of cities,
// and days that each belong to a city and hold ordered stops.

export interface TripDay {
  id: string;
  citySlug: string; // which city the day belongs to
  placeIds: string[]; // stops, in order
  notes?: string;
}

// The traveler's preferences - collected in conversation with the agent,
// stored on the trip, and honored by both the agent's recommendations and
// the wizard. No preference is assumed in advance.
export interface TripPreferences {
  party?: 'couple' | 'family' | 'friends' | 'solo';
  pace?: 'relaxed' | 'packed';
  budget?: 'low' | 'medium' | 'high';
  kosher?: boolean;
  shabbatAware?: boolean;
  shopping?: 'more' | 'normal' | 'less';
  interests?: string[];
  /**
   * Travel style, used **only for displaying a typical daily spend**.
   *
   * This is deliberately not the `budget` above it: `budget` is collected in
   * conversation and affects place scoring (`priceLevel` penalties in
   * `generate.ts`), and it is also written by the agent. This field is
   * written **only from the UI**, has no agent tool, and therefore the model
   * cannot move the numbers the user sees - not even indirectly. A missing
   * value means "not chosen yet", in which case no number is shown at all.
   */
  travelStyle?: 'budget' | 'mid' | 'comfort';
  /**
   * What is already settled in the trip and what is still missing (flights,
   * lodging, tickets...). Stored only from what the user actually said - the
   * agent does not guess. The links themselves come from
   * `src/lib/booking.ts`, never from the model.
   */
  /**
   * Booking status **for the whole trip** - flights, eSIM, insurance, car.
   *
   * Also carries the historical lodging and tickets values, from the period
   * when they were trip-wide. They are read as the default for every city
   * until the first edit, then spread into `bookingByCity` and deleted from
   * here. See `bookingStatus.ts`.
   */
  booking?: Partial<Record<BookingKind, BookingStatus>>;
  /**
   * Booking status **per city**, for the kinds bought in a specific city
   * (lodging, tickets). "We have a hotel" on a Bratislava + Vienna trip is a
   * meaningless sentence - it is true of one and not the other, and that is
   * exactly what the old state could not express.
   */
  bookingByCity?: Partial<Record<BookingKind, Record<string, BookingStatus>>>;
}

/** The booking kinds the site knows how to talk about (the config itself is in `src/lib/booking.ts`) */
export type BookingKind = 'flights' | 'stay' | 'activities' | 'esim' | 'insurance' | 'car';

/** 'have' = already settled · 'need' = still needed · 'not_needed' = not relevant to this trip */
export type BookingStatus = 'have' | 'need' | 'not_needed';

/**
 * The pin kind. These three were chosen explicitly: lodging, a reservation
 * (restaurant/activity), and a free-form pin. There is no kind for
 * airports/stations - that is a product decision, not an omission.
 */
export type TripPinKind = 'stay' | 'reservation' | 'other';

/**
 * The coordinate source. 'geocoded' = found server-side against
 * OpenStreetMap, 'manual' = the traveler dragged the pin on the map
 * themselves. There is no third value: **the model never supplies
 * coordinates**. If the lookup failed or was ambiguous, the pin is saved
 * without lat/lng and marked "location not verified" - we do not guess the
 * city center.
 */
export type TripPinSource = 'geocoded' | 'manual';

/**
 * A pin the traveler added to the trip: the hotel they booked, a restaurant
 * where they reserved a table, or any point they want to see on the map.
 * Created mainly through the conversation with the agent ("I booked Hotel
 * Devin in Bratislava"), and drawn on the same trip map alongside the
 * catalog stops.
 */
export interface TripPin {
  id: string;
  kind: TripPinKind;
  /** what the traveler said - the name of the hotel/restaurant/place */
  name: string;
  /** which trip city the pin belongs to (a slug from citySlugs), if known */
  citySlug?: string;
  /** the address as returned by the lookup, display only */
  address?: string;
  lat?: number;
  lng?: number;
  source?: TripPinSource;
  /** the traveler's free-form note (confirmation number, check-in time) */
  note?: string;
  createdAt?: number;
}

export interface Trip {
  id: string;
  name: string;
  citySlugs: string[]; // the order of the trip's cities
  days: TripDay[];
  createdAt: number;
  /**
   * The trip dates, `YYYY-MM-DD` (a date, not a moment in time - see
   * `dates.ts`). Both optional: a trip without dates is a legitimate and
   * common state, so nothing in the UI requires them. Day N's date is
   * **derived** from `startDate` and not stored per day, so it cannot fall
   * out of sync with the day order. `endDate` is stored separately because
   * the user thinks in a range - and the gap between it and the day count is
   * shown to them explicitly instead of the date silently changing their
   * plan.
   */
  startDate?: string;
  endDate?: string;
  /** last-change stamp - written by the account sync layer (latest-wins merge) */
  updatedAt?: number;
  preferences?: TripPreferences;
  /** pins the traveler added (lodging, reservations, free-form points) */
  pins?: TripPin[];
}

/** Whether this city already has a saved lodging pin - so the agent does not ask twice */
export function hasStayPin(trip: Trip | null, citySlug: string): boolean {
  return Boolean(
    trip?.pins?.some((p) => p.kind === 'stay' && p.citySlug === citySlug),
  );
}

// The smart wizard's preferences
export interface WizardPrefs {
  citySlugs: string[];
  totalDays: number;
  pace: 'relaxed' | 'packed';
  tripType: 'city' | 'nature' | 'combined';
  shopping: 'more' | 'normal' | 'less';
  kosherOnly: boolean;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
