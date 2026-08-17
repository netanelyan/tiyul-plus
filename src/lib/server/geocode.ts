/**
 * Coordinate lookup for pins (hotel, restaurant, free-form point) - server only.
 *
 * The iron rule here, parallel to the one in `booking.ts`: **the model never
 * supplies coordinates**. It supplies only what the traveler actually said
 * ("Hotel Devin, Bratislava"), and the conversion to a point on the map
 * happens here against OpenStreetMap. If the lookup found nothing, or the
 * result is weak - the pin is saved without a location and marked
 * "unverified", and the traveler can place it on the map themselves. We do
 * not drop a pin at the city center as a guess: a wrong location is worse
 * than a missing one.
 *
 * Provider: Nominatim (free, no key). Its terms of use require an identifying
 * User-Agent and no more than one request per second - both are enforced
 * here. Photon serves as a fallback if Nominatim is unavailable. For tests:
 * GEOCODE_NOMINATIM / GEOCODE_PHOTON override the URLs (like EXPLORE_WIKI_HE
 * in resolver.ts).
 *
 * Attribution: the results come from OpenStreetMap and are shown with the
 * required attribution in the UI.
 */

const NOMINATIM = process.env.GEOCODE_NOMINATIM ?? 'https://nominatim.openstreetmap.org/search';
const PHOTON = process.env.GEOCODE_PHOTON ?? 'https://photon.komoot.io/api';
const UA = 'tiyul-plus/1.0 (travel planner; contact via site)';

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** The full address as the provider returned it - for display, not parsing */
  address: string;
}

/** In-memory cache: the same query within the same process never goes out again */
const cache = new Map<string, GeocodeResult | null>();
const CACHE_MAX = 500;

/** Serial queue + delay, to honor Nominatim's one-request-per-second limit */
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 1100;

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastCall = Date.now();
    }
  });
  // The queue keeps going even after a failure, otherwise one failed request would stall the next ones
  chain = run.catch(() => undefined);
  return run;
}

const TIMEOUT_MS = 8000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  return res.json();
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Plausible coordinates only - guards against a corrupted response */
function valid(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

interface NominatimItem {
  lat?: string;
  lon?: string;
  display_name?: string;
}

async function viaNominatim(query: string): Promise<GeocodeResult | null> {
  const qs = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', addressdetails: '0' });
  const data = await getJson(`${NOMINATIM}?${qs}`);
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[0] as NominatimItem;
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!finite(lat) || !finite(lng) || !valid(lat, lng)) return null;
  return { lat, lng, address: item.display_name?.trim() || query };
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
}

/** Photon returns GeoJSON: coordinates are [lng, lat] - in that order */
async function viaPhoton(query: string): Promise<GeocodeResult | null> {
  const qs = new URLSearchParams({ q: query, limit: '1' });
  const data = (await getJson(`${PHOTON}?${qs}`)) as { features?: PhotonFeature[] };
  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!finite(lat) || !finite(lng) || !valid(lat, lng)) return null;
  const props = feature?.properties ?? {};
  const parts = ['name', 'street', 'city', 'country']
    .map((k) => props[k])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  return { lat, lng, address: parts.join(', ') || query };
}

/**
 * Place name (ideally with city/country too) → a point on the map, or null if not found.
 * Never throws: a network failure means "unverified", not an error shown to the user.
 */
export async function geocodePlace(
  name: string,
  context?: string,
): Promise<GeocodeResult | null> {
  const query = [name, context].filter(Boolean).join(', ').trim().replace(/\s+/g, ' ');
  // A too-short query (e.g. just the Hebrew word for "hotel") would return something random - better not to verify at all
  if (query.length < 3 || query.length > 160) return null;

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let result: GeocodeResult | null = null;
  for (const provider of [viaNominatim, viaPhoton]) {
    try {
      result = await throttle(() => provider(query));
      if (result) break;
    } catch {
      // Provider down/blocked - try the next one, and if it fails too the pin is saved unverified
    }
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, result);
  return result;
}

/** For tests only - clears the cache between test cases */
export function resetGeocodeCacheForTest(): void {
  cache.clear();
  lastCall = 0;
}
