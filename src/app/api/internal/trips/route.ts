import { NextResponse } from 'next/server';
import { audit } from '@/lib/server/admin';
import { adminInsert, adminRpc } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { findOwnTrip } from '@/lib/server/userTrips';
import { canonical } from '@/lib/seo/site';
import {
  catalogLookup,
  findPublicationFor,
  publicTripsEnabled,
  publishTrip,
  unpublishTrip,
} from '@/lib/server/publicTrips';
import {
  GROWTH_BURST_MAX,
  GROWTH_BURST_WINDOW_MS,
  GROWTH_DAILY_MAX,
  buildGrowthTrip,
  checkGrowthAuth,
  growthActor,
  growthConfig,
  growthTripId,
  isExternalId,
  parseGrowthTrip,
} from '@/lib/server/growthPublish';

/**
 * Server-to-server publishing for the growth desk. See `@/lib/server/growthPublish`
 * for why it exists and what it validates; this file is only the wiring.
 *
 * ## The gate
 *
 * `Authorization: Bearer <GROWTH_PUBLISH_TOKEN>`. No token configured (or one
 * shorter than 32 characters) and the route answers 404, exactly like a route
 * that does not exist - the posture of `/api/internal/warm`. There is no `Origin`
 * check: nothing here is reachable from a browser session, and the token is the
 * whole gate.
 *
 * ## Configuration
 *
 * - `GROWTH_PUBLISH_TOKEN` - at least 32 random characters (e.g. `openssl rand -hex 32`).
 * - `GROWTH_EDITOR_USER_ID` - the uuid of the editor account every trip belongs to.
 *
 * Token set but editor id missing, or no service key: 503 `not-configured`.
 */

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });
const notFound = () => json({ error: 'not_found' }, 404);
const bad = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error, ...extra }, status);

const DAY_MS = 24 * 60 * 60_000;

type Gate = { ok: true; editor: string } | { ok: false; response: NextResponse };

/** Token, configuration and burst guard - shared by both methods, in that order. */
function gate(request: Request): Gate {
  const config = growthConfig();
  const auth = checkGrowthAuth(request.headers.get('authorization'), config);
  if (auth === 'off') return { ok: false, response: notFound() };
  if (auth === 'denied') return { ok: false, response: bad('unauthorized', 401) };
  if (!config.editorUserId || !publicTripsEnabled()) {
    return { ok: false, response: bad('not-configured', 503) };
  }
  if (!checkLimit('growth-internal', 'growth-desk', GROWTH_BURST_MAX, GROWTH_BURST_WINDOW_MS).ok) {
    return { ok: false, response: bad('rate-limited', 429) };
  }
  return { ok: true, editor: config.editorUserId };
}

/**
 * POST - create or update a published trip, keyed by `externalId`.
 *
 * Order matters: everything that can refuse (shape, ids, the daily cap) runs
 * before anything is written, so a refused request leaves no private trip behind.
 */
export async function POST(request: Request) {
  const g = gate(request);
  if (!g.ok) return g.response;
  const editor = g.editor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('bad-request', 400, { field: 'body' });
  }

  const parsed = parseGrowthTrip(body, catalogLookup());
  if (!parsed.ok) {
    if (parsed.status === 400) return bad(parsed.error, 400, { field: parsed.field });
    return bad(parsed.error, 422, { unknownCities: parsed.unknownCities, unknownPlaces: parsed.unknownPlaces });
  }
  const input = parsed.value;
  const tripId = growthTripId(input.externalId);

  // A re-send of a live publication is an edit: it keeps the slug and does not count.
  const live = await findPublicationFor(editor, tripId);
  if (!live) {
    const recent = await adminRpc<number>('count_recent_publications', {
      p_user: editor,
      p_since: new Date(Date.now() - DAY_MS).toISOString(),
    });
    // An unanswerable count is a refusal, as on the browser path: the cap cannot be enforced blind.
    if (recent === null) return bad('db-failed', 503);
    if (recent >= GROWTH_DAILY_MAX) return bad('rate-limited', 429);
  }

  const existing = await findOwnTrip(editor, tripId);
  const now = Date.now();
  const trip = buildGrowthTrip(input, tripId, now, existing);

  // Upsert on the (user_id, id) primary key - the same row every time for this externalId.
  const saved = await adminInsert(
    'user_trips',
    { user_id: editor, id: tripId, data: trip, updated_at: new Date(now).toISOString() },
    { upsert: true },
  );
  if (!saved) return bad('db-failed', 503);

  const result = await publishTrip(editor, trip);
  if (!result.ok) {
    return bad(result.error, result.error === 'no-city' ? 422 : 503);
  }

  if (!live) {
    await audit(growthActor(editor), 'growth_publish', {}, {
      externalId: input.externalId,
      tripId,
      slug: result.slug,
    });
  }

  return json({
    ok: true,
    tripId,
    slug: result.slug,
    url: canonical(`/trips/${result.slug}`),
    indexable: result.indexable,
    stopCount: result.stopCount,
    created: !live,
  });
}

/**
 * DELETE ?externalId=... - withdraw. The page answers 410 afterwards.
 *
 * The private trip stays, so a later POST with the same externalId publishes it
 * again (under a new slug - the old one is a tombstone that search engines were
 * told is gone). Withdrawing something not published is ok, as on the browser path.
 */
export async function DELETE(request: Request) {
  const g = gate(request);
  if (!g.ok) return g.response;
  const editor = g.editor;

  const externalId = new URL(request.url).searchParams.get('externalId') ?? '';
  if (!isExternalId(externalId)) return bad('bad-request', 400, { field: 'externalId' });
  const tripId = growthTripId(externalId);

  const live = await findPublicationFor(editor, tripId);
  const done = await unpublishTrip(editor, tripId);
  if (!done) return bad('db-failed', 503);

  if (live) {
    await audit(growthActor(editor), 'growth_withdraw', {}, { externalId, tripId, slug: live.slug });
  }
  return json({ ok: true, tripId, withdrawn: Boolean(live) });
}
