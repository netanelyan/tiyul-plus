/**
 * Server only - the growth desk's way to publish a trip without a browser.
 *
 * ## What it is for
 *
 * The growth desk (a local app in the tiyul-social repo) builds a route for a
 * creator or an agency and needs it live at `/trips/<slug>` so it can send the
 * link. Until now a trip could only reach `user_trips` from a signed-in browser,
 * and the publish route only accepts a Supabase user token with a same-origin
 * `Origin`. The workaround - log a dedicated account in by email code, write the
 * table with its token, forge the `Origin` - was ruled out by Netanel, and the
 * spec (tiyul-social `src/growth/SITE-SPEC.md`) asked for this instead.
 *
 * ## One account, so nothing downstream changes
 *
 * Every trip this writes belongs to `GROWTH_EDITOR_USER_ID`, a normal account
 * created once by hand. Publishing, withdrawing and the `/trips/<slug>` page then
 * run through exactly the code paths a traveller's trip does - `publishTrip`,
 * `unpublishTrip`, the same snapshot strip and the same indexability rule. This
 * module only adds what the browser path does not have: a token, an idempotency
 * key and strict validation.
 *
 * ## Why validation is strict here and lenient there
 *
 * The browser path silently drops an unknown place id, because a traveller's trip
 * may hold stops the catalog later lost. The desk matched its ids against the
 * catalog moments before sending, so an unknown id here is a bug in the desk, and
 * dropping it would publish a page with missing stops that nobody notices. So it is
 * a 422 that names every bad id.
 *
 * Everything here except the route's database calls is pure, so it is unit tested
 * in `growthPublish.test.ts` without a database or a server.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { isISODate } from '@/lib/trip/dates';
import type { CatalogLookup } from '@/lib/trip/publicTrip';
import type { Trip, TripPreferences } from '@/lib/trip/types';

/** Below this the token is treated as unset: a short shared secret is not a gate. */
export const MIN_TOKEN_LENGTH = 32;

/** New publications by the editor account per rolling 24 hours. Re-sends do not count. */
export const GROWTH_DAILY_MAX = 20;

/** Burst guard for a runaway script, re-sends included. Generous: the desk sends a handful a day. */
export const GROWTH_BURST_MAX = 60;
export const GROWTH_BURST_WINDOW_MS = 10 * 60_000;

export const LIMITS = {
  externalId: 120,
  name: 80,
  days: 14,
  placesPerDay: 12,
  notes: 1000,
  idLength: 100,
} as const;

const EXTERNAL_ID = /^[A-Za-z0-9:._-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUGISH = /^[a-z0-9-]{1,80}$/;

// ---------- Configuration and auth ----------

export interface GrowthConfig {
  token: string | null;
  editorUserId: string | null;
}

/**
 * Read once per request from the environment. A token shorter than
 * `MIN_TOKEN_LENGTH` counts as absent, and says so in the server log: the route
 * then answers 404 as if it did not exist, which is the right failure for a gate
 * somebody configured too weakly.
 */
export function growthConfig(env: Record<string, string | undefined> = process.env): GrowthConfig {
  const raw = env.GROWTH_PUBLISH_TOKEN?.trim() ?? '';
  if (raw && raw.length < MIN_TOKEN_LENGTH) {
    console.error(`[growth] GROWTH_PUBLISH_TOKEN is shorter than ${MIN_TOKEN_LENGTH} characters - route disabled`);
  }
  const editor = env.GROWTH_EDITOR_USER_ID?.trim() ?? '';
  return {
    token: raw.length >= MIN_TOKEN_LENGTH ? raw : null,
    editorUserId: UUID.test(editor) ? editor.toLowerCase() : null,
  };
}

/**
 * 'off' when no token is configured (the route then answers 404, the same posture
 * as `/api/internal/warm`: no secret means the feature is off, not open to everyone),
 * 'denied' for a missing or wrong bearer, 'ok' otherwise.
 *
 * Both sides are hashed before the comparison so `timingSafeEqual` always compares
 * equal lengths - comparing the raw strings would have to bail out on a length
 * mismatch first, and that early exit is itself a timing signal.
 */
export function checkGrowthAuth(authorization: string | null, config: GrowthConfig): 'off' | 'denied' | 'ok' {
  if (!config.token) return 'off';
  const m = /^Bearer\s+(.+)$/.exec(authorization ?? '');
  if (!m) return 'denied';
  const given = createHash('sha256').update(m[1].trim()).digest();
  const expected = createHash('sha256').update(config.token).digest();
  return timingSafeEqual(given, expected) ? 'ok' : 'denied';
}

// ---------- Identity ----------

/**
 * The trip id for an external id: the same external id always maps to the same
 * trip, so a re-send updates the trip and keeps its public slug.
 *
 * Prefixed `g-` so the editor account's trips are recognisable in the database
 * at a glance. 20 hex characters is 80 bits - a collision between two leads is
 * not a practical concern at the volume the desk sends.
 */
export function growthTripId(externalId: string): string {
  return `g-${createHash('sha256').update(externalId).digest('hex').slice(0, 20)}`;
}

export function isExternalId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= LIMITS.externalId &&
    EXTERNAL_ID.test(value)
  );
}

// ---------- The request body ----------

export interface GrowthTripInput {
  externalId: string;
  name: string;
  days: { citySlug: string; placeIds: string[]; notes: string }[];
  startDate: string | null;
  preferences: Pick<TripPreferences, 'kosher' | 'shabbatAware'> | null;
}

export type ParseResult =
  | { ok: true; value: GrowthTripInput }
  | { ok: false; status: 400; error: 'bad-request'; field: string }
  | { ok: false; status: 422; error: 'unknown-ids'; unknownCities: string[]; unknownPlaces: string[] };

/** Control characters and bidi overrides have no business in a trip name or a note. */
const unsafe = (c: number) => c < 0x20 || c === 0x7f || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069);
const clean = (s: string) => Array.from(s, (ch) => (unsafe(ch.codePointAt(0) ?? 0) ? ' ' : ch)).join('').trim();

const badRequest = (field: string): ParseResult => ({ ok: false, status: 400, error: 'bad-request', field });

/**
 * Validates the body's shape first (400, naming the first bad field), then every
 * city and place id against the catalog (422, naming all of them at once so one
 * round trip shows the desk everything it got wrong).
 */
export function parseGrowthTrip(body: unknown, catalog: CatalogLookup): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('body');
  const b = body as Record<string, unknown>;

  if (!isExternalId(b.externalId)) return badRequest('externalId');

  if (typeof b.name !== 'string') return badRequest('name');
  const name = clean(b.name);
  if (!name || name.length > LIMITS.name) return badRequest('name');

  if (!Array.isArray(b.days) || b.days.length < 1 || b.days.length > LIMITS.days) return badRequest('days');
  const days: GrowthTripInput['days'] = [];
  for (const [i, raw] of b.days.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return badRequest(`days[${i}]`);
    const d = raw as Record<string, unknown>;
    if (typeof d.citySlug !== 'string' || !SLUGISH.test(d.citySlug)) return badRequest(`days[${i}].citySlug`);
    if (
      !Array.isArray(d.placeIds) ||
      d.placeIds.length < 1 ||
      d.placeIds.length > LIMITS.placesPerDay ||
      !d.placeIds.every((p) => typeof p === 'string' && p.length > 0 && p.length <= LIMITS.idLength)
    ) {
      return badRequest(`days[${i}].placeIds`);
    }
    // A stop listed twice on one day would render twice on the public page.
    if (new Set(d.placeIds).size !== d.placeIds.length) return badRequest(`days[${i}].placeIds`);
    if (d.notes !== undefined && d.notes !== null && typeof d.notes !== 'string') return badRequest(`days[${i}].notes`);
    const notes = typeof d.notes === 'string' ? clean(d.notes) : '';
    if (notes.length > LIMITS.notes) return badRequest(`days[${i}].notes`);
    days.push({ citySlug: d.citySlug, placeIds: d.placeIds as string[], notes });
  }

  let startDate: string | null = null;
  if (b.startDate !== undefined && b.startDate !== null) {
    if (!isISODate(b.startDate)) return badRequest('startDate');
    startDate = b.startDate;
  }

  /*
    Only the two preferences the spec names. They are stored on the private trip;
    the public snapshot drops preferences entirely, as it does for every trip.
  */
  let preferences: GrowthTripInput['preferences'] = null;
  if (b.preferences !== undefined && b.preferences !== null) {
    if (typeof b.preferences !== 'object' || Array.isArray(b.preferences)) return badRequest('preferences');
    const p = b.preferences as Record<string, unknown>;
    for (const k of ['kosher', 'shabbatAware'] as const) {
      if (p[k] !== undefined && typeof p[k] !== 'boolean') return badRequest(`preferences.${k}`);
    }
    preferences = {
      ...(typeof p.kosher === 'boolean' ? { kosher: p.kosher } : {}),
      ...(typeof p.shabbatAware === 'boolean' ? { shabbatAware: p.shabbatAware } : {}),
    };
  }

  const unknownCities = new Set<string>();
  const unknownPlaces = new Set<string>();
  for (const d of days) {
    const known = catalog.placeIdsOf(d.citySlug);
    if (!known) {
      unknownCities.add(d.citySlug);
      continue;
    }
    for (const id of d.placeIds) if (!known.has(id)) unknownPlaces.add(`${d.citySlug}/${id}`);
  }
  if (unknownCities.size || unknownPlaces.size) {
    return {
      ok: false,
      status: 422,
      error: 'unknown-ids',
      unknownCities: [...unknownCities],
      unknownPlaces: [...unknownPlaces],
    };
  }

  return { ok: true, value: { externalId: b.externalId, name, days, startDate, preferences } };
}

// ---------- The trip ----------

/**
 * The private trip, in exactly the shape the browser writes, so every reader of
 * `user_trips` (the publish path, the admin trip view) sees nothing unusual.
 *
 * `createdAt` survives a re-send - the trip was created once, and a re-send is an
 * edit. Day ids are derived from the trip id and the position, so they are stable
 * across re-sends too.
 */
export function buildGrowthTrip(
  input: GrowthTripInput,
  id: string,
  now: number,
  existing: Pick<Trip, 'createdAt'> | null,
): Trip {
  const citySlugs: string[] = [];
  for (const d of input.days) if (!citySlugs.includes(d.citySlug)) citySlugs.push(d.citySlug);
  return {
    id,
    name: input.name,
    citySlugs,
    days: input.days.map((d, i) => ({
      id: `${id}-d${i + 1}`,
      citySlug: d.citySlug,
      placeIds: [...d.placeIds],
      ...(d.notes ? { notes: d.notes } : {}),
    })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(input.startDate ? { startDate: input.startDate } : {}),
    ...(input.preferences && Object.keys(input.preferences).length ? { preferences: input.preferences } : {}),
  };
}

/** Who the audit log says did it. The editor account's id, because `actor_user_id` is required. */
export const growthActor = (editorUserId: string) => ({ userId: editorUserId, email: 'growth-desk' });
