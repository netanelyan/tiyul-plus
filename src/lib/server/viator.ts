import { destinations } from '@/data/destinations';
import { currencyForCountry, viatorLanguage } from '@/lib/server/viatorLocale';

/**
 * Server only - **bookable activities from Viator, via a live query.**
 *
 * ## Four rules this file exists to enforce
 *
 * 1. **The key never leaves the server.** Nothing here uses `NEXT_PUBLIC_`,
 *    and the only route calling into here is `/api/activities`.
 * 2. **No number and no name are ever produced by us.** Every displayed field
 *    comes from their response as-is. A product missing a title, a price or a
 *    link is simply **dropped** - we do not fill in gaps.
 * 3. **Their data is not stored by us.** In-memory cache only, below the
 *    ceiling their docs recommend (under 24 hours), and nothing is written to
 *    the catalog, the trip or the database. A test scans `src/data` and
 *    `src/lib/trip` and fails if the word viator appears there.
 * 4. **Sandbox data is fictional and must never reach a real person.** See
 *    `sandboxBlocked` below - in sandbox mode on the live domain nothing is
 *    returned at all.
 *
 * ## What their docs say, and what follows from it
 *
 * - Base: `https://api.sandbox.viator.com/partner` vs
 *   `https://api.viator.com/partner`.
 * - Auth via the `exp-api-key` header, and `Accept: application/json;version=2.0`
 *   is mandatory (without the version you get 400).
 * - Documented rate limit: **150 requests per rolling 10-second window**, with
 *   a recommendation to wait 2 seconds on 429. There is an outbound rate
 *   meter here that honors that with plenty of margin.
 * - Cache: the docs recommend a TTL **under 24 hours** for search, single
 *   product and images. Here it is 6 hours for products and 12 for taxonomy.
 * - Attribution: `pid`, `mcid`, `medium` (and optional `campaign`) on the
 *   outbound URL. **Removing or changing them = no payment.** Therefore
 *   without pid and mcid configured the feature shows nothing at all - better
 *   nothing than sending free traffic.
 */

/* ============ 1. Configuration ============ */

export type ViatorMode = 'off' | 'sandbox' | 'production';

/**
 * **The live key is not used until Netanel says so.** Even if `VIATOR_API_KEY`
 * is set, the mode stays sandbox unless `VIATOR_MODE=production` is written
 * explicitly.
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

/** The request currency. Display always follows what they returned, not what we asked for. */
/*
  The currency is now derived **from the destination's country** rather than a
  single site-wide setting, and that lives in `viatorLocale.ts` together with
  the list of what they even support. Display is unaffected: it always shows
  the `pricing.currency` they returned.
*/

/**
 * **The live domain.** In sandbox mode, a request that reaches this domain
 * gets nothing: their sandbox data is fictional, and a real traveler must not
 * encounter it even for a moment or through a configuration mistake.
 */
const PROD_HOSTS = new Set(['tiyulplus.com', 'www.tiyulplus.com']);

export function sandboxBlocked(host: string | null, mode: ViatorMode): boolean {
  if (mode !== 'sandbox') return false;
  const h = (host ?? '').toLowerCase().split(':')[0];
  return PROD_HOSTS.has(h);
}

/* ============ 2. Attribution - the only thing we earn from ============ */

export interface Attribution {
  pid: string;
  mcid: string;
  medium: string;
  campaign?: string;
}

/** Letters, digits and hyphens only - their docs say any other character breaks attribution entirely */
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
 * The outbound URL. **Returns `null` when attribution is impossible** - a link
 * without pid and mcid is traffic we give away for free, and that is exactly
 * the point Netanel asked to check.
 *
 * The parameters are added to Viator's own URL, and only if it is really
 * theirs.
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
  // set, not append: if they already returned a pid of their own, ours wins
  url.searchParams.set('pid', attr.pid);
  url.searchParams.set('mcid', attr.mcid);
  url.searchParams.set('medium', attr.medium);
  if (attr.campaign) url.searchParams.set('campaign', attr.campaign);
  return url.toString();
}

/* ============ 3. The displayed shape - deliberately narrow ============ */

/**
 * What leaves this module. **Every field comes from their response**; no
 * computed field, no currency conversion, no title translation. `sandbox`
 * travels with every item so the UI can never show a fictional item without
 * saying so.
 */
export interface ActivityOffer {
  code: string;
  title: string;
  /** Exactly as they returned it, including their currency */
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

/** The first image that has a variant with an https URL. No URL construction whatsoever. */
function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const img of images) {
    const variants = (img as { variants?: unknown })?.variants;
    if (!Array.isArray(variants)) continue;
    // the largest that is still reasonable for a card
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
 * Deliberately tolerant mapping: **a product missing any of the three - a
 * title, a link or a price - is dropped.** We do not invent "price
 * unavailable", and we do not show a card that cannot be booked through.
 */
export function toOffer(raw: RawProduct, attr: Attribution | null, sandbox: boolean): ActivityOffer | null {
  const code = typeof raw.productCode === 'string' ? raw.productCode : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const rawUrl = typeof raw.productUrl === 'string' ? raw.productUrl : typeof raw.webURL === 'string' ? raw.webURL : '';
  if (!code || !title || !rawUrl) return null;

  const url = affiliateUrl(rawUrl, attr);
  if (!url) return null; // no attribution means no link, and no link means no card

  const fromPrice = num(raw.pricing?.summary?.fromPrice);
  const cur = typeof raw.pricing?.currency === 'string' ? raw.pricing.currency : null;
  if (fromPrice === null || !cur) return null; // a partial price is a misleading price

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

/* ============ 4. Cache and rate meter ============ */

interface Entry<T> {
  value: T;
  at: number;
}
const cache = new Map<string, Entry<unknown>>();

/** Below the ceiling their docs recommend (24 hours), and in memory only. */
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
  if (cache.size > 500) cache.clear(); // crude memory guard, not a leak
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** For cleanup between tests */
export function resetViatorCacheForTest(): void {
  cache.clear();
  outbound.length = 0;
}

/**
 * **Outbound** rate meter, on top of our per-user quotas. Their docs: 150
 * requests per rolling 10-second window. Here 30 - an order of magnitude
 * below, because no real scenario needs more, and exceeding it on their side
 * is a block that hurts all of our users.
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

/* ============ 5. The call itself ============ */

/**
 * **Never throws.** A failure, slowness, 429 or a change in the response
 * shape returns `null`, and the screen continues without the section. An
 * outage on their side is not an outage on ours.
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

/* ---------- Taxonomy: from our city to their id ---------- */

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
 * **Matching is done by coordinates, not by name.** A city name is exactly
 * the trap this catalog has been burned by again and again (Cartagena in
 * Spain, Deira in England). Our destination's center already exists and is
 * verified, so we pick their destination closest to it within a reasonable
 * range. Beyond the range - return nothing.
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

/** The city's country, for deriving the currency. `null` when the city is not in the catalog. */
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

/* ---------- Search ---------- */

export interface ActivitiesResult {
  mode: ViatorMode;
  offers: ActivityOffer[];
  /** Why there are no results. Shown to the user in Hebrew by the component, not here. */
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
  // Without attribution there is no feature. Better no section than sending traffic that is not counted for us.
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
