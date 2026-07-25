import type { Destination, Place, PlaceCategory } from '@/lib/types';
import type { ExploredDestination } from './resolver';

/**
 * גשר בין ה-Explorer לדומיין הטיול: יעד שנחקר הופך ל-Destination מלא
 * (slug עם קידומת explored-) כדי שכל שכבות הטיול - קנבס, מפה, הדפסה,
 * הסוכן - יעבדו עליו בלי מקרים מיוחדים. השדות שאין לנו נאמרים בכנות
 * ("נחקר אוטומטית - לא נבדק"), לא מומצאים.
 *
 * sanitizeExploredDestinations מאמת את מה שהלקוח שולח חזרה לשרת (יעדים
 * שנחקרו בתורים קודמים ונשמרו אצלו) - השרת לא סומך על צורת הקלט.
 */

export const EXPLORED_PREFIX = 'explored-';
export const isExploredSlug = (slug: string) => slug.startsWith(EXPLORED_PREFIX);

const UNVERIFIED = 'יעד שנחקר אוטומטית ממקורות ציבוריים - לא נבדק על ידי הצוות';

export function exploredToDestination(x: ExploredDestination): Destination {
  return {
    slug: x.slug,
    name: x.name,
    nameLocal: x.nameLocal,
    countrySlug: 'explored',
    flag: '🧭',
    center: { lat: x.lat, lng: x.lng },
    zoom: 12,
    tagline: UNVERIFIED,
    summary: x.summary,
    bestSeason: '',
    places: x.places,
    itinerary: [],
    practical: {
      flights: 'לא נבדק - היעד נחקר אוטומטית. בדקו טיסות מול חברות התעופה.',
      gettingAround: '',
      kosherOverview: 'אין לנו מידע כשרות על היעד הזה.',
    },
  };
}

/* ---------- אימות קלט לקוח ---------- */

const CATEGORIES: PlaceCategory[] = [
  'attraction',
  'museum',
  'nature',
  'viewpoint',
  'cafe',
  'shopping',
  'kosher-food',
  'kosher-market',
];

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v : null;
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const httpsUrl = (v: unknown): string | undefined =>
  typeof v === 'string' && /^https:\/\/.{5,300}$/.test(v) ? v : undefined;

function sanitizePlace(raw: unknown): Place | null {
  const p = (raw ?? {}) as Record<string, unknown>;
  const id = typeof p.id === 'string' && /^xp-\d{1,12}$/.test(p.id) ? p.id : null;
  const name = str(p.name, 120);
  const lat = num(p.lat);
  const lng = num(p.lng);
  if (!id || !name || lat === null || lng === null) return null;
  const category = CATEGORIES.includes(p.category as PlaceCategory)
    ? (p.category as PlaceCategory)
    : 'attraction';
  return {
    id,
    name,
    nameLocal: str(p.nameLocal, 120) ?? name,
    category,
    lat,
    lng,
    description: (typeof p.description === 'string' ? p.description : '').slice(0, 500),
    externalUrl: httpsUrl(p.externalUrl),
    photo: httpsUrl(p.photo),
  };
}

/** עד 6 יעדים, עד 15 מקומות ליעד; כל מה שלא עובר אימות נזרק בשקט */
export function sanitizeExploredDestinations(raw: unknown): Destination[] {
  if (!Array.isArray(raw)) return [];
  const out: Destination[] = [];
  for (const item of raw.slice(0, 6)) {
    const d = (item ?? {}) as Record<string, unknown>;
    const slug =
      typeof d.slug === 'string' && /^explored-[a-z0-9-]{1,50}$/.test(d.slug) ? d.slug : null;
    const name = str(d.name, 80);
    const center = (d.center ?? {}) as Record<string, unknown>;
    const lat = num(center.lat);
    const lng = num(center.lng);
    if (!slug || !name || lat === null || lng === null) continue;
    const places = (Array.isArray(d.places) ? d.places : [])
      .slice(0, 15)
      .map(sanitizePlace)
      .filter((p): p is Place => p !== null);
    if (places.length === 0) continue;
    out.push({
      slug,
      name,
      nameLocal: str(d.nameLocal, 80) ?? name,
      countrySlug: 'explored',
      flag: '🧭',
      center: { lat, lng },
      zoom: 12,
      tagline: UNVERIFIED,
      summary: (typeof d.summary === 'string' ? d.summary : '').slice(0, 600),
      bestSeason: '',
      places,
      itinerary: [],
      practical: {
        flights: 'לא נבדק - היעד נחקר אוטומטית. בדקו טיסות מול חברות התעופה.',
        gettingAround: '',
        kosherOverview: 'אין לנו מידע כשרות על היעד הזה.',
      },
    });
  }
  return out;
}
