import { NextResponse } from 'next/server';
import { resolveCaller, requestIp } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { sameOriginOk } from '@/lib/server/chatGuards';
import { findOwnTrip } from '@/lib/server/userTrips';
import { adminRpc } from '@/lib/server/supabaseAdmin';
import {
  findPublicationFor,
  publicTripsEnabled,
  publishTrip,
  unpublishTrip,
} from '@/lib/server/publicTrips';

/**
 * Publishing a trip to `/trips/<slug>` - and withdrawing it.
 *
 * ## Login is required, and that is a correctness requirement
 *
 * A trip can live purely in localStorage with no owner anywhere. Publishing one
 * of those would create a public page that **nobody can prove they control**:
 * "remove it at any moment" would last exactly as long as that browser profile,
 * and a cleared cache would strand a page about somebody's holiday on the open
 * web with no way to take it down. So the trip must exist in `user_trips` under
 * the caller's account, which `findOwnTrip` is the check for.
 *
 * ## Two limits, because they fail differently
 *
 * - **Per caller, in memory** (`checkLimit`) - the burst guard. Cheap, instant,
 *   and resets on deploy and per instance, which is fine for a burst.
 * - **Per account, in the database** (`count_recent_publications`) - the durable
 *   one. An in-memory counter is no answer to somebody publishing steadily for a
 *   week, and it is per-instance, so a serverless fleet multiplies the real
 *   ceiling by however many instances are warm.
 *
 * A third keyed on IP catches the case the account limit cannot: one person
 * registering accounts to publish spam. It is deliberately looser than the
 * account limit, because households, offices and whole mobile carriers share an
 * address and this is the control most likely to hit an innocent person.
 */

/** Burst: publishing is a deliberate act, nobody does it six times in ten minutes. */
const BURST_MAX = 5;
const BURST_WINDOW_MS = 10 * 60_000;

/** Durable, per account. A person planning constantly still publishes well under this. */
const DAILY_MAX = 10;
const DAILY_WINDOW_MS = 24 * 60 * 60_000;

/** Per address, looser - see the note above about shared addresses. */
const IP_MAX = 20;
const IP_WINDOW_MS = 60 * 60_000;

const bad = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

async function readTripId(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { tripId?: unknown };
    const id = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 100) : '';
    return id || null;
  } catch {
    return null;
  }
}

/**
 * POST - publish (or re-publish, which keeps the existing slug).
 *
 * The body carries only a trip id. **The trip itself is read from the database,
 * never from the request**: accepting a client-supplied trip would mean the
 * thing being published is whatever the caller sent, which is both an ownership
 * hole and a way to put arbitrary text onto an indexable page on our domain.
 */
export async function POST(request: Request) {
  if (!sameOriginOk(request)) return bad('forbidden', 403);

  const caller = await resolveCaller(request);
  if (!checkLimit('trip-publish', caller.id, BURST_MAX, BURST_WINDOW_MS).ok) {
    return bad('rate-limited', 429);
  }
  if (!caller.userId) return bad('auth-required', 401);
  if (!checkLimit('trip-publish-ip', `ip:${requestIp(request)}`, IP_MAX, IP_WINDOW_MS).ok) {
    return bad('rate-limited', 429);
  }
  if (!publicTripsEnabled()) return bad('not-configured', 503);

  const tripId = await readTripId(request);
  if (!tripId) return bad('bad-request', 400);

  const trip = await findOwnTrip(caller.userId, tripId);
  if (!trip) return bad('trip-not-found', 404);

  /*
    The durable limit is checked only for a NEW publication. Re-publishing an
    already-public trip is an edit, not a new page, and counting it would punish
    the owner for keeping their page accurate - which is the behaviour we want.
  */
  const existing = await findPublicationFor(caller.userId, tripId);
  if (!existing) {
    const since = new Date(Date.now() - DAILY_WINDOW_MS).toISOString();
    const recent = await adminRpc<number>('count_recent_publications', {
      p_user: caller.userId,
      p_since: since,
    });
    /*
      A failed count is not treated as zero. If the database cannot answer, the
      limit cannot be enforced, and the safe direction for a public-publishing
      endpoint is to refuse rather than to let an unbounded number through.
    */
    if (recent === null) return bad('db-unavailable', 503);
    if (recent >= DAILY_MAX) return bad('rate-limited', 429);
  }

  const result = await publishTrip(caller.userId, trip);
  if (!result.ok) {
    return bad(result.error, result.error === 'no-city' ? 422 : 503);
  }
  return NextResponse.json({
    ok: true,
    slug: result.slug,
    url: `/trips/${result.slug}`,
    indexable: result.indexable,
    stopCount: result.stopCount,
  });
}

/**
 * DELETE - withdraw. The page answers 410 afterwards and leaves the sitemap.
 *
 * Deliberately forgiving: withdrawing something that is not published returns
 * ok. The caller's goal is "this must not be public", and that is already true.
 */
export async function DELETE(request: Request) {
  if (!sameOriginOk(request)) return bad('forbidden', 403);

  const caller = await resolveCaller(request);
  if (!checkLimit('trip-unpublish', caller.id, 20, BURST_WINDOW_MS).ok) {
    return bad('rate-limited', 429);
  }
  if (!caller.userId) return bad('auth-required', 401);
  if (!publicTripsEnabled()) return bad('not-configured', 503);

  const tripId = await readTripId(request);
  if (!tripId) return bad('bad-request', 400);

  const done = await unpublishTrip(caller.userId, tripId);
  return done ? NextResponse.json({ ok: true }) : bad('db-failed', 503);
}

/** GET - is this trip published, and where. Drives the toggle's initial state. */
export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  if (!caller.userId) return NextResponse.json({ ok: true, published: null });
  if (!publicTripsEnabled()) return NextResponse.json({ ok: true, published: null, configured: false });

  const tripId = new URL(request.url).searchParams.get('tripId')?.trim().slice(0, 100);
  if (!tripId) return bad('bad-request', 400);

  const found = await findPublicationFor(caller.userId, tripId);
  return NextResponse.json({
    ok: true,
    configured: true,
    published: found ? { slug: found.slug, url: `/trips/${found.slug}`, indexable: found.indexable } : null,
  });
}
