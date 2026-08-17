import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * Server only - **aggregating trip rows into numbers**, with no network access.
 *
 * Deliberately separated from the route: this is the part that can be tested, and a
 * wrong number on a dashboard is a wrong business decision. The functions here are
 * pure - rows in, numbers out.
 *
 * **What the dashboard can see, and what it cannot.** Only **signed-in** users'
 * trips are synced to `user_trips`; an anonymous visitor's trip lives in
 * localStorage only and does not exist on the server. That is not an omission - it
 * is the consequence of not tracking people who did not sign up, and it matters
 * that the numbers are read that way and not as "every trip in the world".
 */

export interface TripRow {
  user_id: string;
  id: string;
  updated_at: string;
  data: unknown;
}

/** The minimal shape the aggregation relies on. A malformed row is simply not counted. */
interface TripShape {
  name?: unknown;
  citySlugs?: unknown;
  createdAt?: unknown;
  days?: unknown;
  pins?: unknown;
}

const COUNTRY_OF = new Map(destinations.map((d) => [d.slug, d.countrySlug]));
const CITY_NAME = new Map(destinations.map((d) => [d.slug, d.name]));
const COUNTRY_NAME = new Map(countries.map((c) => [c.slug, c.name]));

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface TripSummary {
  userId: string;
  id: string;
  name: string;
  citySlugs: string[];
  days: number;
  stops: number;
  pins: number;
  createdDay: string;
  updatedAt: string;
}

/** A raw row -> a summary, or null if it does not look like a trip */
export function summarize(row: TripRow): TripSummary | null {
  const t = (row?.data ?? null) as TripShape | null;
  // `Array.isArray` is not decoration: `typeof [] === 'object'`, and without it a
  // malformed row holding an array would be counted as a real trip with zero days -
  // i.e. faking the count and the median at the same time. Caught by a test.
  if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
  const days = Array.isArray(t.days) ? t.days : [];
  const citySlugs = Array.isArray(t.citySlugs) ? t.citySlugs.filter((s) => typeof s === 'string') : [];
  const created = typeof t.createdAt === 'number' ? t.createdAt : Date.parse(row.updated_at);
  return {
    userId: row.user_id,
    id: row.id,
    name: typeof t.name === 'string' ? t.name : '(ללא שם)',
    citySlugs: citySlugs as string[],
    days: days.length,
    stops: days.reduce(
      (n: number, d: unknown) =>
        n + (Array.isArray((d as { placeIds?: unknown })?.placeIds) ? (d as { placeIds: unknown[] }).placeIds.length : 0),
      0,
    ),
    pins: Array.isArray(t.pins) ? t.pins.length : 0,
    createdDay: isoDay(Number.isFinite(created) ? (created as number) : Date.now()),
    updatedAt: row.updated_at,
  };
}

export interface Aggregates {
  trips: number;
  travelers: number;
  withStops: number;
  /** Typical trip length - a median, because one outlier trip moves a mean */
  medianDays: number;
  medianStops: number;
  perDay: { day: string; trips: number }[];
  topCities: { slug: string; label: string; trips: number }[];
  topCountries: { slug: string; label: string; trips: number }[];
}

const median = (xs: number[]): number =>
  xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function top<T>(counts: Map<string, number>, label: (k: string) => string, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, trips]) => ({ slug, label: label(slug), trips })) as T;
}

export function aggregate(rows: TripSummary[], days = 30): Aggregates {
  const cities = new Map<string, number>();
  const nations = new Map<string, number>();
  const perDay = new Map<string, number>();

  // A skeleton of every day in the range, so a day with no trips shows as zero rather than vanishing
  for (let i = days - 1; i >= 0; i--) {
    perDay.set(isoDay(Date.now() - i * 86_400_000), 0);
  }

  for (const t of rows) {
    if (perDay.has(t.createdDay)) perDay.set(t.createdDay, (perDay.get(t.createdDay) ?? 0) + 1);
    // A city is counted once per trip, even if it has five days
    for (const slug of new Set(t.citySlugs)) {
      cities.set(slug, (cities.get(slug) ?? 0) + 1);
    }
    /*
      **And the country once per trip too.** A Rome+Venice trip is one trip to Italy,
      not two; counting by city would have turned "where people plan to go" into a
      measure of how many cities a country has in the catalog. Caught by a test.
    */
    const seenCountries = new Set<string>();
    for (const slug of new Set(t.citySlugs)) {
      const c = COUNTRY_OF.get(slug);
      if (c) seenCountries.add(c);
    }
    for (const c of seenCountries) nations.set(c, (nations.get(c) ?? 0) + 1);
  }

  return {
    trips: rows.length,
    travelers: new Set(rows.map((r) => r.userId)).size,
    withStops: rows.filter((r) => r.stops > 0).length,
    medianDays: median(rows.map((r) => r.days)),
    medianStops: median(rows.map((r) => r.stops)),
    perDay: [...perDay.entries()].map(([day, trips]) => ({ day, trips })),
    topCities: top(cities, (s) => CITY_NAME.get(s) ?? s, 12),
    topCountries: top(nations, (s) => COUNTRY_NAME.get(s) ?? s, 12),
  };
}

/* ============================================================
   A single trip as the admin sees it - read only
   ============================================================ */

/**
 * The trip as the admin sees it: **names, not ids**.
 *
 * The decoding happens here on the server and not in the browser, for the same
 * reason the shared-trip page receives its cities as props: the catalog is ~2MB, and
 * there is no reason for the admin area to drag it into the browser just to turn
 * `vie-stephansdom` into a place name.
 *
 * A place that is not in the catalog (an automatically explored city, for example)
 * is shown by its id and marked `unknown` - that is what is actually stored, and
 * hiding it would be a small lie.
 */
export interface TripViewStop {
  id: string;
  name: string;
  category?: string;
  mustSee?: boolean;
  unknown?: boolean;
}

export interface TripViewDay {
  n: number;
  citySlug: string;
  cityName: string;
  countryName: string | null;
  stops: TripViewStop[];
  notes?: string;
}

export interface TripView {
  name: string;
  startDate?: string;
  endDate?: string;
  createdAt?: number;
  days: TripViewDay[];
  pins: { name: string; kind: string; located: boolean; citySlug?: string }[];
  preferences: { label: string; value: string }[];
}

const PLACE_OF = new Map(
  destinations.flatMap((d) => d.places.map((p) => [p.id, p] as const)),
);

/** Only preferences that were actually set. An empty field is not "no", it is "not asked". */
const PREF_LABELS: Record<string, [string, Record<string, string>]> = {
  party: ['מי נוסע', { couple: 'זוג', family: 'משפחה', friends: 'חברים', solo: 'לבד' }],
  pace: ['קצב', { relaxed: 'רגוע', packed: 'עמוס' }],
  budget: ['תקציב', { low: 'חסכוני', medium: 'בינוני', high: 'גבוה' }],
  shopping: ['שופינג', { more: 'יותר', normal: 'רגיל', less: 'פחות' }],
  travelStyle: ['סגנון', { budget: 'חסכוני', mid: 'בינוני', comfort: 'נוח' }],
};

export function tripView(data: unknown): TripView | null {
  const t = (data ?? null) as
    | {
        name?: unknown;
        days?: unknown;
        pins?: unknown;
        startDate?: unknown;
        endDate?: unknown;
        createdAt?: unknown;
        preferences?: Record<string, unknown>;
      }
    | null;
  if (!t || typeof t !== 'object') return null;

  const rawDays = Array.isArray(t.days) ? t.days : [];
  const days: TripViewDay[] = rawDays.map((d, i) => {
    const day = (d ?? {}) as { citySlug?: unknown; placeIds?: unknown; notes?: unknown };
    const slug = typeof day.citySlug === 'string' ? day.citySlug : '';
    const dest = destinations.find((x) => x.slug === slug);
    const ids = Array.isArray(day.placeIds) ? day.placeIds.filter((x) => typeof x === 'string') : [];
    return {
      n: i + 1,
      citySlug: slug,
      cityName: dest?.name ?? slug,
      countryName: dest ? (COUNTRY_NAME.get(dest.countrySlug) ?? null) : null,
      stops: (ids as string[]).map((id) => {
        const p = PLACE_OF.get(id);
        return p
          ? { id, name: p.name, category: p.category, mustSee: p.mustSee }
          : { id, name: id, unknown: true };
      }),
      notes: typeof day.notes === 'string' && day.notes.trim() ? day.notes : undefined,
    };
  });

  const prefs = (t.preferences ?? {}) as Record<string, unknown>;
  const preferences: { label: string; value: string }[] = [];
  for (const [key, [label, map]] of Object.entries(PREF_LABELS)) {
    const v = prefs[key];
    if (typeof v === 'string' && map[v]) preferences.push({ label, value: map[v] });
  }
  if (prefs.kosher === true) preferences.push({ label: 'כשרות', value: 'כן' });
  if (prefs.shabbatAware === true) preferences.push({ label: 'שבת', value: 'מתחשב' });

  return {
    name: typeof t.name === 'string' ? t.name : '(ללא שם)',
    startDate: typeof t.startDate === 'string' ? t.startDate : undefined,
    endDate: typeof t.endDate === 'string' ? t.endDate : undefined,
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : undefined,
    days,
    pins: (Array.isArray(t.pins) ? t.pins : []).map((p) => {
      const pin = (p ?? {}) as Record<string, unknown>;
      return {
        name: typeof pin.name === 'string' ? pin.name : '(ללא שם)',
        kind: typeof pin.kind === 'string' ? pin.kind : 'other',
        located: Number.isFinite(pin.lat) && Number.isFinite(pin.lng),
        citySlug: typeof pin.citySlug === 'string' ? pin.citySlug : undefined,
      };
    }),
    preferences,
  };
}
