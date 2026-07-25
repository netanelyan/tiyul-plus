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
  source: 'wikipedia';
  exploredAt: number;
}

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

/** עיר → יעד ארעי עם עד maxPlaces אתרים אמיתיים סביבה */
export async function exploreDestination(
  query: string,
  maxPlaces = 12,
): Promise<ExploredDestination | null> {
  const q = query.trim();
  if (q.length < 2 || q.length > 60) return null;

  const found = await findCityPage(q);
  if (!found) return null;
  const { api, page: city } = found;
  const { lat, lon: lng } = city.coordinates![0];

  // אתרים בקרבת מרכז העיר
  const geo = (await wiki(api, {
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: '10000',
    ggslimit: '50',
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

  const candidates = Object.values(geo.query?.pages ?? {})
    .filter(
      (p) =>
        p.pageid !== city.pageid &&
        p.coordinates?.[0] &&
        p.pageprops?.disambiguation === undefined &&
        (p.extract?.length ?? 0) >= 40,
    )
    // איכות בלי דירוג: ערך ארוך יותר + תמונה = אתר משמעותי יותר
    .sort(
      (a, b) =>
        (b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0) || (b.length ?? 0) - (a.length ?? 0),
    )
    .slice(0, maxPlaces);

  if (candidates.length === 0) return null;

  const slugBase = (city.title.match(/[A-Za-z]+/g)?.join('-') ?? `city-${city.pageid}`).toLowerCase();
  const slug = `explored-${slugBase}`;

  const places: Place[] = candidates.map((p) => ({
    id: `xp-${p.pageid}`,
    name: p.title,
    nameLocal: p.title,
    category: guessCategory(p.title, p.extract ?? ''),
    lat: p.coordinates![0].lat,
    lng: p.coordinates![0].lon,
    description: p.extract ?? '',
    externalUrl: p.fullurl,
    photo: p.thumbnail?.source,
  }));

  return {
    slug,
    name: city.title,
    nameLocal: city.title,
    lat,
    lng,
    summary: city.extract ?? '',
    wikiUrl: city.fullurl ?? '',
    places,
    source: 'wikipedia',
    exploredAt: Date.now(),
  };
}
