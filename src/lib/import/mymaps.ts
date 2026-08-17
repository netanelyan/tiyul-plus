import type { Destination, Place, PlaceCategory } from '@/lib/types';

/**
 * Server only - importing a map from Google My Maps.
 *
 * A map shared as "anyone with the link" can be exported as public KML at
 * google.com/maps/d/kml?mid=<id>&forcekml=1 - no API key. We extract the
 * mid from the link the user pasted, fetch the KML, and break the
 * Placemarks (name, description, point) into an explored-style
 * destination - so all the trip layers (canvas, map, agent, print) work on
 * it with no special cases.
 *
 * Security: we never fetch a URL the user sent as-is. Only the mid (safe
 * characters only) is extracted from the input, and the KML URL is built by
 * us. Short links (maps.app.goo.gl) are opened with redirect: manual - we
 * read only the Location header and extract a mid from it, without
 * following to an arbitrary URL.
 *
 * TripAdvisor: it has no public export of Trips/saved maps (the Content
 * API does not expose them) - so there is no fake support for it here.
 */

export const MYMAPS_MAX_PLACES = 40;

const KML_BASE = () => process.env.MYMAPS_KML_BASE ?? 'https://www.google.com';
const SHORTLINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);
const MID_RE = /[?&]mid=([A-Za-z0-9_-]{10,80})/;

/** Extracts a mid from a full My Maps link; null when there is none */
export function extractMid(input: string): string | null {
  const m = input.match(MID_RE);
  return m ? m[1] : null;
}

/** Whether this is a Google Maps short link that needs one resolution to get a mid */
export function isShortLink(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return SHORTLINK_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Resolving a short link: we read only the redirect's Location, never follow it */
export async function resolveShortLink(input: string): Promise<string | null> {
  try {
    const u = new URL(input.trim());
    if (!SHORTLINK_HOSTS.has(u.hostname)) return null;
    const res = await fetch(u.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    const loc = res.headers.get('location');
    return loc ? extractMid(loc) : null;
  } catch {
    return null;
  }
}

export interface ParsedKmlPlace {
  name: string;
  description: string;
  lat: number;
  lng: number;
}

export interface ParsedKml {
  name: string;
  places: ParsedKmlPlace[];
  /** How many Placemarks were cut off due to the size cap */
  truncated: number;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Text from a tag: also supports CDATA, strips inner HTML (My Maps descriptions) */
function tagText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  let text = m[1].trim();
  const cdata = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) text = cdata[1];
  // My Maps descriptions arrive as HTML - keep text only
  text = text.replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

/**
 * Parsing My Maps KML: only Placemarks with a <Point> (stops). Lines and
 * polygons (walking routes, areas) are skipped - they have no single honest
 * "place".
 */
export function parseKml(xml: string): ParsedKml | null {
  if (!xml.includes('<kml') && !xml.includes('<Placemark')) return null;
  const docName =
    tagText(xml.match(/<Document[^>]*>([\s\S]*?)<Placemark/i)?.[1] ?? '', 'name') ||
    tagText(xml, 'name') ||
    'מפה מיובאת';

  const blocks = xml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) ?? [];
  const places: ParsedKmlPlace[] = [];
  let truncated = 0;
  for (const block of blocks) {
    // Point only - the coordinates must come from inside <Point>, not from a line
    const point = block.match(/<Point[^>]*>([\s\S]*?)<\/Point>/i);
    if (!point) continue;
    const coords = point[1].match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
    if (!coords) continue;
    const [lngRaw, latRaw] = coords[1].trim().split(',');
    const lng = Number(lngRaw);
    const lat = Number(latRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      continue;
    if (places.length >= MYMAPS_MAX_PLACES) {
      truncated++;
      continue;
    }
    const name = tagText(block, 'name').slice(0, 120);
    if (!name) continue;
    places.push({
      name,
      description: tagText(block, 'description').slice(0, 400),
      lat,
      lng,
    });
  }
  if (places.length === 0) return null;
  return { name: docName.slice(0, 80), places, truncated };
}

/** Fetches a map's KML by mid. null on failure (private / nonexistent / network). */
export async function fetchKmlByMid(mid: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(mid)) return null;
  try {
    const res = await fetch(`${KML_BASE()}/maps/d/kml?mid=${mid}&forcekml=1`, {
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'tiyulplus-import/1.0' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // A fair size cap - this is a personal map's KML; 4MB is no longer that
    if (text.length > 4_000_000) return null;
    return text;
  } catch {
    return null;
  }
}

/** Transparent category guess from the place name - default attraction, no inventions */
function guessCategory(name: string): PlaceCategory {
  const n = name.toLowerCase();
  if (/מוזיאון|museum|galer|גלרי/.test(n)) return 'museum';
  if (/פארק|גן |שמורת|אגם|הר |מפל|חוף|park|lake|beach|waterfall|forest|יער/.test(n)) return 'nature';
  if (/תצפית|viewpoint|צוק|מצפה/.test(n)) return 'viewpoint';
  if (/קפה|cafe|coffee|מסעד|restaurant|בר |מאפי/.test(n)) return 'cafe';
  if (/שוק|קניון|market|mall|חנות|shop/.test(n)) return 'shopping';
  return 'attraction';
}

/** Short, stable hash for the slug - the same map gets the same destination on every import */
function slugHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * The conversion to an explored-style destination: an explored- prefixed
 * slug and xp-N ids, so the destination passes sanitizeExploredDestinations
 * on subsequent chat turns and works in every trip layer like an explored
 * destination.
 */
export function kmlToDestination(parsed: ParsedKml, mid: string): Destination {
  const places: Place[] = parsed.places.map((p, i) => ({
    id: `xp-${9_000_000 + i}`,
    name: p.name,
    nameLocal: p.name,
    category: guessCategory(p.name),
    lat: p.lat,
    lng: p.lng,
    description: p.description || 'יובא מ-Google My Maps - כפי שהוזן במפה המקורית.',
  }));
  const center = {
    lat: places.reduce((s, p) => s + p.lat, 0) / places.length,
    lng: places.reduce((s, p) => s + p.lng, 0) / places.length,
  };
  return {
    slug: `explored-mymaps-${slugHash(mid)}`,
    name: parsed.name,
    nameLocal: parsed.name,
    countrySlug: 'explored',
    flag: '📍',
    center,
    zoom: 12,
    tagline: 'יובא מ-Google My Maps - לא נבדק על ידי הצוות',
    summary: `מפה שיובאה מ-Google My Maps (${places.length} מקומות). התוכן כפי שהוזן במפה המקורית - כדאי לוודא פרטים לפני הנסיעה.`,
    bestSeason: '',
    places,
    itinerary: [],
    practical: {
      flights: 'לא נבדק - המפה יובאה מ-Google My Maps.',
      gettingAround: '',
      kosherOverview: 'אין לנו מידע כשרות על היעד הזה.',
    },
  };
}
