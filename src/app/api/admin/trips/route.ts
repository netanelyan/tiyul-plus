import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminSelect, emailByUserId, emailsByUserIds, userByEmail } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { checkLimit } from '@/lib/server/limits';
import { nameMatches, parseAdminQuery } from '@/lib/server/adminSearch';
import { summarize, tripView, type TripRow, type TripSummary } from '@/lib/server/tripStats';

/**
 * The narrow search, and viewing a single trip.
 *
 * ## Three rules that hold this route together
 *
 * 1. **Authorization is checked on the server, on every request.** `requireRole`
 *    reads the role from the database based on the token. A non-admin gets a
 *    404 - the exact same answer a signed-out visitor gets, so nobody learns
 *    the area exists.
 * 2. **The user's string never enters the query.** See `adminSearch.ts`:
 *    an email becomes a uuid from GoTrue, a destination becomes a slug from a
 *    closed list, and a trip name never leaves memory at all.
 * 3. **Read-only.** There is no POST, PATCH or DELETE here. Editing or
 *    deleting someone else's trip does not exist in the code, rather than
 *    merely being "blocked".
 *
 * ## What gets logged
 *
 * **Opening a single trip** - i.e. the moment an admin sees a specific
 * person's content. A search that returns a list is not logged: it returns
 * trip names without content, and a log that fills with noise is a log
 * nobody reads.
 */

const MAX_ROWS = 5000;
const MAX_RESULTS = 40;

/** Rows + their summaries, once per request */
async function loadTrips(filter?: string): Promise<TripSummary[]> {
  const rows = await adminSelect<TripRow>(
    'user_trips',
    pgQuery(
      ...(filter ? [filter] : []),
      pgSelect(['user_id', 'id', 'updated_at', 'data']),
      pgOrder('updated_at', 'desc'),
      pgLimit(MAX_ROWS),
    ),
  );
  return (rows ?? []).map(summarize).filter((t): t is TripSummary => t !== null);
}

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  /*
    A quota for admins too. Not out of distrust, but because a compromised
    admin account is exactly the scenario where someone would want to scan
    all the emails in a loop.
  */
  const limit = checkLimit('admin-search', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  const url = new URL(req.url);
  const tripId = url.searchParams.get('id');
  const userId = url.searchParams.get('user');

  /* ---------- Viewing a single trip ---------- */
  if (tripId && userId) {
    /*
      These two lines are the protection: `eq` encodes the values, and
      `pgUuid` inside `emailByUserId` rejects anything that is not a uuid.
      A trip id that does not exist simply returns no row.
    */
    const rows = await adminSelect<TripRow>(
      'user_trips',
      pgQuery(eq('user_id', userId), eq('id', tripId), pgSelect(['user_id', 'id', 'updated_at', 'data']), pgLimit(1)),
    );
    const row = rows?.[0];
    if (!row) return ok({ trip: null });

    const email = await emailByUserId(row.user_id);
    /*
      **The audit log is written before the content is returned.** Netanel:
      "If I have this power, I want a record of its use."
    */
    await audit(actor, 'view_trip', { userId: row.user_id, email }, { tripId: row.id });

    /*
      A **view** is returned, not the raw row: the names are resolved here
      from the catalog, so the browser does not drag in 2MB just to display
      the Hebrew name "St. Stephen's Cathedral" instead of
      `vie-stephansdom` - the same reasoning as on the shared-trip page.
    */
    return ok({
      id: row.id,
      view: tripView(row.data),
      owner: { userId: row.user_id, email },
      updatedAt: row.updated_at,
    });
  }

  /* ---------- Search ---------- */
  const parsed = parseAdminQuery(url.searchParams.get('q'), url.searchParams.get('mode'));
  if (parsed.kind === 'invalid') return ok({ results: [], note: parsed.why });

  let found: TripSummary[] = [];
  let label = '';

  if (parsed.kind === 'email') {
    // Exact match only, then a query by uuid - not by what was typed
    const user = await userByEmail(parsed.email);
    if (!user) return ok({ results: [], note: 'אין חשבון עם הכתובת הזאת' });
    found = await loadTrips(eq('user_id', user.id));
    label = user.email;
  } else if (parsed.kind === 'place') {
    const slugs = new Set(parsed.slugs);
    found = (await loadTrips()).filter((t) => t.citySlugs.some((s) => slugs.has(s)));
    label = parsed.label;
  } else {
    // Trip name: the filtering happens here, in memory. None of it ever reached the database.
    found = (await loadTrips()).filter((t) => nameMatches(t.name, parsed.needle));
    label = parsed.needle;
  }

  const page = found.slice(0, MAX_RESULTS);
  // The email is fetched only for results actually displayed, not for everyone
  // scanned - and in parallel, not in a serial await loop (the N+1 pattern
  // removed from all the admin routes)
  const emails = await emailsByUserIds(page.map((t) => t.userId));

  return ok({
    label,
    total: found.length,
    truncated: found.length > MAX_RESULTS,
    results: page.map((t) => ({
      userId: t.userId,
      id: t.id,
      name: t.name,
      email: emails.get(t.userId) ?? null,
      days: t.days,
      stops: t.stops,
      cities: t.citySlugs,
      updatedAt: t.updatedAt,
    })),
  });
}
