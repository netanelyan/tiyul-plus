import type { Destination, Place, PlaceCategory } from '@/lib/types';

/**
 * שרת בלבד - ייבוא מפה מ-Google My Maps.
 *
 * מפה ששותפה כ"כל מי שיש לו הקישור" ניתנת לייצוא KML ציבורי בכתובת
 * google.com/maps/d/kml?mid=<id>&forcekml=1 - בלי מפתח API. אנחנו
 * מחלצים את ה-mid מהקישור שהמשתמש הדביק, מושכים את ה-KML, ומפרקים את
 * ה-Placemarks (שם, תיאור, נקודה) ליעד בסגנון explored - כך שכל שכבות
 * הטיול (קנבס, מפה, סוכן, הדפסה) עובדות עליו בלי מקרים מיוחדים.
 *
 * אבטחה: לעולם לא מושכים כתובת שהמשתמש שלח כמו-שהיא. מהקלט מחולץ רק
 * ה-mid (תווים בטוחים בלבד) וכתובת ה-KML נבנית אצלנו. קישורים מקוצרים
 * (maps.app.goo.gl) נפתחים עם redirect: manual - קוראים רק את כותרת
 * Location ומחלצים ממנה mid, בלי לעקוב לכתובת שרירותית.
 *
 * TripAdvisor: אין לו ייצוא ציבורי של Trips/מפות שמורות (ה-Content API
 * לא חושף אותם) - ולכן אין כאן תמיכה מזויפת בו.
 */

export const MYMAPS_MAX_PLACES = 40;

const KML_BASE = () => process.env.MYMAPS_KML_BASE ?? 'https://www.google.com';
const SHORTLINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);
const MID_RE = /[?&]mid=([A-Za-z0-9_-]{10,80})/;

/** חילוץ mid מקישור My Maps מלא; null כשאין */
export function extractMid(input: string): string | null {
  const m = input.match(MID_RE);
  return m ? m[1] : null;
}

/** האם זה קישור מקוצר של גוגל מפות שצריך פתיחה אחת כדי לקבל mid */
export function isShortLink(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return SHORTLINK_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** פתיחת קישור מקוצר: קוראים רק את ה-Location של ההפניה, לא עוקבים */
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
  /** כמה Placemarks נחתכו בגלל תקרת הגודל */
  truncated: number;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** טקסט מתוך תג: תומך גם ב-CDATA, מנקה HTML פנימי (תיאורי My Maps) */
function tagText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  let text = m[1].trim();
  const cdata = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) text = cdata[1];
  // תיאורי My Maps מגיעים כ-HTML - משאירים טקסט בלבד
  text = text.replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

/**
 * פירוק KML של My Maps: רק Placemarks עם <Point> (עצירות). קווים
 * ופוליגונים (מסלולי הליכה, אזורים) מדולגים - אין להם "מקום" אחד כן.
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
    // נקודה בלבד - הקואורדינטות חייבות לבוא מתוך <Point>, לא מקו
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

/** משיכת ה-KML של מפה לפי mid. null בכשל (פרטית / לא קיימת / רשת). */
export async function fetchKmlByMid(mid: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(mid)) return null;
  try {
    const res = await fetch(`${KML_BASE()}/maps/d/kml?mid=${mid}&forcekml=1`, {
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'tiyulplus-import/1.0' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // תקרת גודל הוגנת - KML של מפה אישית; 4MB זה כבר לא זה
    if (text.length > 4_000_000) return null;
    return text;
  } catch {
    return null;
  }
}

/** ניחוש קטגוריה שקוף משם המקום - ברירת מחדל attraction, בלי המצאות */
function guessCategory(name: string): PlaceCategory {
  const n = name.toLowerCase();
  if (/מוזיאון|museum|galer|גלרי/.test(n)) return 'museum';
  if (/פארק|גן |שמורת|אגם|הר |מפל|חוף|park|lake|beach|waterfall|forest|יער/.test(n)) return 'nature';
  if (/תצפית|viewpoint|צוק|מצפה/.test(n)) return 'viewpoint';
  if (/קפה|cafe|coffee|מסעד|restaurant|בר |מאפי/.test(n)) return 'cafe';
  if (/שוק|קניון|market|mall|חנות|shop/.test(n)) return 'shopping';
  return 'attraction';
}

/** hash קצר ויציב לשם slug - אותה מפה תקבל את אותו יעד בכל ייבוא */
function slugHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * ההמרה ליעד בסגנון explored: slug בקידומת explored- ומזהי xp-N, כדי
 * שהיעד יעבור את sanitizeExploredDestinations בסבבי הצ׳אט הבאים ויעבוד
 * בכל שכבות הטיול כמו יעד שנחקר.
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
