import type { Place, PlaceCategory } from '@/lib/types';

/**
 * ה-AI Explorer - שכבת "מחוץ לקטלוג": כשמבקשים יעד שלא קיים בדאטה
 * האוצרת, במקום "לא מכוסה" אנחנו בונים יעד ארעי מנתונים אמיתיים בזמן
 * אמת - חיפוש ויקיפדיה (עברית ואז אנגלית) → קואורדינטות העיר →
 * geosearch לאתרים סביבה → תקצירים + תמונות. אותם מקורות שמזינים את
 * הפייפליין האוצר, רק בלי הקיורציה האנושית - ולכן כל תוצאה מסומנת
 * "נחקר אוטומטית · לא נבדק על ידינו". שום דבר לא מומצא: תיאור = תקציר
 * הערך, תמונה = תמונת הערך, קואורדינטות = מהערך.
 *
 * שרת בלבד (fetch יוצא + מפתחות עתידיים). ה-route /api/explore עוטף.
 * לבדיקות: EXPLORE_WIKI_HE / EXPLORE_WIKI_EN דורסים את כתובות ה-API.
 */

const HE_API = process.env.EXPLORE_WIKI_HE ?? 'https://he.wikipedia.org/w/api.php';
const EN_API = process.env.EXPLORE_WIKI_EN ?? 'https://en.wikipedia.org/w/api.php';
const UA = 'tiyul-plus/1.0 (travel planner; contact via site)';

export interface ExploredDestination {
  /** slug ארעי, מזהה explored ולא מתנגש עם הקטלוג */
  slug: string;
  name: string; // שם העיר כפי שנמצא (עברית אם יש)
  nameLocal: string;
  lat: number;
  lng: number;
  summary: string;
  wikiUrl: string;
  places: Place[];
  /** הרדיוס שנסרק בפועל, בק"מ - 10 לעיר, יותר כשיש רכב */
  rangeKm: number;
  source: 'wikipedia';
  exploredAt: number;
}

/** טווח החיפוש: העיר עצמה, או כל האזור סביבה - למי שיש רכב */
export type ExploreScope = 'city' | 'area';

/** ויקיפדיה מגבילה geosearch ל-10 ק"מ; טווח רחב נבנה מכמה מרכזים */
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

/** ניחוש קטגוריה מהכותרת/תקציר - היוריסטיקה שקופה, לא "ידע" */
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
      // העמוד הראשון עם קואורדינטות שאינו דף פירושונים = העיר
      const city = pages
        .sort((a, b) => (b.length ?? 0) - (a.length ?? 0))
        .find((p) => p.coordinates?.[0] && p.pageprops?.disambiguation === undefined);
      if (city) return { api, page: city };
    } catch {
      /* ממשיכים לוויקי הבא */
    }
  }
  return null;
}

/** מרחק אווירי בק"מ (haversine) - לתיוג כן של "כמה רחוק ממרכז העיר" */
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
 * מרכזי חיפוש: עיגול אחד עד 10 ק"מ, ומעבר לזה טבעת של 8 נקודות סביב
 * העיר (ויקיפדיה לא מאפשרת רדיוס גדול יותר בקריאה אחת). דגימה, לא
 * כיסוי מושלם - מספיק כדי למצוא את האתרים המשמעותיים באזור.
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
    return []; // נקודה אחת שנפלה לא מפילה את כל החקירה
  }
}

/**
 * עיר → יעד ארעי עם עד maxPlaces אתרים אמיתיים סביבה.
 * scope='area' סורק גם את האזור שמסביב (עד ~45 ק"מ) - הגיוני למי שיש
 * רכב, ולכן אף פעם לא נכפה על מי שאין לו.
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

  // אתרים בקרבת מרכז העיר (ובטווח נסיעה, אם ביקשו אזור)
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
    // איכות בלי דירוג: ערך ארוך יותר + תמונה = אתר משמעותי יותר
    .sort(
      (a, b) =>
        (b.page.thumbnail ? 1 : 0) - (a.page.thumbnail ? 1 : 0) ||
        (b.page.length ?? 0) - (a.page.length ?? 0),
    );

  // גם בסריקה רחבה, רוב העצירות נשארות בעיר עצמה - האזור מוסיף
  // טיולי יום, לא מפזר את כל הטיול על פני 45 ק"מ
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
    // מרחק מחושב, לא מומצא - מי שבלי רכב צריך לדעת שזו נסיעה
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
