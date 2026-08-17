import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect, countAuthUsers } from '@/lib/server/supabaseAdmin';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { aggregate, summarize, type TripRow } from '@/lib/server/tripStats';
import { budgetOverview } from '@/lib/server/budget';

/**
 * The aggregate view - **the main screen, and deliberately with no person
 * in it**.
 *
 * Netanel: *"The main view is aggregate, not personal."* So no field here
 * identifies anyone: no emails, no names, no trip ids. Even "active
 * travelers" is a count of unique ids, not a list of them.
 *
 * **What the dashboard does not see, and states explicitly in the UI:**
 * trips of visitors who never signed up. They live in localStorage and are
 * not synced to the server - the direct consequence of not tracking people
 * who did not sign up.
 */

/** Row ceiling. Shown in the UI when it bites - a silent cutoff reads as "this is everything". */
const MAX_ROWS = 5000;
const WINDOW_DAYS = 30;

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const since = new Date(Date.now() - (WINDOW_DAYS - 1) * 86_400_000).toISOString();
  const sinceDay = since.slice(0, 10);

  const [tripRows, shares, events, users, budget] = await Promise.all([
    adminSelect<TripRow>(
      'user_trips',
      pgQuery(pgSelect(['user_id', 'id', 'updated_at', 'data']), pgOrder('updated_at', 'desc'), pgLimit(MAX_ROWS)),
    ),
    adminSelect<{ created_at: string }>(
      'shared_trips',
      pgQuery(gte('created_at', since), pgSelect(['created_at']), pgLimit(MAX_ROWS)),
    ),
    adminSelect<{ day: string; kind: string; count: number }>(
      'app_events',
      pgQuery(gte('day', sinceDay), pgSelect(['day', 'kind', 'count']), pgLimit(1000)),
    ),
    countAuthUsers(),
    budgetOverview(),
  ]);

  const summaries = (tripRows ?? []).map(summarize).filter((t): t is NonNullable<typeof t> => t !== null);
  const stats = aggregate(summaries, WINDOW_DAYS);

  const sharesPerDay = new Map<string, number>();
  for (const s of shares ?? []) {
    const d = s.created_at.slice(0, 10);
    sharesPerDay.set(d, (sharesPerDay.get(d) ?? 0) + 1);
  }

  /*
    Export kinds only. Since 2026-08-13, app_events also carries the growth
    events (trip_created, return_visit...) - those have their own card
    (/api/admin/growth), and without this filter they would show up here
    inside "exports" as if somebody printed a trip.
  */
  const EXPORT_KINDS = new Set(['print', 'pdf', 'whatsapp', 'share', 'maps']);
  const exportsByKind = new Map<string, number>();
  for (const e of events ?? []) {
    if (!EXPORT_KINDS.has(e.kind)) continue;
    exportsByKind.set(e.kind, (exportsByKind.get(e.kind) ?? 0) + e.count);
  }

  return ok({
    windowDays: WINDOW_DAYS,
    trips: {
      total: stats.trips,
      travelers: stats.travelers,
      withStops: stats.withStops,
      medianDays: stats.medianDays,
      medianStops: stats.medianStops,
      perDay: stats.perDay,
      truncated: (tripRows?.length ?? 0) >= MAX_ROWS,
    },
    places: { cities: stats.topCities, countries: stats.topCountries },
    sharing: {
      shares: shares?.length ?? 0,
      perDay: stats.perDay.map((d) => ({ day: d.day, shares: sharesPerDay.get(d.day) ?? 0 })),
      exports: [...exportsByKind.entries()].map(([kind, count]) => ({ kind, count })),
      /** null = the table does not exist yet (the SQL was never run). Not zero. */
      exportsTracked: events !== null,
    },
    accounts: { total: users?.total ?? 0, capped: users?.capped ?? false },
    ai: budget,
    /** Without this the numbers read as if they are the whole world, and they are not */
    scope: 'טיולים של משתמשים מחוברים בלבד - טיול של מבקר שלא נרשם נשמר במכשיר שלו ולא אצלנו',
  });
}
