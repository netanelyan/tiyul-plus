/**
 * חיפוש קואורדינטות לסיכות (מלון, מסעדה, נקודה חופשית) - שרת בלבד.
 *
 * כלל הברזל כאן, במקביל לזה של `booking.ts`: **המודל לעולם לא מספק
 * קואורדינטות**. הוא מספק רק את מה שהמטייל אמר בפועל ("Hotel Devin,
 * ברטיסלבה"), והמרה לנקודה על המפה נעשית כאן מול OpenStreetMap. אם
 * החיפוש לא מצא, או שהתוצאה חלשה - הסיכה נשמרת בלי מיקום ומסומנת
 * "לא אומת", והמטייל יכול להניח אותה על המפה בעצמו. אנחנו לא מניחים
 * סיכה במרכז העיר כניחוש: מיקום שגוי גרוע ממיקום חסר.
 *
 * ספק: Nominatim (חינמי, בלי מפתח). תנאי השימוש שלו דורשים User-Agent
 * מזהה ולא יותר מבקשה אחת בשנייה - שניהם נאכפים כאן. Photon משמש
 * גיבוי אם Nominatim לא זמין. לבדיקות: GEOCODE_NOMINATIM / GEOCODE_PHOTON
 * דורסים את הכתובות (כמו EXPLORE_WIKI_HE ב-resolver.ts).
 *
 * ייחוס: התוצאות מגיעות מ-OpenStreetMap ומוצגות עם הייחוס הנדרש ב-UI.
 */

const NOMINATIM = process.env.GEOCODE_NOMINATIM ?? 'https://nominatim.openstreetmap.org/search';
const PHOTON = process.env.GEOCODE_PHOTON ?? 'https://photon.komoot.io/api';
const UA = 'tiyul-plus/1.0 (travel planner; contact via site)';

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** הכתובת המלאה כפי שהספק החזיר - לתצוגה, לא לניתוח */
  address: string;
}

/** מטמון בזיכרון: אותה שאילתה בתוך אותו תהליך לא יוצאת שוב החוצה */
const cache = new Map<string, GeocodeResult | null>();
const CACHE_MAX = 500;

/** תור סדרתי + השהיה, כדי לכבד את מגבלת בקשה-בשנייה של Nominatim */
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
  // התור ממשיך גם אחרי כישלון, אחרת בקשה אחת שנפלה תתקע את הבאות
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

/** קואורדינטות סבירות בלבד - שומר מפני תשובה משובשת */
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

/** Photon מחזיר GeoJSON: coordinates הן [lng, lat] - בסדר הזה */
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
 * שם מקום (ורצוי גם עיר/מדינה) → נקודה על המפה, או null אם לא נמצא.
 * לעולם לא זורק: כישלון רשת הוא "לא אומת", לא שגיאה למשתמש.
 */
export async function geocodePlace(
  name: string,
  context?: string,
): Promise<GeocodeResult | null> {
  const query = [name, context].filter(Boolean).join(', ').trim().replace(/\s+/g, ' ');
  // שאילתה קצרה מדי ("מלון") תחזיר משהו אקראי - עדיף לא לאמת בכלל
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
      // ספק שנפל/חסום - מנסים את הבא, ואם גם הוא נפל הסיכה תישמר לא מאומתת
    }
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, result);
  return result;
}

/** לבדיקות בלבד - מנקה את המטמון בין מקרי בדיקה */
export function resetGeocodeCacheForTest(): void {
  cache.clear();
  lastCall = 0;
}
