import type { Place, PlaceCategory } from '@/lib/types';

/**
 * The AI Explorer - the "outside the catalog" layer: when a destination that
 * does not exist in the curated data is requested, instead of "not covered"
 * we build an ephemeral destination from real data at runtime - a Wikipedia
 * search (Hebrew, then English) → the city's coordinates → geosearch for
 * sites around it → extracts + photos. The same sources that feed the curated
 * pipeline, only without the human curation - which is why every result is
 * labeled "auto-explored · not reviewed by us". Nothing is invented:
 * description = the article's extract, photo = the article's image,
 * coordinates = from the article.
 *
 * Server only (outbound fetch + future keys). The /api/explore route wraps it.
 * For tests: EXPLORE_WIKI_HE / EXPLORE_WIKI_EN override the API URLs.
 */

const HE_API = process.env.EXPLORE_WIKI_HE ?? 'https://he.wikipedia.org/w/api.php';
const EN_API = process.env.EXPLORE_WIKI_EN ?? 'https://en.wikipedia.org/w/api.php';
const UA = 'tiyul-plus/1.0 (travel planner; contact via site)';

export interface ExploredDestination {
  /** An ephemeral slug, identifies explored and does not collide with the catalog */
  slug: string;
  name: string; // the city name as found (Hebrew if available)
  nameLocal: string;
  lat: number;
  lng: number;
  summary: string;
  wikiUrl: string;
  places: Place[];
  /** The radius actually scanned, in km - 10 for a city, more when there is a car */
  rangeKm: number;
  source: 'wikipedia';
  exploredAt: number;
}

/** The search scope: the city itself, or the whole area around it - for those with a car */
export type ExploreScope = 'city' | 'area';

/** Wikipedia limits geosearch to 10 km; a wide range is built from several centers */
const WIKI_MAX_RADIUS_KM = 10;
const AREA_RANGE_KM = 45;
export const scopeRangeKm = (scope: ExploreScope) =>
  scope === 'area' ? AREA_RANGE_KM : WIKI_MAX_RADIUS_KM;

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  length?: number;
  coordinates?: { lat: number; lon: number }[];
  thumbnail?: { source: string };
  pageprops?: { disambiguation?: string };
  fullurl?: string;
}

async function wiki(api: string, params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const res = await fetch(`${api}?${qs}`, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  return res.json();
}

/** A category guess from the title/extract - a transparent heuristic, not "knowledge" */
function guessCategory(title: string, extract: string): PlaceCategory {
  const s = `${title} ${extract}`;
  if (/מוזיאון|museum|galler|גלריה/i.test(s)) return 'museum';
  if (/פארק|גן |שמורת|אגם|הר |חוף|יער|מפל|park|garden|lake|beach|forest|waterfall|nature/i.test(s))
    return 'nature';
  if (/תצפית|מגדל|צוק|viewpoint|observation|tower/i.test(s)) return 'viewpoint';
  if (/שוק|קניון|market|mall|bazaar|shopping/i.test(s)) return 'shopping';
  if (/בית קפה|קפה |café|coffee/i.test(s)) return 'cafe';
  return 'attraction';
}

async function findCityPage(query: string): Promise<{ api: string; page: WikiPage } | null> {
  for (const api of [HE_API, EN_API]) {
    try {
      const data = (await wiki(api, {
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrlimit: '3',
        prop: 'coordinates|extracts|info|pageprops',
        exintro: '1',
        explaintext: '1',
        exsentences: '2',
        inprop: 'url',
        colimit: '1',
      })) as { query?: { pages?: Record<string, WikiPage> } };
      const pages = Object.values(data.query?.pages ?? {});
      // The first page with coordinates that is not a disambiguation page = the city
      const city = pages
        .sort((a, b) => (b.length ?? 0) - (a.length ?? 0))
        .find((p) => p.coordinates?.[0] && p.pageprops?.disambiguation === undefined);
      if (city) return { api, page: city };
    } catch {
      /* move on to the next wiki */
    }
  }
  return null;
}

/** Straight-line distance in km (haversine) - for honest labeling of "how far from the city center" */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Search centers: a single circle up to 10 km, and beyond that a ring of 8
 * points around the city (Wikipedia does not allow a larger radius in one
 * call). Sampling, not perfect coverage - enough to find the significant
 * sites in the area.
 */
function searchCenters(lat: number, lng: number, rangeKm: number): { lat: number; lng: number }[] {
  const centers = [{ lat, lng }];
  if (rangeKm <= WIKI_MAX_RADIUS_KM) return centers;
  const ringKm = Math.min(rangeKm, AREA_RANGE_KM) * 0.6;
  const latPerKm = 1 / 111;
  const lngPerKm = 1 / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    centers.push({
      lat: lat + Math.sin(angle) * ringKm * latPerKm,
      lng: lng + Math.cos(angle) * ringKm * lngPerKm,
    });
  }
  return centers;
}

async function geosearch(
  api: string,
  center: { lat: number; lng: number },
  limit: number,
): Promise<WikiPage[]> {
  try {
    const geo = (await wiki(api, {
      action: 'query',
      generator: 'geosearch',
      ggscoord: `${center.lat}|${center.lng}`,
      ggsradius: String(WIKI_MAX_RADIUS_KM * 1000),
      ggslimit: String(limit),
      ggsnamespace: '0',
      prop: 'coordinates|extracts|pageimages|info|pageprops',
      exintro: '1',
      explaintext: '1',
      exlimit: 'max',
      exsentences: '2',
      piprop: 'thumbnail',
      pithumbsize: '500',
      inprop: 'url',
      colimit: 'max',
    })) as { query?: { pages?: Record<string, WikiPage> } };
    return Object.values(geo.query?.pages ?? {});
  } catch {
    return []; // one failed point does not bring down the whole exploration
  }
}

/**
 * City → an ephemeral destination with up to maxPlaces real sites around it.
 * scope='area' also scans the surrounding area (up to ~45 km) - sensible for
 * someone with a car, and therefore never forced on someone without one.
 */
export async function exploreDestination(
  query: string,
  maxPlaces = 12,
  scope: ExploreScope = 'city',
): Promise<ExploredDestination | null> {
  const q = query.trim();
  if (q.length < 2 || q.length > 60) return null;

  const found = await findCityPage(q);
  if (!found) return null;
  const { api, page: city } = found;
  const { lat, lon: lng } = city.coordinates![0];
  const rangeKm = scopeRangeKm(scope);

  // Sites near the city center (and within driving range, if an area was requested)
  const centers = searchCenters(lat, lng, rangeKm);
  const pages = await Promise.all(
    centers.map((c, i) => geosearch(api, c, i === 0 ? 50 : 20)),
  );

  const byId = new Map<number, WikiPage>();
  for (const page of pages.flat()) if (!byId.has(page.pageid)) byId.set(page.pageid, page);

  const usable = [...byId.values()]
    .filter(
      (p) =>
        p.pageid !== city.pageid &&
        p.coordinates?.[0] &&
        p.pageprops?.disambiguation === undefined &&
        (p.extract?.length ?? 0) >= 40,
    )
    .map((p) => ({
      page: p,
      km: distanceKm(lat, lng, p.coordinates![0].lat, p.coordinates![0].lon),
    }))
    .filter((c) => c.km <= rangeKm)
    // Quality without a rating: a longer article + a photo = a more significant site
    .sort(
      (a, b) =>
        (b.page.thumbnail ? 1 : 0) - (a.page.thumbnail ? 1 : 0) ||
        (b.page.length ?? 0) - (a.page.length ?? 0),
    );

  // Even in a wide scan, most stops stay in the city itself - the area adds
  // day trips, it does not scatter the whole trip across 45 km
  const nearQuota = Math.ceil(maxPlaces * 0.6);
  const near = usable.filter((c) => c.km <= WIKI_MAX_RADIUS_KM);
  const far = usable.filter((c) => c.km > WIKI_MAX_RADIUS_KM);
  const picked = [...near.slice(0, nearQuota), ...far.slice(0, maxPlaces - nearQuota)];
  if (picked.length < maxPlaces) {
    for (const c of [...near.slice(nearQuota), ...far.slice(maxPlaces - nearQuota)]) {
      if (picked.length >= maxPlaces) break;
      picked.push(c);
    }
  }
  const candidates = picked;

  if (candidates.length === 0) return null;

  const slugBase = (city.title.match(/[A-Za-z]+/g)?.join('-') ?? `city-${city.pageid}`).toLowerCase();
  const slug = `explored-${slugBase}`;

  const places: Place[] = candidates.map(({ page: p, km }) => {
    const extract = p.extract ?? '';
    // A computed distance, not invented - someone without a car needs to know this is a drive
    const far = km > 12 ? ` · כ-${Math.round(km)} ק"מ ממרכז ${city.title}` : '';
    return {
      id: `xp-${p.pageid}`,
      name: p.title,
      nameLocal: p.title,
      category: guessCategory(p.title, extract),
      lat: p.coordinates![0].lat,
      lng: p.coordinates![0].lon,
      description: `${extract}${far}`,
      externalUrl: p.fullurl,
      photo: p.thumbnail?.source,
    };
  });

  return {
    slug,
    name: city.title,
    nameLocal: city.title,
    lat,
    lng,
    summary: city.extract ?? '',
    wikiUrl: city.fullurl ?? '',
    places,
    rangeKm,
    source: 'wikipedia',
    exploredAt: Date.now(),
  };
}
