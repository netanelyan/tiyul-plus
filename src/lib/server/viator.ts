import { destinations } from '@/data/destinations';
import { currencyForCountry, viatorLanguage } from '@/lib/server/viatorLocale';

/**
 * שרת בלבד - **פעילויות להזמנה מ-Viator, בשאילתה חיה.**
 *
 * ## ארבעה כללים שהקובץ הזה קיים כדי לאכוף
 *
 * 1. **המפתח לא עוזב את השרת.** אין כאן שום דבר עם `NEXT_PUBLIC_`, והנתיב
 *    היחיד שקורא לכאן הוא `/api/activities`.
 * 2. **שום מספר ושום שם לא נוצרים אצלנו.** כל שדה שמוצג מגיע מהתשובה שלהם
 *    כפי שהיא. מוצר בלי כותרת, בלי מחיר או בלי קישור פשוט **נזרק** - אנחנו
 *    לא משלימים חסר.
 * 3. **הדאטה שלהם לא נשמרת אצלנו.** מטמון בזיכרון בלבד, פחות מהתקרה
 *    שהתיעוד שלהם ממליץ עליה (מתחת ל-24 שעות), ושום דבר לא נכתב לקטלוג,
 *    לטיול או לדאטהבייס. יש טסט שסורק את `src/data` ואת `src/lib/trip`
 *    ונופל אם המילה viator מופיעה שם.
 * 4. **דאטת sandbox היא בדיונית ואסור שתגיע לאדם אמיתי.** ראו
 *    `sandboxBlocked` למטה - במצב sandbox על הדומיין החי לא מוחזר כלום.
 *
 * ## מה התיעוד שלהם אומר, ומה נגזר מזה
 *
 * - בסיס: `https://api.sandbox.viator.com/partner` מול
 *   `https://api.viator.com/partner`.
 * - אימות בכותרת `exp-api-key`, ו-`Accept: application/json;version=2.0`
 *   חובה (בלי הגרסה מקבלים 400).
 * - מגבלת קצב מתועדת: **150 בקשות בחלון מתגלגל של 10 שניות**, עם המלצה
 *   להמתין 2 שניות על 429. יש כאן מד קצב יוצא שמכבד את זה בהרבה מרווח.
 * - מטמון: התיעוד ממליץ TTL **מתחת ל-24 שעות** על חיפוש, מוצר בודד
 *   ותמונות. כאן זה 6 שעות למוצרים ו-12 לטקסונומיה.
 * - שיוך: `pid`, `mcid`, `medium` (ו-`campaign` אופציונלי) בכתובת היוצאת.
 *   **הסרה או שינוי שלהם = אין תשלום.** לכן בלי pid ו-mcid מוגדרים
 *   הפיצ׳ר לא מציג כלום בכלל - עדיף בלי, מאשר לשלוח תנועה חינם.
 */

/* ============ 1. תצורה ============ */

export type ViatorMode = 'off' | 'sandbox' | 'production';

/**
 * **המפתח החי לא נכנס לשימוש עד שנתנאל יאמר.** גם אם `VIATOR_API_KEY`
 * מוגדר, המצב נשאר sandbox אלא אם `VIATOR_MODE=production` נכתב במפורש.
 */
export function viatorMode(): ViatorMode {
  const raw = (process.env.VIATOR_MODE ?? '').toLowerCase();
  if (raw === 'off') return 'off';
  if (raw === 'production') return process.env.VIATOR_API_KEY ? 'production' : 'off';
  return process.env.VIATOR_API_KEY_SANDBOX ? 'sandbox' : 'off';
}

const apiKey = (mode: ViatorMode) =>
  mode === 'production' ? process.env.VIATOR_API_KEY : process.env.VIATOR_API_KEY_SANDBOX;

export const viatorBase = (mode: ViatorMode) =>
  process.env.VIATOR_BASE_URL ??
  (mode === 'production' ? 'https://api.viator.com/partner' : 'https://api.sandbox.viator.com/partner');

/** מטבע הבקשה. התצוגה תמיד לפי מה שהם החזירו, לא לפי מה שביקשנו. */
/*
  המטבע נגזר עכשיו **מהמדינה של היעד** ולא מהגדרה אחת לכל האתר, וזה
  יושב ב-`viatorLocale.ts` יחד עם הרשימה של מה שהם בכלל תומכים בו.
  התצוגה לא מושפעת: היא תמיד מציגה את `pricing.currency` שהם החזירו.
*/

/**
 * **הדומיין החי.** במצב sandbox בקשה שמגיעה לדומיין הזה לא מקבלת כלום:
 * הדאטה שלהם ב-sandbox היא בדיונית, ומטייל אמיתי לא יכול להיתקל בה גם
 * לא לרגע ולא בטעות של תצורה.
 */
const PROD_HOSTS = new Set(['tiyulplus.com', 'www.tiyulplus.com']);

export function sandboxBlocked(host: string | null, mode: ViatorMode): boolean {
  if (mode !== 'sandbox') return false;
  const h = (host ?? '').toLowerCase().split(':')[0];
  return PROD_HOSTS.has(h);
}

/* ============ 2. שיוך - הדבר היחיד שאנחנו מרוויחים ממנו ============ */

export interface Attribution {
  pid: string;
  mcid: string;
  medium: string;
  campaign?: string;
}

/** רק אותיות, ספרות ומקפים - התיעוד שלהם אומר שתו אחר שובר שיוך לגמרי */
const SAFE = /^[A-Za-z0-9-]{1,64}$/;

export function attribution(): Attribution | null {
  const pid = process.env.VIATOR_PARTNER_ID ?? '';
  const mcid = process.env.VIATOR_MCID ?? '';
  const medium = process.env.VIATOR_MEDIUM ?? 'api';
  const campaign = process.env.VIATOR_CAMPAIGN ?? '';
  if (!SAFE.test(pid) || !SAFE.test(mcid) || !SAFE.test(medium)) return null;
  if (campaign && !SAFE.test(campaign)) return null;
  return { pid, mcid, medium, campaign: campaign || undefined };
}

/**
 * הכתובת היוצאת. **מוחזר `null` כשאי אפשר לשייך** - קישור בלי pid ו-mcid
 * הוא תנועה שאנחנו נותנים בחינם, וזו בדיוק הנקודה שנתנאל ביקש לבדוק.
 *
 * הפרמטרים נוספים לכתובת של Viator עצמה, ורק אם היא באמת שלהם.
 */
export function affiliateUrl(productUrl: string, attr: Attribution | null): string | null {
  if (!attr) return null;
  let url: URL;
  try {
    url = new URL(productUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (host !== 'viator.com' && !host.endsWith('.viator.com')) return null;
  // set ולא append: אם הם כבר החזירו pid משלהם, שלנו הוא הקובע
  url.searchParams.set('pid', attr.pid);
  url.searchParams.set('mcid', attr.mcid);
  url.searchParams.set('medium', attr.medium);
  if (attr.campaign) url.searchParams.set('campaign', attr.campaign);
  return url.toString();
}

/* ============ 3. הצורה שמוצגת - צרה בכוונה ============ */

/**
 * מה שיוצא מכאן החוצה. **כל שדה מגיע מהתשובה שלהם**; אין שדה מחושב, אין
 * המרת מטבע, אין תרגום של הכותרת. `sandbox` נוסע עם כל פריט כדי שהממשק
 * לא יוכל להציג פריט בדיוני בלי לומר זאת.
 */
export interface ActivityOffer {
  code: string;
  title: string;
  /** בדיוק כפי שהם החזירו, כולל המטבע שלהם */
  fromPrice: number | null;
  currency: string | null;
  rating: number | null;
  reviews: number | null;
  durationMinutes: number | null;
  image: string | null;
  url: string;
  sandbox: boolean;
}

interface RawProduct {
  productCode?: unknown;
  title?: unknown;
  productUrl?: unknown;
  webURL?: unknown;
  images?: unknown;
  reviews?: { combinedAverageRating?: unknown; totalReviews?: unknown };
  duration?: { fixedDurationInMinutes?: unknown; variableDurationFromMinutes?: unknown };
  pricing?: { summary?: { fromPrice?: unknown }; currency?: unknown };
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** התמונה הראשונה שיש לה variant עם כתובת https. שום בנייה של כתובת. */
function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const img of images) {
    const variants = (img as { variants?: unknown })?.variants;
    if (!Array.isArray(variants)) continue;
    // הגדולה ביותר שעדיין סבירה לכרטיס
    const sorted = [...variants].sort(
      (a, b) => (num((b as { width?: unknown }).width) ?? 0) - (num((a as { width?: unknown }).width) ?? 0),
    );
    for (const v of sorted) {
      const url = (v as { url?: unknown }).url;
      const w = num((v as { width?: unknown }).width) ?? 0;
      if (typeof url === 'string' && url.startsWith('https://') && w <= 900) return url;
    }
  }
  return null;
}

/**
 * מיפוי סובלני בכוונה: **מוצר שחסר לו אחד מהשלושה - כותרת, קישור או
 * מחיר - נזרק.** לא ממציאים "מחיר לא זמין", ולא מציגים כרטיס שאי אפשר
 * להזמין דרכו.
 */
export function toOffer(raw: RawProduct, attr: Attribution | null, sandbox: boolean): ActivityOffer | null {
  const code = typeof raw.productCode === 'string' ? raw.productCode : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const rawUrl = typeof raw.productUrl === 'string' ? raw.productUrl : typeof raw.webURL === 'string' ? raw.webURL : '';
  if (!code || !title || !rawUrl) return null;

  const url = affiliateUrl(rawUrl, attr);
  if (!url) return null; // בלי שיוך אין קישור, ובלי קישור אין כרטיס

  const fromPrice = num(raw.pricing?.summary?.fromPrice);
  const cur = typeof raw.pricing?.currency === 'string' ? raw.pricing.currency : null;
  if (fromPrice === null || !cur) return null; // מחיר חלקי הוא מחיר מטעה

  return {
    code,
    title,
    fromPrice,
    currency: cur,
    rating: num(raw.reviews?.combinedAverageRating),
    reviews: num(raw.reviews?.totalReviews),
    durationMinutes:
      num(raw.duration?.fixedDurationInMinutes) ?? num(raw.duration?.variableDurationFromMinutes),
    image: firstImage(raw.images),
    url,
    sandbox,
  };
}

/* ============ 4. מטמון ומד קצב ============ */

interface Entry<T> {
  value: T;
  at: number;
}
const cache = new Map<string, Entry<unknown>>();

/** מתחת לתקרה שהתיעוד שלהם ממליץ עליה (24 שעות), ובזיכרון בלבד. */
const PRODUCTS_TTL_MS = 6 * 60 * 60_000;
const TAXONOMY_TTL_MS = 12 * 60 * 60_000;

function cached<T>(key: string, ttl: number): T | undefined {
  const e = cache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.at > ttl) {
    cache.delete(key);
    return undefined;
  }
  return e.value as T;
}

function put<T>(key: string, value: T): T {
  if (cache.size > 500) cache.clear(); // הגנת זיכרון גסה, לא דליפה
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** לניקוי בין בדיקות */
export function resetViatorCacheForTest(): void {
  cache.clear();
  outbound.length = 0;
}

/**
 * מד קצב **יוצא**, מעל המכסות שלנו למשתמש. התיעוד שלהם: 150 בקשות
 * בחלון מתגלגל של 10 שניות. כאן 30 - סדר גודל מתחת, כי אין שום תרחיש
 * אמיתי שדורש יותר, וחריגה אצלם היא חסימה שפוגעת בכל המשתמשים שלנו.
 */
const OUTBOUND_MAX = 30;
const OUTBOUND_WINDOW_MS = 10_000;
const outbound: number[] = [];

function outboundAllowed(): boolean {
  const now = Date.now();
  while (outbound.length && now - outbound[0] > OUTBOUND_WINDOW_MS) outbound.shift();
  if (outbound.length >= OUTBOUND_MAX) return false;
  outbound.push(now);
  return true;
}

/* ============ 5. הקריאה עצמה ============ */

/**
 * **לעולם לא זורק.** כישלון, איטיות, 429 או שינוי בצורת התשובה מחזירים
 * `null`, והמסך ממשיך בלי המדור. תקלה אצלם היא לא תקלה אצלנו.
 */
async function callViator<T>(path: string, body: unknown, mode: ViatorMode): Promise<T | null> {
  const key = apiKey(mode);
  if (!key) return null;
  if (!outboundAllowed()) return null;
  try {
    const res = await fetch(`${viatorBase(mode)}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'exp-api-key': key,
        Accept: 'application/json;version=2.0',
        'Accept-Language': viatorLanguage(),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) {
      console.warn('[viator]', path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ---------- טקסונומיה: מהעיר שלנו למזהה שלהם ---------- */

interface ViatorDestination {
  destinationId?: unknown;
  name?: unknown;
  type?: unknown;
  center?: { latitude?: unknown; longitude?: unknown };
}

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * **ההתאמה נעשית לפי קואורדינטות, לא לפי שם.** שם עיר הוא בדיוק המלכודת
 * שהקטלוג הזה נכווה ממנה שוב ושוב (קרטחנה בספרד, דיירה באנגליה). המרכז
 * של היעד שלנו כבר קיים ומאומת, אז נבחר היעד שלהם הקרוב אליו ביותר בטווח
 * סביר. מעבר לטווח - לא מחזירים כלום.
 */
const MAX_MATCH_KM = 60;

export function matchDestination(
  list: ViatorDestination[],
  lat: number,
  lng: number,
): number | null {
  let best: { id: number; d: number } | null = null;
  for (const d of list) {
    const id = num(d.destinationId);
    const dl = num(d.center?.latitude);
    const dg = num(d.center?.longitude);
    if (id === null || dl === null || dg === null) continue;
    const dist = km(lat, lng, dl, dg);
    if (dist > MAX_MATCH_KM) continue;
    if (!best || dist < best.d) best = { id, d: dist };
  }
  return best?.id ?? null;
}

/** המדינה של העיר, לגזירת המטבע. `null` כשהעיר אינה בקטלוג. */
export function countryOfCity(citySlug: string): string | null {
  return destinations.find((d) => d.slug === citySlug)?.countrySlug ?? null;
}

async function destinationIdFor(citySlug: string, mode: ViatorMode): Promise<number | null> {
  const dest = destinations.find((d) => d.slug === citySlug);
  if (!dest) return null;
  const key = `dest|${mode}`;
  let list = cached<ViatorDestination[]>(key, TAXONOMY_TTL_MS);
  if (!list) {
    const res = await callViator<{ destinations?: ViatorDestination[] }>('/destinations', undefined, mode);
    if (!res?.destinations) return null;
    list = put(key, res.destinations);
  }
  return matchDestination(list, dest.center.lat, dest.center.lng);
}

/* ---------- חיפוש ---------- */

export interface ActivitiesResult {
  mode: ViatorMode;
  offers: ActivityOffer[];
  /** למה אין תוצאות. מוצג למשתמש בעברית ע"י הרכיב, לא כאן. */
  reason: 'ok' | 'off' | 'no-attribution' | 'no-destination' | 'unavailable' | 'empty' | 'sandbox-blocked';
}

const MAX_OFFERS = 4;

export async function activitiesForCity(
  citySlug: string,
  host: string | null,
): Promise<ActivitiesResult> {
  const mode = viatorMode();
  if (mode === 'off') return { mode, offers: [], reason: 'off' };
  if (sandboxBlocked(host, mode)) return { mode, offers: [], reason: 'sandbox-blocked' };

  const attr = attribution();
  // בלי שיוך אין פיצ׳ר. עדיף בלי מדור מאשר לשלוח תנועה שלא נספרת לנו.
  if (!attr) return { mode, offers: [], reason: 'no-attribution' };

  const destinationId = await destinationIdFor(citySlug, mode);
  if (destinationId === null) return { mode, offers: [], reason: 'no-destination' };

  const cur = currencyForCountry(countryOfCity(citySlug));
  const key = `search|${mode}|${destinationId}|${cur}`;
  let raw = cached<RawProduct[]>(key, PRODUCTS_TTL_MS);
  if (!raw) {
    const res = await callViator<{ products?: RawProduct[] }>(
      '/products/search',
      {
        filtering: { destination: String(destinationId) },
        sorting: { sort: 'TRAVELER_RATING', order: 'DESCENDING' },
        pagination: { start: 1, count: 8 },
        currency: cur,
      },
      mode,
    );
    if (!res) return { mode, offers: [], reason: 'unavailable' };
    raw = put(key, Array.isArray(res.products) ? res.products : []);
  }

  const offers = raw
    .map((p) => toOffer(p, attr, mode === 'sandbox'))
    .filter((o): o is ActivityOffer => o !== null)
    .slice(0, MAX_OFFERS);

  return { mode, offers, reason: offers.length ? 'ok' : 'empty' };
}
