import { requireRole, denied, badRequest, ok } from '@/lib/server/admin';
import { adminSelect } from '@/lib/server/supabaseAdmin';
import { pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { checkLimit, dayKey } from '@/lib/server/limits';
import type { EventRow } from '@/lib/growthMath';

/**
 * The dashboard's growth metrics - read-only over `app_events`.
 *
 * The route returns the rows **as they are** and the client computes ranges
 * (7/30/all) and trends locally (`lib/growthMath.ts`, unit-tested): the
 * table is aggregate and small - one row per day per kind - so one request
 * covers all ranges and switching a range costs no server round trip.
 *
 * **`stored: false` when the table cannot be read - and that is displayed
 * as "not collected", not zero.** Netanel's rule, letter for letter: a
 * quiet week and a broken counter must not look the same.
 */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const limit = checkLimit('admin-growth', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  /*
    A deliberately generous ceiling: 10 event kinds × 365 days are ~3,650
    rows a year - the ceiling only bites after more than five years, and
    then truncated on the client side will say the numbers are partial
    instead of presenting an incomplete sum as whole.
  */
  const MAX_ROWS = 20_000;
  const rows = await adminSelect<EventRow>(
    'app_events',
    pgQuery(pgSelect(['day', 'kind', 'count']), pgLimit(MAX_ROWS)),
  );

  return ok({
    stored: rows !== null,
    rows: rows ?? [],
    truncated: (rows?.length ?? 0) >= MAX_ROWS,
    today: dayKey(),
  });
}
